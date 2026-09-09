# Publicar o Dashboard Financeiro no Netlify

Este projeto já está preparado para Netlify com `netlify.toml`.

## Arquitetura

- **Netlify**: hospeda o frontend React/Vite.
- **Supabase Auth**: autenticação Google e sessão do usuário.
- **Supabase PostgreSQL**: armazena os lançamentos financeiros.
- **RLS (Row Level Security)**: cada usuário só acessa os próprios registros.

Os dados não ficam presos ao computador. Entrando com a mesma conta Google em outro dispositivo, o dashboard consulta os mesmos registros no Supabase.

---

## 1. Testar o build localmente

No PowerShell, dentro da pasta do projeto:

```powershell
npm install
npm run build
```

Ao terminar, o Vite cria a pasta:

```text
dist
```

Para testar o build localmente:

```powershell
npm run preview
```

---

## 2. Publicar pelo GitHub + Netlify (recomendado)

### GitHub

Crie um repositório e envie este projeto. Não envie `.env.local`.

Exemplo:

```powershell
git init
git add .
git commit -m "Dashboard financeiro com Supabase e Google Auth"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

### Netlify

1. Entre no Netlify.
2. Selecione **Add new project / Import an existing project**.
3. Conecte o GitHub.
4. Escolha o repositório do dashboard.
5. O `netlify.toml` deste projeto define automaticamente:

```text
Build command: npm run build
Publish directory: dist
Node: 20
```

6. Antes do primeiro deploy, cadastre as variáveis de ambiente no Netlify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Use exatamente os valores do seu projeto Supabase.

7. Faça o deploy.

O Netlify fornecerá uma URL semelhante a:

```text
https://seu-dashboard.netlify.app
```

---

## 3. Configurar o Supabase para a URL do Netlify

Depois que o domínio definitivo do Netlify existir, abra no Supabase:

**Authentication > URL Configuration**

Defina:

```text
Site URL = https://seu-dashboard.netlify.app
```

Em **Redirect URLs**, mantenha para desenvolvimento:

```text
http://localhost:5173/**
```

E adicione a URL de produção:

```text
https://seu-dashboard.netlify.app/**
```

Para produção, prefira a URL exata do seu site.

Se quiser testar Deploy Previews do Netlify, pode adicionar também o padrão de preview correspondente ao nome do seu site, conforme a documentação do Supabase.

---

## 4. Configurar o Google OAuth

No Google Auth Platform / Google Cloud Console, abra o OAuth Client do tipo **Web application**.

### Authorized JavaScript origins

Adicione:

```text
http://localhost:5173
https://seu-dashboard.netlify.app
```

### Authorized redirect URIs

O redirect URI do Google continua sendo o callback do **Supabase**, e não uma URL `/callback` do Netlify:

```text
https://SEU-PROJECT-REF.supabase.co/auth/v1/callback
```

Use o callback exibido em **Supabase > Authentication > Providers > Google** para evitar qualquer diferença no endereço.

Salve as alterações.

---

## 5. Teste final

1. Abra o domínio do Netlify em uma janela anônima.
2. Clique em **Continuar com Google**.
3. Entre com sua conta Google.
4. Cadastre uma receita ou despesa.
5. Saia da conta.
6. Abra o dashboard em outro navegador ou dispositivo.
7. Entre com a mesma conta Google.
8. O lançamento deverá aparecer novamente.

Se isso ocorrer, frontend, autenticação, banco e RLS estão funcionando corretamente.

---

## Segurança

- Nunca coloque a chave `service_role` no Netlify ou no código do frontend.
- O frontend usa somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Variáveis com prefixo `VITE_` são incorporadas ao bundle do frontend; portanto, só devem conter valores próprios para uso público no cliente.
- A proteção dos registros é feita pelo Supabase/PostgreSQL através das políticas RLS do arquivo `supabase-schema.sql`.
- `.env.local` está ignorado pelo Git e não deve ser enviado ao repositório.

---

## Atualizações futuras

Usando GitHub + Netlify, depois basta:

```powershell
git add .
git commit -m "Minha alteração"
git push
```

O Netlify fará um novo build e publicará a atualização automaticamente.
