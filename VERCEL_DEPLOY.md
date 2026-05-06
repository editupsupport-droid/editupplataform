# Deploy na Vercel

Este projeto já está pronto para subir na Vercel. O domínio alvo desta entrega é:

- `https://editupp.vercel.app`

## O que já está pronto no código

- `metadataBase` usa `NEXT_PUBLIC_APP_URL` e cai nas variáveis automáticas da Vercel se necessário.
- As rotas server-side importantes já estão em runtime Node:
  - `/api/auth/email-status`
  - `/api/public-profile/[slug]`
  - `/api/stripe/checkout`
  - `/api/stripe/webhook`
- O favicon e a logo já estão configurados no app.
- O build de produção já está passando com `npm run build`.

## Variáveis de ambiente na Vercel

Cadastre estas variáveis em `Project Settings > Environment Variables`.

Use estes nomes:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_ESSENTIAL`
- `APP_ENCRYPTION_KEY`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `NEXT_PUBLIC_GOOGLE_DRIVE_PICKER_API_KEY`
- `NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID`
- `CRON_SECRET`

Valor obrigatório para produção:

- `NEXT_PUBLIC_APP_URL=https://editupp.vercel.app`
- `GOOGLE_DRIVE_REDIRECT_URI=https://editupp.vercel.app/api/google-drive/callback`

Recomendação:

- adicione tudo em `Production`
- adicione também em `Preview` se quiser testar antes do deploy final

## Supabase

No Supabase, ajuste:

- `Authentication > URL Configuration > Site URL`
- `Authentication > URL Configuration > Redirect URLs`

Valores de produção:

- `Site URL`: `https://editupp.vercel.app`
- `Redirect URLs`:
  - `https://editupp.vercel.app/dashboard/calculadora`
  - `https://editupp.vercel.app`

## Google Login

No Google Cloud Console, no seu cliente OAuth Web:

- `Authorized JavaScript origins`
  - `https://editupp.vercel.app`
- `Authorized redirect URIs`
  - `https://cgebzcxtrsyfnbmuufzn.supabase.co/auth/v1/callback`
  - `https://editupp.vercel.app/api/google-drive/callback`

No Supabase:

- `Authentication > Providers > Google`
- mantenha o provider ativo com o mesmo client configurado

## Stripe

Crie um webhook de produção no painel da Stripe apontando para:

- `https://editupp.vercel.app/api/stripe/webhook`

Depois salve o novo:

- `STRIPE_WEBHOOK_SECRET`

na Vercel, em `Production`.

## Hardening recomendado

Antes de colocar em produção, rode este SQL no Supabase:

- [supabase/harden-public-profile.sql](/Users/marinhojose/Desktop/sites/edição/supabase/harden-public-profile.sql:1)

Isso remove a leitura pública direta da tabela `profiles`, já que a página pública usa a rota segura:

- `/api/public-profile/[slug]`

## Ordem recomendada de deploy

1. Criar/importar o projeto na Vercel
2. Adicionar as variáveis de ambiente
3. Fazer o primeiro deploy
4. Confirmar que `https://editupp.vercel.app` abriu
5. Ajustar `Site URL` e `Redirect URLs` no Supabase
6. Ajustar `Authorized JavaScript origins` no Google
7. Criar o webhook de produção da Stripe
8. Fazer um novo deploy se alterar variáveis

## Teste final após deploy

Validar estes fluxos:

1. Home carregando com logo e favicon corretos
2. Login com uma das 3 contas especiais
3. Cadastro de conta nova
4. Login Google
5. Compra com cartão e atualização de plano
6. Botão Pix abrindo o WhatsApp
7. Perfil público em `/slug`
8. Geração e abertura do link de aprovação em `/aprovacao/...`
9. Publicação e atualização de vaga

## Observações

- A Vercel também injeta `VERCEL_PROJECT_PRODUCTION_URL`, que o projeto já consegue usar como fallback.
- O projeto já está pronto para usar `editupp.vercel.app` como URL principal via `NEXT_PUBLIC_APP_URL`.
- Se alguma chave já foi exposta em chat ou teste, rotacione antes de produção:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `Google Client Secret`
