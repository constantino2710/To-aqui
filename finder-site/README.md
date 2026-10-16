# Site público do QR Code

Site aberto no navegador quando alguém escaneia o QR Code do To Aqui. Não exige conta nem instalação: a pessoa decide se autoriza a localização, acompanha o compartilhamento e pode encerrá-lo quando quiser.

O fluxo do produto e o checklist para a demonstração estão no [README principal](../README.md).

## Executar localmente

```bash
npm install
cp .env.example .env
```

Preencha `.env` com credenciais públicas do mesmo projeto Supabase configurado no app:

```env
VITE_SUPABASE_URL=https://seu-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
```

Inicie o Vite:

```bash
npm run dev
```

Abra o endereço local acrescentando o token do QR como parâmetro `token`. A localização do navegador está disponível em `localhost`; em produção, o site precisa usar HTTPS.

## Publicar na Vercel

1. Importe o repositório e escolha `finder-site` como **Root Directory**.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para o projeto Supabase correto.
3. Publique usando Vite (saída padrão `dist`).
4. Configure `EXPO_PUBLIC_PUBLIC_SITE_URL` no `app/.env` com o endereço HTTPS publicado e reinicie o Expo com `npx expo start --clear`.

Nunca coloque a senha do banco, uma secret key ou a chave `service_role` no site. Variáveis `VITE_*` são incluídas no código entregue ao navegador.

## Caminho dos dados

O site lê `token` da URL. Ao tocar em **Compartilhar minha localização**, chama `scan_qr_code` para abrir uma sessão, registra consentimento em `grant_tracking_consent` e então acompanha o GPS com `watchPosition`. Cada posição é enviada a `record_location_ping`. O mapa consulta `get_session_map` periodicamente. Se o responsável encerrar no app, o site recebe o estado encerrado e para o GPS; a pessoa também pode usar **Parar de compartilhar**.

O navegador atua sem login. Seu token de sessão permite somente as operações de localização daquela sessão; a API não retorna nome da família, dos responsáveis ou da pessoa identificada no QR.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o Vite em desenvolvimento |
| `npm run build` | Verifica TypeScript e gera `dist` |
| `npm run preview` | Serve localmente a versão gerada |
