import React, { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase, supabaseConfigured } from './supabase'

const THEME_KEY = 'dashboard-financeiro-theme-v3'

const categoryOptions = {
  receita: ['Salário', 'Freelance', 'Renda extra', 'Reembolso', 'Outros'],
  despesa: ['Moradia', 'Alimentação', 'Transporte', 'Faculdade', 'Saúde', 'Lazer', 'Assinaturas', 'Cartão', 'Outros'],
}

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const pieColors = ['#6366f1','#06b6d4','#22c55e','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6','#64748b']
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compactMoney = new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })

function toInputDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function monthStart(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function addMonthsToInputDate(dateString, amount = 1) {
  const [year, month, day] = dateString.split('-').map(Number)
  const firstTargetDay = new Date(year, (month - 1) + amount, 1)
  const targetYear = firstTargetDay.getFullYear()
  const targetMonth = firstTargetDay.getMonth()
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const targetDay = Math.min(day, lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function parseAmount(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function MetricCard({ title, value, subtitle, tone = 'neutral' }) {
  const tones = {
    income: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    expense: 'from-rose-500/15 to-rose-500/5 text-rose-700 dark:text-rose-300',
    balance: 'from-indigo-500/15 to-indigo-500/5 text-indigo-700 dark:text-indigo-300',
    neutral: 'from-slate-500/10 to-slate-500/5 text-slate-700 dark:text-slate-300',
  }
  return (
    <div className={`card bg-gradient-to-br ${tones[tone]} p-5`}>
      <div className="text-xs font-bold uppercase tracking-[0.15em] opacity-70">{title}</div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="mt-2 text-xs font-medium opacity-70">{subtitle}</div>
    </div>
  )
}

function ProgressLine({ label, current, target, inverse = false }) {
  const hasTarget = Number(target) > 0
  const raw = hasTarget ? (Number(current) / Number(target)) * 100 : 0
  const percent = Math.max(0, Math.min(100, raw))
  const exceeded = hasTarget && inverse && Number(current) > Number(target)
  const reached = hasTarget && !inverse && Number(current) >= Number(target)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`font-bold ${exceeded ? 'text-rose-600' : reached ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>
          {hasTarget ? `${money.format(current)} / ${money.format(target)}` : 'Meta não definida'}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${exceeded ? 'bg-rose-500' : reached ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="card w-full max-w-2xl p-7 md:p-10">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Configuração necessária</div>
        <h1 className="mt-2 text-3xl font-extrabold">Conecte o Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          O projeto já está preparado para banco de dados e login com Google. Copie <strong>.env.example</strong> para <strong>.env.local</strong> e informe a URL e a Publishable Key do seu projeto Supabase.
        </p>
        <div className="mt-5 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100 dark:bg-black">
          VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co<br />
          VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
        </div>
      </div>
    </div>
  )
}

function LoginScreen({ busy, error, onLogin }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none md:grid-cols-[1.1fr_.9fr]">
        <div className="hidden min-h-[560px] bg-slate-950 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-300">Dashboard Financeiro</div>
            <h1 className="mt-5 max-w-md text-4xl font-extrabold leading-tight">Suas finanças salvas com segurança na nuvem.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Entre com sua conta Google para acessar seus lançamentos em qualquer computador ou celular.</p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">✓ Dados separados por usuário</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">✓ Banco PostgreSQL no Supabase</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">✓ Sessão persistente e login Google</div>
          </div>
        </div>
        <div className="flex min-h-[520px] items-center p-7 md:p-10">
          <div className="w-full">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Acesso</div>
            <h2 className="mt-2 text-3xl font-extrabold">Entrar no dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Use sua conta Google. O dashboard não recebe nem armazena sua senha do Google.</p>
            {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">{error}</div>}
            <button onClick={onLogin} disabled={busy} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-extrabold text-slate-900">G</span>
              {busy ? 'Abrindo Google...' : 'Continuar com Google'}
            </button>
            <p className="mt-5 text-center text-xs text-slate-400">A autenticação é feita pelo Google e gerenciada pelo Supabase Auth.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const now = new Date()
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [formMode, setFormMode] = useState('single')
  const [form, setForm] = useState({ date: toInputDate(now), description: '', category: 'Salário', type: 'receita', account: 'Pessoal', amount: '', recurringEnd: '', installmentCount: '2' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalForm, setGoalForm] = useState({ incomeTarget: '', expenseLimit: '', savingsTarget: '' })
  const [reportStart, setReportStart] = useState(monthStart(now.getFullYear(), now.getMonth()))
  const [reportEnd, setReportEnd] = useState(toInputDate(now))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setTransactions([])
      setGoals([])
      return
    }
    fetchTransactions()
    fetchGoals()
  }, [session?.user?.id])

  async function fetchTransactions() {
    if (!session?.user) return
    setDataLoading(true)
    setDataError('')
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_date, description, category, type, account, amount, source_kind, recurring_rule_id, installment_plan_id, installment_number, installment_count, created_at')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setDataError(error.message)
    } else {
      setTransactions((data || []).map(row => ({
        id: row.id,
        date: row.transaction_date,
        description: row.description,
        category: row.category,
        type: row.type,
        account: row.account,
        amount: Number(row.amount),
        sourceKind: row.source_kind || 'single',
        recurringRuleId: row.recurring_rule_id,
        installmentPlanId: row.installment_plan_id,
        installmentNumber: row.installment_number,
        installmentCount: row.installment_count,
      })))
    }
    setDataLoading(false)
  }

  async function fetchGoals() {
    if (!session?.user) return
    const { data, error } = await supabase
      .from('monthly_goals')
      .select('id, goal_month, account_scope, income_target, expense_limit, savings_target, updated_at')
      .order('goal_month', { ascending: false })

    if (error) {
      if (!error.message.includes('monthly_goals')) setDataError(error.message)
      return
    }
    setGoals((data || []).map(row => ({
      id: row.id,
      goalMonth: row.goal_month,
      scope: row.account_scope,
      incomeTarget: Number(row.income_target || 0),
      expenseLimit: Number(row.expense_limit || 0),
      savingsTarget: Number(row.savings_target || 0),
    })))
  }

  async function loginWithGoogle() {
    setAuthBusy(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setAuthError(error.message)
      setAuthBusy(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const years = useMemo(() => {
    const ys = [...new Set(transactions.map(t => Number(t.date.slice(0, 4))))]
    if (!ys.includes(now.getFullYear())) ys.push(now.getFullYear())
    if (!ys.includes(year)) ys.push(year)
    return ys.sort((a, b) => b - a)
  }, [transactions, year])

  const filtered = useMemo(() => transactions.filter(t => {
    const d = new Date(`${t.date}T12:00:00`)
    return d.getMonth() === month && d.getFullYear() === year && t.account === 'Pessoal'
  }), [transactions, month, year])

  const periodTransactions = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered])

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
    const expense = filtered.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
    const balance = income - expense
    const savingsRate = income > 0 ? (balance / income) * 100 : 0
    const health = income > 0 ? Math.max(0, Math.min(100, Math.round(50 + savingsRate))) : 0
    return { income, expense, balance, health, savingsRate }
  }, [filtered])

  const byCategory = useMemo(() => {
    const grouped = filtered.filter(t => t.type === 'despesa').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const trend = useMemo(() => {
    const rows = []
    for (let offset = 5; offset >= 0; offset--) {
      const base = new Date(year, month - offset, 1)
      const m = base.getMonth()
      const y = base.getFullYear()
      const scoped = transactions.filter(t => {
        const d = new Date(`${t.date}T12:00:00`)
        return d.getMonth() === m && d.getFullYear() === y && t.account === 'Pessoal'
      })
      const receitas = scoped.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
      const despesas = scoped.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
      rows.push({ mes: monthNames[m].slice(0, 3), receitas, despesas, saldo: receitas - despesas })
    }
    return rows
  }, [transactions, month, year])

  const goalKey = monthStart(year, month)
  const currentGoal = useMemo(
    () => goals.find(g => g.goalMonth === goalKey && g.scope === 'Pessoal'),
    [goals, goalKey]
  )

  useEffect(() => {
    if (currentGoal) {
      setGoalForm({
        incomeTarget: currentGoal.incomeTarget ? String(currentGoal.incomeTarget) : '',
        expenseLimit: currentGoal.expenseLimit ? String(currentGoal.expenseLimit) : '',
        savingsTarget: currentGoal.savingsTarget ? String(currentGoal.savingsTarget) : '',
      })
    } else {
      setGoalForm({ incomeTarget: '', expenseLimit: '', savingsTarget: '' })
    }
  }, [currentGoal?.id, goalKey])

  const reportInvalid = Boolean(reportStart && reportEnd && reportStart > reportEnd)
  const reportTransactions = useMemo(() => {
    if (!reportStart || !reportEnd || reportInvalid) return []
    return transactions
      .filter(t => t.date >= reportStart && t.date <= reportEnd && t.account === 'Pessoal')
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, reportStart, reportEnd, reportInvalid])

  const reportTotals = useMemo(() => {
    const income = reportTransactions.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
    const expense = reportTransactions.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [reportTransactions])

  const reportByCategory = useMemo(() => {
    const grouped = reportTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [reportTransactions])

  async function submitTransaction(e) {
    e.preventDefault()
    const amount = parseAmount(form.amount)
    if (!form.description.trim() || amount <= 0 || !session?.user) return

    setSaving(true)
    setDataError('')
    const basePayload = {
      transaction_date: form.date,
      description: form.description.trim(),
      category: form.category,
      type: form.type,
      account: 'Pessoal',
      amount,
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('transactions')
        .update(basePayload)
        .eq('id', editingId)
        .select('id, transaction_date, description, category, type, account, amount, source_kind, recurring_rule_id, installment_plan_id, installment_number, installment_count')
        .single()

      if (error) {
        setDataError(error.message)
      } else {
        setTransactions(prev => prev.map(t => t.id === editingId ? normalizeTransaction(data) : t))
        cancelEditing()
      }
      setSaving(false)
      return
    }

    if (formMode === 'single') {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...basePayload, user_id: session.user.id, source_kind: 'single' })
        .select('id, transaction_date, description, category, type, account, amount, source_kind, recurring_rule_id, installment_plan_id, installment_number, installment_count')
        .single()
      if (error) setDataError(error.message)
      else setTransactions(prev => [normalizeTransaction(data), ...prev])
    }

    if (formMode === 'recurring') {
      const { data: rule, error: ruleError } = await supabase
        .from('recurring_rules')
        .insert({
          user_id: session.user.id,
          type: form.type,
          description: form.description.trim(),
          category: form.category,
          account: 'Pessoal',
          amount,
          frequency: 'monthly',
          start_date: form.date,
          end_date: form.recurringEnd || null,
        })
        .select('id')
        .single()

      if (ruleError) {
        setDataError(ruleError.message)
      } else {
        const dates = []
        let current = form.date
        const hardLimit = form.recurringEnd ? 120 : 24
        for (let i = 0; i < hardLimit; i++) {
          if (form.recurringEnd && current > form.recurringEnd) break
          dates.push(current)
          current = addMonthsToInputDate(current, 1)
        }
        const rows = dates.map(date => ({
          user_id: session.user.id,
          transaction_date: date,
          description: form.description.trim(),
          category: form.category,
          type: form.type,
          account: 'Pessoal',
          amount,
          source_kind: 'recurring',
          recurring_rule_id: rule.id,
        }))
        const { data, error } = await supabase
          .from('transactions')
          .insert(rows)
          .select('id, transaction_date, description, category, type, account, amount, source_kind, recurring_rule_id, installment_plan_id, installment_number, installment_count')
        if (error) setDataError(error.message)
        else setTransactions(prev => [...(data || []).map(normalizeTransaction), ...prev])
      }
    }

    if (formMode === 'installment') {
      const count = Math.max(2, Math.min(120, Number.parseInt(form.installmentCount || '2', 10) || 2))
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert({
          user_id: session.user.id,
          type: form.type,
          description: form.description.trim(),
          category: form.category,
          account: 'Pessoal',
          total_amount: amount,
          installment_count: count,
          first_due_date: form.date,
        })
        .select('id')
        .single()

      if (planError) {
        setDataError(planError.message)
      } else {
        const base = Math.floor((amount / count) * 100) / 100
        const rows = Array.from({ length: count }, (_, i) => ({
          user_id: session.user.id,
          transaction_date: addMonthsToInputDate(form.date, i),
          description: `${form.description.trim()} ${i + 1}/${count}`,
          category: form.category,
          type: form.type,
          account: 'Pessoal',
          amount: i === count - 1 ? Math.round((amount - base * (count - 1)) * 100) / 100 : base,
          source_kind: 'installment',
          installment_plan_id: plan.id,
          installment_number: i + 1,
          installment_count: count,
        }))
        const { data, error } = await supabase
          .from('transactions')
          .insert(rows)
          .select('id, transaction_date, description, category, type, account, amount, source_kind, recurring_rule_id, installment_plan_id, installment_number, installment_count')
        if (error) setDataError(error.message)
        else setTransactions(prev => [...(data || []).map(normalizeTransaction), ...prev])
      }
    }

    if (!dataError) setForm(prev => ({ ...prev, description: '', amount: '', recurringEnd: '', installmentCount: '2' }))
    setSaving(false)
  }

  function normalizeTransaction(data) {
    return {
      id: data.id,
      date: data.transaction_date,
      description: data.description,
      category: data.category,
      type: data.type,
      account: data.account,
      amount: Number(data.amount),
      sourceKind: data.source_kind || 'single',
      recurringRuleId: data.recurring_rule_id,
      installmentPlanId: data.installment_plan_id,
      installmentNumber: data.installment_number,
      installmentCount: data.installment_count,
    }
  }

  function startEditing(t) {
    setEditingId(t.id)
    setFormMode(t.sourceKind || 'single')
    setForm({
      date: t.date,
      description: t.description,
      category: t.category,
      type: t.type,
      account: 'Pessoal',
      amount: String(t.amount),
      recurringEnd: '',
      installmentCount: String(t.installmentCount || 2),
    })
    window.requestAnimationFrame(() => document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  function cancelEditing() {
    setEditingId(null)
    setFormMode('single')
    setForm({ date: toInputDate(new Date()), description: '', category: 'Salário', type: 'receita', account: 'Pessoal', amount: '', recurringEnd: '', installmentCount: '2' })
  }

  async function duplicateTransaction(t) {
    if (!session?.user) return
    const nextDate = addMonthsToInputDate(t.date, 1)
    const prettyDate = new Date(`${nextDate}T12:00:00`).toLocaleDateString('pt-BR')
    if (!window.confirm(`Duplicar "${t.description}" para ${prettyDate}?`)) return

    setDuplicatingId(t.id)
    setDataError('')
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        transaction_date: nextDate,
        description: t.description,
        category: t.category,
        type: t.type,
        account: 'Pessoal',
        amount: t.amount,
      })
      .select('id, transaction_date, description, category, type, account, amount')
      .single()

    if (error) {
      setDataError(error.message)
    } else {
      setTransactions(prev => [{
        id: data.id,
        date: data.transaction_date,
        description: data.description,
        category: data.category,
        type: data.type,
        account: data.account,
        amount: Number(data.amount),
      }, ...prev])
    }
    setDuplicatingId(null)
  }

  async function removeTransaction(id) {
    if (!window.confirm('Excluir este lançamento?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) setDataError(error.message)
    else {
      setTransactions(prev => prev.filter(t => t.id !== id))
      if (editingId === id) cancelEditing()
    }
  }

  async function saveGoals(e) {
    e.preventDefault()
    if (!session?.user) return
    const payload = {
      user_id: session.user.id,
      goal_month: goalKey,
      account_scope: 'Pessoal',
      income_target: Math.max(0, parseAmount(goalForm.incomeTarget)),
      expense_limit: Math.max(0, parseAmount(goalForm.expenseLimit)),
      savings_target: Math.max(0, parseAmount(goalForm.savingsTarget)),
      updated_at: new Date().toISOString(),
    }
    setGoalSaving(true)
    setDataError('')
    const { data, error } = await supabase
      .from('monthly_goals')
      .upsert(payload, { onConflict: 'user_id,goal_month,account_scope' })
      .select('id, goal_month, account_scope, income_target, expense_limit, savings_target')
      .single()

    if (error) {
      setDataError(error.message)
    } else {
      const normalized = {
        id: data.id,
        goalMonth: data.goal_month,
        scope: data.account_scope,
        incomeTarget: Number(data.income_target || 0),
        expenseLimit: Number(data.expense_limit || 0),
        savingsTarget: Number(data.savings_target || 0),
      }
      setGoals(prev => [normalized, ...prev.filter(g => !(g.goalMonth === normalized.goalMonth && g.scope === normalized.scope))])
    }
    setGoalSaving(false)
  }

  function exportCsv() {
    const rows = [['Data','Descrição','Categoria','Tipo','Valor'], ...filtered.map(t => [t.date, t.description, t.category, t.type, Number(t.amount).toFixed(2)])]
    downloadCsv(rows, `dashboard-financeiro-${year}-${String(month + 1).padStart(2, '0')}.csv`)
  }

  function exportReportCsv() {
    const rows = [['Data','Descrição','Categoria','Tipo','Valor'], ...reportTransactions.map(t => [t.date, t.description, t.category, t.type, Number(t.amount).toFixed(2)])]
    downloadCsv(rows, `relatorio-financeiro-${reportStart}-a-${reportEnd}.csv`)
  }

  function downloadCsv(rows, filename) {
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!supabaseConfigured) return <SetupScreen />
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] text-sm text-slate-500 dark:bg-slate-950">Carregando sessão...</div>
  if (!session) return <LoginScreen busy={authBusy} error={authError} onLogin={loginWithGoogle} />

  const healthLabel = totals.health >= 80 ? 'Excelente' : totals.health >= 65 ? 'Boa' : totals.health >= 45 ? 'Atenção' : totals.health > 0 ? 'Crítica' : 'Sem dados'
  const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email
  const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-7 md:py-7">
        <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Controle financeiro</div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Dashboard Financeiro</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Receitas, despesas, metas e relatórios sincronizados na nuvem.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀ Claro' : '◐ Escuro'}</button>
            <button className="btn-secondary" onClick={exportCsv}>Exportar mês</button>
            <div className="ml-0 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 md:ml-2">
              {avatar ? <img src={avatar} alt="Avatar" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{String(userName).slice(0,1).toUpperCase()}</div>}
              <div className="hidden max-w-40 sm:block"><div className="truncate text-xs font-bold">{userName}</div><div className="truncate text-[10px] text-slate-400">{session.user.email}</div></div>
              <button onClick={signOut} className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">Sair</button>
            </div>
          </div>
        </header>

        {dataError && <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><span>{dataError}</span><button className="font-bold underline" onClick={() => { fetchTransactions(); fetchGoals() }}>Tentar novamente</button></div>}

        <section className="card mb-5 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Pessoal</div>
          </div>
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input min-w-36">
              {monthNames.map((name, idx) => <option key={name} value={idx}>{name}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input min-w-28">
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Entradas" value={money.format(totals.income)} subtitle={`${filtered.filter(t => t.type === 'receita').length} lançamentos`} tone="income" />
          <MetricCard title="Saídas" value={money.format(totals.expense)} subtitle={`${filtered.filter(t => t.type === 'despesa').length} lançamentos`} tone="expense" />
          <MetricCard title="Saldo" value={money.format(totals.balance)} subtitle={`${totals.savingsRate.toFixed(1)}% da renda preservada`} tone="balance" />
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div><div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Saúde financeira</div><div className="mt-3 text-3xl font-extrabold">{totals.health}%</div></div>
              <div className="rounded-2xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{healthLabel}</div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${totals.health}%` }} /></div>
            <p className="mt-3 text-xs text-slate-500">Índice simplificado baseado na proporção entre saldo e entradas.</p>
          </div>
        </section>

        <section className="card mt-5 p-5 md:p-6">
          <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr] xl:items-start">
            <div>
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Metas mensais</div>
                <h2 className="mt-1 text-lg font-bold">{monthNames[month]} de {year} · Pessoal</h2>
                <p className="mt-1 text-xs text-slate-500">As metas acompanham o mês selecionado.</p>
              </div>
              <form onSubmit={saveGoals} className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <label className="text-xs font-semibold text-slate-500">Meta de entradas<input className="input mt-1.5" inputMode="decimal" placeholder="0,00" value={goalForm.incomeTarget} onChange={e => setGoalForm({ ...goalForm, incomeTarget: e.target.value })} /></label>
                <label className="text-xs font-semibold text-slate-500">Limite de despesas<input className="input mt-1.5" inputMode="decimal" placeholder="0,00" value={goalForm.expenseLimit} onChange={e => setGoalForm({ ...goalForm, expenseLimit: e.target.value })} /></label>
                <label className="text-xs font-semibold text-slate-500">Meta de economia<input className="input mt-1.5" inputMode="decimal" placeholder="0,00" value={goalForm.savingsTarget} onChange={e => setGoalForm({ ...goalForm, savingsTarget: e.target.value })} /></label>
                <button type="submit" disabled={goalSaving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3 xl:col-span-1">{goalSaving ? 'Salvando metas...' : 'Salvar metas do mês'}</button>
              </form>
            </div>
            <div className="grid gap-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <ProgressLine label="Entradas" current={totals.income} target={currentGoal?.incomeTarget || 0} />
              <ProgressLine label="Despesas" current={totals.expense} target={currentGoal?.expenseLimit || 0} inverse />
              <ProgressLine label="Economia" current={Math.max(0, totals.balance)} target={currentGoal?.savingsTarget || 0} />
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900"><div className="text-slate-400">Entrada</div><strong className="mt-1 block">{currentGoal?.incomeTarget ? money.format(currentGoal.incomeTarget) : '—'}</strong></div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900"><div className="text-slate-400">Limite</div><strong className="mt-1 block">{currentGoal?.expenseLimit ? money.format(currentGoal.expenseLimit) : '—'}</strong></div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900"><div className="text-slate-400">Economia</div><strong className="mt-1 block">{currentGoal?.savingsTarget ? money.format(currentGoal.savingsTarget) : '—'}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
          <div className="card p-5 md:p-6">
            <div className="mb-5"><h2 className="text-lg font-bold">Evolução dos últimos 6 meses</h2><p className="mt-1 text-xs text-slate-500">Receitas, despesas e saldo mensal.</p></div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 2, right: 8, top: 8, bottom: 0 }}>
                  <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.28}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="mes" tickLine={false} axisLine={false}/><YAxis tickFormatter={v => compactMoney.format(v)} tickLine={false} axisLine={false}/><Tooltip formatter={(v) => money.format(v)} contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0' }}/><Legend />
                  <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#22c55e" fill="url(#incomeFill)" strokeWidth={3}/><Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f43f5e" fill="url(#expenseFill)" strokeWidth={3}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <div className="mb-4"><h2 className="text-lg font-bold">Gastos por categoria</h2><p className="mt-1 text-xs text-slate-500">Onde seu dinheiro está sendo usado.</p></div>
            <div className="h-[220px]">
              {byCategory.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{byCategory.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}</Pie><Tooltip formatter={v => money.format(v)} /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Sem despesas neste período.</div>}
            </div>
            <div className="mt-3 space-y-2">{byCategory.slice(0, 5).map((item, i) => <div key={item.name} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }}></span><span className="text-slate-600 dark:text-slate-300">{item.name}</span></div><strong>{money.format(item.value)}</strong></div>)}</div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
          <form id="transaction-form" onSubmit={submitTransaction} className={`card p-5 md:p-6 ${editingId ? 'ring-2 ring-indigo-500/40' : ''}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">{editingId ? 'Edição' : 'Lançamento'}</div><h2 className="mt-1 text-lg font-bold">{editingId ? 'Editar lançamento' : 'Novo lançamento'}</h2><p className="mt-1 text-xs text-slate-500">{editingId ? 'Altere os campos e salve. O registro será atualizado no Supabase.' : 'O lançamento será salvo na sua conta Supabase.'}</p></div>
              {editingId && <button type="button" onClick={cancelEditing} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>}
            </div>
            {!editingId && <div className="mb-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">Forma do lançamento</div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950">
                {[['single','Único'],['recurring','Recorrente'],['installment','Parcelado']].map(([value,label]) => <button key={value} type="button" onClick={() => setFormMode(value)} className={`rounded-xl px-2 py-2.5 text-xs font-bold transition ${formMode === value ? 'bg-white text-slate-950 shadow dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>{label}</button>)}
              </div>
            </div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">Tipo<select className="input mt-1.5" value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: categoryOptions[e.target.value][0] })}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
              <label className="text-xs font-semibold text-slate-500">{formMode === 'installment' ? 'Primeira parcela' : formMode === 'recurring' ? 'Primeiro vencimento' : 'Data'}<input type="date" className="input mt-1.5" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label>
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Descrição<input className="input mt-1.5" placeholder="Ex.: Mercado" maxLength={160} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Categoria<select className="input mt-1.5" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categoryOptions[form.type].map(c => <option key={c}>{c}</option>)}</select></label>
              <label className={`text-xs font-semibold text-slate-500 ${formMode === 'single' ? 'sm:col-span-2' : ''}`}>{formMode === 'installment' ? 'Valor total' : 'Valor'}<input inputMode="decimal" className="input mt-1.5" placeholder="0,00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
              {formMode === 'recurring' && <label className="text-xs font-semibold text-slate-500">Data final <span className="font-normal text-slate-400">(opcional)</span><input type="date" min={form.date} className="input mt-1.5" value={form.recurringEnd} onChange={e => setForm({ ...form, recurringEnd: e.target.value })}/></label>}
              {formMode === 'installment' && <label className="text-xs font-semibold text-slate-500">Número de parcelas<input type="number" min="2" max="120" className="input mt-1.5" value={form.installmentCount} onChange={e => setForm({ ...form, installmentCount: e.target.value })}/></label>}
            </div>
            {formMode === 'recurring' && !editingId && <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">Mensal. Se não houver data final, o dashboard cria os próximos 24 meses de lançamentos e mantém a regra recorrente salva.</div>}
            {formMode === 'installment' && !editingId && parseAmount(form.amount) > 0 && <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">Prévia: {Math.max(2, Number(form.installmentCount) || 2)}x de aproximadamente <strong>{money.format(parseAmount(form.amount) / Math.max(2, Number(form.installmentCount) || 2))}</strong>. A última parcela absorve eventual diferença de centavos.</div>}
            <button className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : formMode === 'recurring' ? 'Criar recorrência' : formMode === 'installment' ? 'Criar parcelamento' : 'Adicionar lançamento'}</button>
          </form>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 md:p-6"><div><h2 className="text-lg font-bold">Lançamentos do período</h2><p className="mt-1 text-xs text-slate-500">Edite, duplique para o mês seguinte ou exclua um lançamento.</p></div>{dataLoading && <span className="text-xs text-slate-400">Sincronizando...</span>}</div>
            <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {periodTransactions.length ? periodTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-4 md:px-6">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${t.type === 'receita' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-rose-50 text-rose-600 dark:bg-rose-950'}`}>{t.type === 'receita' ? '↗' : '↘'}</div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{t.description}</div><div className="mt-0.5 text-xs text-slate-500">{new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR')} · {t.category} · <span className="font-semibold">{t.sourceKind === 'recurring' ? 'Recorrente' : t.sourceKind === 'installment' ? `Parcelado ${t.installmentNumber}/${t.installmentCount}` : 'Único'}</span></div></div>
                  <div className={`hidden text-right text-sm font-bold sm:block ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'receita' ? '+' : '-'} {money.format(t.amount)}</div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => startEditing(t)} className="rounded-xl px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950" title="Editar">Editar</button>
                    <button onClick={() => duplicateTransaction(t)} disabled={duplicatingId === t.id} className="rounded-xl px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-emerald-950" title="Duplicar para o próximo mês">{duplicatingId === t.id ? '...' : 'Duplicar'}</button>
                    <button onClick={() => removeTransaction(t.id)} className="rounded-xl px-2 py-1.5 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Excluir">Excluir</button>
                  </div>
                </div>
              )) : <div className="p-8 text-center text-sm text-slate-400">{dataLoading ? 'Carregando lançamentos...' : 'Nenhuma transação neste período.'}</div>}
            </div>
          </div>
        </section>

        <section className="card mt-5 p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Relatórios</div><h2 className="mt-1 text-lg font-bold">Relatório por período</h2><p className="mt-1 text-xs text-slate-500">Escolha qualquer intervalo de datas e exporte somente os lançamentos desse período.</p></div>
            <button onClick={exportReportCsv} disabled={reportInvalid || !reportTransactions.length} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">Exportar relatório CSV</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-500">Data inicial<input type="date" className="input mt-1.5" value={reportStart} onChange={e => setReportStart(e.target.value)} /></label>
            <label className="text-xs font-semibold text-slate-500">Data final<input type="date" className="input mt-1.5" value={reportEnd} onChange={e => setReportEnd(e.target.value)} /></label>
          </div>
          {reportInvalid ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">A data inicial precisa ser anterior ou igual à data final.</div> : (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard title="Entradas no período" value={money.format(reportTotals.income)} subtitle={`${reportTransactions.filter(t => t.type === 'receita').length} receitas`} tone="income" />
                <MetricCard title="Saídas no período" value={money.format(reportTotals.expense)} subtitle={`${reportTransactions.filter(t => t.type === 'despesa').length} despesas`} tone="expense" />
                <MetricCard title="Saldo do período" value={money.format(reportTotals.balance)} subtitle={`${reportTransactions.length} lançamentos`} tone="balance" />
                <MetricCard title="Maior categoria" value={reportByCategory[0]?.name || 'Sem dados'} subtitle={reportByCategory[0] ? money.format(reportByCategory[0].value) : 'Nenhuma despesa'} />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
                <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <h3 className="text-sm font-bold">Despesas por categoria</h3>
                  <div className="mt-4 space-y-3">
                    {reportByCategory.length ? reportByCategory.map((item, i) => (
                      <div key={item.name}>
                        <div className="flex items-center justify-between gap-3 text-xs"><span>{item.name}</span><strong>{money.format(item.value)}</strong></div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ background: pieColors[i % pieColors.length], width: `${reportTotals.expense > 0 ? Math.min(100, (item.value / reportTotals.expense) * 100) : 0}%` }} /></div>
                      </div>
                    )) : <div className="text-sm text-slate-400">Sem despesas no período.</div>}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-[90px_1fr_120px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/50"><span>Data</span><span>Lançamento</span><span className="text-right">Valor</span></div>
                  <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                    {reportTransactions.length ? reportTransactions.map(t => (
                      <div key={`report-${t.id}`} className="grid grid-cols-[90px_1fr_120px] gap-3 px-4 py-3 text-xs">
                        <span className="text-slate-500">{new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                        <div className="min-w-0"><div className="truncate font-semibold">{t.description}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{t.category}</div></div>
                        <strong className={`text-right ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'receita' ? '+' : '-'} {money.format(t.amount)}</strong>
                      </div>
                    )) : <div className="p-8 text-center text-sm text-slate-400">Nenhum lançamento nesse intervalo.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card mt-5 p-5 md:p-6">
          <div className="mb-5"><h2 className="text-lg font-bold">Entradas x saídas</h2><p className="mt-1 text-xs text-slate-500">Comparativo mensal para visualizar o comprometimento da renda.</p></div>
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="mes" tickLine={false} axisLine={false}/><YAxis tickFormatter={v => compactMoney.format(v)} tickLine={false} axisLine={false}/><Tooltip formatter={v => money.format(v)} /><Legend/><Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[8,8,0,0]} /><Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div>
        </section>

        <footer className="py-7 text-center text-xs text-slate-400">Dados sincronizados com Supabase e protegidos por autenticação + Row Level Security.</footer>
      </div>
    </div>
  )
}

export default App
