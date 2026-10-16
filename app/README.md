# Aplicativo Found

Aplicativo Expo para responsáveis criarem famílias, cadastrarem QR Codes e acompanharem sessões de localização. O site público aberto pelo QR ainda exibe a marca To Aqui. A apresentação do projeto e o checklist de demonstração estão no [README principal](../README.md).

## Requisitos

- Node.js compatível com a versão do Expo declarada em `package.json`.
- Projeto Supabase configurado com as migrations de `supabase/migrations/` aplicadas.
- Expo Go ou development build para abrir no celular.

## Configuração

```bash
npm install
cp .env.example .env
```

Configure no `.env`:

| Variável | Descrição |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do mesmo projeto |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | URL HTTPS do `finder-site` publicado |
| `SUPABASE_DB_PASSWORD` | Opcional; usada somente por ferramentas locais de banco, nunca pelo app |

O app usa a publishable key no cliente, protegida pelas permissões e políticas RLS do banco. Não use senha, secret key ou `service_role` em variáveis `EXPO_PUBLIC_*`.

Para confirmar contas por e-mail no Expo Go, adicione `exp://**` à lista de redirects autorizados no Supabase. Em build nativo, autorize `app://**`. Reinicie o Expo com `npx expo start --clear` depois de alterar o `.env`.

## Executar

```bash
npm run start
```

Leia o QR do Expo Go. Alternativamente, `npm run android`, `npm run ios` ou `npm run web` iniciam no alvo correspondente, desde que o ambiente esteja instalado.

## Fluxo de localização

1. O responsável cria/abre uma família e cadastra um QR Code; o banco gera o token do QR.
2. O link do QR abre o site público. A função `scan_qr_code` cria uma sessão persistida e devolve uma credencial anônima para aquele navegador.
3. Após consentimento e permissão do GPS, o `finder-site` grava posições através de `record_location_ping`.
4. O app consulta as sessões ativas e posições do grupo. Supabase Realtime entrega posições e mudanças de estado, e o app só exibe dados do grupo autorizado.
5. O responsável usa **Já encontramos** para encerrar. O navegador também pode encerrar pelo botão **Parar de compartilhar**.

O navegador do achador não faz login e não recebe nome da família ou da pessoa protegida. O acesso é limitado ao token da sessão e às RPCs públicas de localização. A pessoa pode interromper o envio a qualquer momento.

## Banco e segurança

As migrations estão em `supabase/migrations/` e devem ser aplicadas em ordem ao mesmo projeto usado pelo app e pelo site. Para enviar migrations com Supabase CLI:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

As tabelas de sessão e posição não permitem escrita direta pelo cliente; as funções RPC validam o token, status, consentimento e associação ao grupo. RLS limita a leitura de responsáveis aos grupos de que participam. A API anônima do achador não expõe dados pessoais da família.

## Estrutura principal

```text
src/app/                 rotas Expo Router; (app) requer sessão
src/app/(app)/            famílias, perfil, comunidade e QR
src/lib/supabase.ts       cliente Supabase do app
src/lib/auth.tsx          sessão e autenticação
supabase/migrations/      esquema, políticas, funções e fluxo de localização
```

## Scripts

| Comando | Função |
| --- | --- |
| `npm run start` | Inicia o Expo/Metro |
| `npm run android` | Inicia para Android |
| `npm run ios` | Inicia para iOS |
| `npm run web` | Inicia para navegador |
| `npm run lint` | Executa Expo lint |
| `npx tsc --noEmit` | Verifica tipos TypeScript |

`npm run reset-project` é um resquício do template Expo e apaga arquivos do projeto. Não é necessário para executar o app.
