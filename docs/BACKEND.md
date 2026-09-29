# Backend — Supabase

O site funciona em dois modos, escolhidos pelo `config.js`:

| | Modo demonstração | Modo nuvem |
|---|---|---|
| Quando | `config.js` vazio | `config.js` com URL e chave do Supabase |
| Contas | no navegador | Supabase Auth (e-mail e senha, confirmação, recuperação de senha) |
| Progresso e gastos | no navegador | no banco, acompanham a conta em qualquer aparelho |
| Admin | edita só o navegador dele | publica para todos, vê todos os alunos, envia vídeos e PDFs |
| Certificado | código calculado no navegador | emitido e registrado pelo servidor; QR verifica no banco |

## O que existe no servidor

```
supabase/
  migrations/20260929000000_init.sql   tabelas, regras de acesso (RLS), funções e bucket de mídia
  functions/issue-certificate/         emite o certificado depois de conferir o progresso
  functions/delete-account/            exclui a conta e todos os dados (LGPD)
  tests/rls.test.mjs                   39 testes das regras de acesso
  functions/_tests/                    25 testes das funções
```

**Tabelas:** `profiles` (nome e papel), `user_state` (progresso, XP, gastos), `content` (cursos editados pelo admin), `certificates`.

**Regras de acesso (RLS), em resumo:**
- Cada aluno lê e grava só os próprios dados. O admin lê todos, mas não altera o progresso de ninguém.
- Ninguém muda o próprio papel. Só um admin promove outra conta, pela função `set_user_role`, e ninguém consegue rebaixar a si mesmo.
- O conteúdo é público para leitura; só admin publica.
- Certificados são gravados apenas pela função do servidor. A verificação pública (`verify_certificate`) devolve só o que já está impresso no certificado.
- Excluir a conta apaga perfil, progresso e certificados em cascata.

## Configurar (uma vez)

### 1. Chaves no site

No painel do Supabase, **Project Settings → API**, copie a **Project URL** e a **anon / publishable key** para o `config.js`:

```js
window.RAISIN_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'eyJ...'
};
```

As duas são públicas: a segurança vem das regras de acesso do banco. **A `service_role` / secret key nunca vai para o site nem para o repositório.**

### 2. Banco e funções

Com a CLI do Supabase (`npx supabase`, sem instalar nada), na pasta do projeto:

```bash
npx supabase login                          # abre o navegador para autorizar
npx supabase link --project-ref SEU-PROJETO # o ID que aparece na URL do painel
npx supabase db push                        # cria tabelas, regras e bucket
npx supabase functions deploy issue-certificate
npx supabase functions deploy delete-account
```

Sem CLI também dá: cole o conteúdo de `supabase/migrations/20260929000000_init.sql` em **SQL Editor → New query → Run**.

### 3. Endereços de retorno dos e-mails

Em **Authentication → URL Configuration**:
- **Site URL:** `https://vihni7.github.io/Raisin-finance/`
- **Redirect URLs:** a mesma, mais `http://localhost:8000/` para testes locais.

Isso já está no `supabase/config.toml` e pode ser aplicado com `npx supabase config push`.

Sem isso, os links de confirmação e de "esqueci minha senha" apontam para o endereço errado.

### 4. Primeiro administrador

Crie sua conta pelo próprio site e depois rode no **SQL Editor**:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
```

No primeiro login do admin, o site publica os cursos padrão do `courses.js` no banco. Daí em diante, o conteúdo vem do banco e é editado pela aba **Admin**.

### 5. E-mails (importante para a apresentação)

O servidor de e-mail gratuito do Supabase envia **poucos e-mails por hora** e costuma cair no spam. Para a banca:
- **Opção simples:** desligue a confirmação de e-mail em **Authentication → Sign In / Providers → Email → Confirm email**. A conta já entra logada ao ser criada.
- **Opção completa:** configure um SMTP próprio (Resend, Brevo e outros têm plano grátis) em **Authentication → Emails → SMTP Settings**.

## Testes

```bash
# regras de acesso (Postgres real em WebAssembly)
npm i @electric-sql/pglite
node supabase/tests/rls.test.mjs

# funções do servidor
npx deno test --allow-env supabase/functions/_tests/
```

## Limites conhecidos

- A medição dos 95% do vídeo roda no navegador (o YouTube não informa o servidor). O certificado exige que o progresso gravado esteja completo, mas quem manipular os próprios dados pela API consegue marcar aulas como vistas.
- Arquivos enviados pelo admin: até 50 MB cada no plano gratuito, 1 GB no total.
- O plano gratuito pausa o projeto após 7 dias sem acesso. Antes da apresentação, abra o painel para reativar se for preciso.
