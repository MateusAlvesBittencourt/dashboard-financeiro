# Dashboard Financeiro — Supabase + Login Google

Dashboard financeiro pessoal criado em React + Vite + Tailwind CSS + Recharts, com autenticação Google via Supabase Auth e banco PostgreSQL no Supabase.

## Recursos

- Login com conta Google
- Sessão persistente
- Dados financeiros armazenados no Supabase/PostgreSQL
- Row Level Security (RLS): cada usuário acessa somente os próprios lançamentos
- Entradas, saídas, saldo e índice de saúde financeira
- Filtros por mês e ano, com o dashboard dedicado ao contexto Pessoal
- Cadastro, edição, duplicação e exclusão de lançamentos
- Gráfico de evolução de receitas e despesas
- Gráfico de gastos por categoria
- Comparativo mensal
- Modo claro/escuro
- Exportação CSV do período filtrado
- Layout responsivo

---

## 1. Criar o projeto no Supabase

1. Acesse o Supabase e crie um projeto.
2. No painel do projeto, abra **SQL Editor**.
3. Copie todo o conteúdo do arquivo `supabase-schema.sql` deste projeto.
4. Execute o SQL.

Isso cria a tabela `transactions`, índice e as políticas RLS.

---

## 2. Ativar login com Google

No Google Auth Platform / Google Cloud:

1. Crie ou selecione um projeto.
2. Configure a tela de consentimento (Audience/Branding conforme solicitado pelo Google).
3. Crie um **OAuth Client ID** do tipo **Web application**.
4. Em **Authorized JavaScript origins**, adicione durante o desenvolvimento:

```text
http://localhost:5173
```

5. Em **Authorized redirect URIs**, adicione o callback exibido pelo Supabase na configuração do provedor Google. Normalmente segue este formato:

```text
https://SEU-PROJECT-REF.supabase.co/auth/v1/callback
```

6. Copie o **Client ID** e o **Client Secret**.

No Supabase:

1. Abra **Authentication > Providers > Google**.
2. Ative o provedor Google.
3. Cole o Client ID e Client Secret gerados no Google.
4. Salve.

Depois, em **Authentication > URL Configuration**:

- Configure **Site URL** como `http://localhost:5173` durante o desenvolvimento.
- Inclua `http://localhost:5173` entre as URLs de redirecionamento permitidas.
- Quando publicar o dashboard, adicione também a URL final do site (Netlify/Vercel/etc.).

---

## 3. Configurar as variáveis do projeto

No Supabase, abra a área **Connect / API** do projeto e copie:

- Project URL
- Publishable key (ou anon key em projetos que ainda exibem a nomenclatura anterior)

Na pasta do dashboard, copie:

```text
.env.example
```

para:

```text
.env.local
```

Edite `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

> Nunca coloque a `service_role` key no frontend. O dashboard deve usar somente a Publishable/anon key; a autorização por usuário é feita pelas políticas RLS.

---

## 4. Executar no Windows

Instale o Node.js LTS. Depois abra o PowerShell dentro da pasta do projeto e execute:

```powershell
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente:

```text
http://localhost:5173
```

Clique em **Continuar com Google**.

---

## 5. Build para publicação

```powershell
npm run build
```

A pasta `dist` gerada pode ser publicada no Netlify, Vercel ou outro host estático.

No serviço de hospedagem, cadastre estas variáveis de ambiente:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

E lembre de adicionar a URL pública do dashboard nas configurações de URL do Supabase e nas origens autorizadas do Google.

---

## Segurança

A tabela possui RLS habilitado. As políticas usam `auth.uid()` para permitir SELECT, INSERT, UPDATE e DELETE somente quando o `user_id` da linha pertence ao usuário autenticado.

Mesmo que alguém abra as ferramentas de desenvolvedor do navegador e tente consultar outro usuário diretamente, o PostgreSQL/Supabase deve negar a operação pelas políticas RLS.

---

## Arquivos principais

- `src/App.jsx` — interface, login e CRUD das transações
- `src/supabase.js` — cliente Supabase
- `supabase-schema.sql` — tabela, índice e políticas de segurança
- `.env.example` — modelo das variáveis de ambiente

---

## Publicar no Netlify

O projeto inclui `netlify.toml` com o build do Vite e um guia específico em `DEPLOY-NETLIFY.md`.

Configuração esperada no Netlify:

```text
Build command: npm run build
Publish directory: dist
Node: 20
```

Cadastre no Netlify as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, faça o deploy e depois configure a URL final em **Supabase > Authentication > URL Configuration** e nas origens autorizadas do Google OAuth.

## Recursos adicionados nesta versão

- **Editar lançamentos:** use o botão `Editar` em qualquer lançamento do mês; o formulário entra em modo de edição e salva a alteração diretamente no Supabase.
- **Duplicar lançamentos:** o botão `Duplicar` cria uma cópia no mês seguinte, preservando descrição, categoria, tipo e valor. Datas como dia 31 são ajustadas para o último dia disponível no mês seguinte.
- **Metas mensais:** defina meta de entradas, limite de despesas e meta de economia por mês no contexto `Pessoal`.
- **Relatórios por período:** escolha data inicial e data final para ver totais, saldo, despesas por categoria e a lista de lançamentos; o relatório pode ser exportado em CSV.

A tabela `monthly_goals` usa RLS e segue a mesma separação por usuário aplicada em `transactions`.


## V3 — tipos de lançamento

O formulário suporta três formas de lançamento:

- **Único**: cria um lançamento isolado.
- **Recorrente**: cria uma regra mensal e gera os lançamentos mensais. Sem data final, a interface gera os próximos 24 meses e mantém a regra salva no banco.
- **Parcelado**: recebe o valor total e o número de parcelas; o sistema distribui as parcelas por mês e ajusta a última parcela para eventuais diferenças de centavos.

Os lançamentos passam a exibir sua origem (`Único`, `Recorrente` ou `Parcelado N/N`) na lista do período.


## V4 — somente Pessoal

O dashboard foi simplificado para uso financeiro pessoal. As opções `Trabalho` e `Ambos` foram removidas da interface. Novos lançamentos, recorrências, parcelamentos, metas e relatórios usam exclusivamente o contexto `Pessoal`.
