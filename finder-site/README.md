# Site público do QR Code

Este projeto é separado do aplicativo Expo. Quem escaneia o QR abre este site,
autoriza o GPS e envia coordenadas ao mesmo projeto Supabase usado pelo app.

## Publicar na Vercel

1. Importe o repositório e selecione `finder-site` como **Root Directory**.
2. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente.
3. Publique. A Vercel detectará o Vite e usará `dist` como saída.
4. No arquivo `.env` do aplicativo, defina:
   `EXPO_PUBLIC_PUBLIC_SITE_URL=https://seu-projeto.vercel.app`
5. Reinicie o Expo com `npx expo start --clear` para os novos QR Codes apontarem ao site.

Nunca coloque a senha do banco nem a chave `service_role` na Vercel ou no app.
