-- Dashboard Financeiro - schema completo
-- Execute no SQL Editor do Supabase apenas se estiver criando um projeto novo.

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null,
  description text not null check (char_length(description) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  type text not null check (type in ('receita', 'despesa')),
  account text not null default 'Pessoal' check (account = 'Pessoal'),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

alter table public.transactions enable row level security;

revoke all on table public.transactions from anon, authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own transactions" on public.transactions;
create policy "Users can create own transactions"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_month date not null,
  account_scope text not null default 'Pessoal' check (account_scope = 'Pessoal'),
  income_target numeric(14,2) not null default 0 check (income_target >= 0),
  expense_limit numeric(14,2) not null default 0 check (expense_limit >= 0),
  savings_target numeric(14,2) not null default 0 check (savings_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_month, account_scope)
);

create index if not exists monthly_goals_user_month_idx
  on public.monthly_goals (user_id, goal_month desc);

alter table public.monthly_goals enable row level security;

revoke all on table public.monthly_goals from anon, authenticated;
grant select, insert, update, delete on table public.monthly_goals to authenticated;

drop policy if exists "Users can read own goals" on public.monthly_goals;
create policy "Users can read own goals"
  on public.monthly_goals for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own goals" on public.monthly_goals;
create policy "Users can create own goals"
  on public.monthly_goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own goals" on public.monthly_goals;
create policy "Users can update own goals"
  on public.monthly_goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own goals" on public.monthly_goals;
create policy "Users can delete own goals"
  on public.monthly_goals for delete to authenticated
  using ((select auth.uid()) = user_id);

-- V3: lançamentos únicos, recorrentes e parcelados
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  description text not null check (char_length(description) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  account text not null default 'Pessoal' check (account = 'Pessoal'),
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null default 'monthly' check (frequency in ('monthly')),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

alter table public.recurring_rules enable row level security;
grant select, insert, update, delete on table public.recurring_rules to authenticated;

create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  description text not null check (char_length(description) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  account text not null default 'Pessoal' check (account = 'Pessoal'),
  total_amount numeric(14,2) not null check (total_amount > 0),
  installment_count integer not null check (installment_count between 2 and 120),
  first_due_date date not null,
  created_at timestamptz not null default now()
);

alter table public.installment_plans enable row level security;
grant select, insert, update, delete on table public.installment_plans to authenticated;

alter table public.transactions
  add column if not exists source_kind text not null default 'single',
  add column if not exists recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  add column if not exists installment_plan_id uuid references public.installment_plans(id) on delete set null,
  add column if not exists installment_number integer,
  add column if not exists installment_count integer;
