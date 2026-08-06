# To Aqui

Monorepo do To Aqui: aplicativo móvel para responsáveis e site público aberto por
quem escaneia um QR Code.

## Projetos

| Diretório | Função | Tecnologia |
| --- | --- | --- |
| [`app/`](./app) | Login, famílias, amigos, QR Codes, alertas e mapa | Expo / React Native |
| [`finder-site/`](./finder-site) | Consentimento e envio da localização pelo navegador | React / Vite |
| [`app/supabase/`](./app/supabase) | Banco, segurança e API pública do rastreamento | Supabase / PostgreSQL |
| [`CONCEITO.md`](./CONCEITO.md) | Conceito e decisões do produto | Documentação |

Cada projeto mantém suas próprias dependências e seu próprio arquivo `.env`.
As credenciais locais são ignoradas pelo Git; somente os `.env.example` são
versionados.

## Aplicativo

```bash
cd app
npm install
npm run start
```

Consulte [`app/README.md`](./app/README.md) para configurar o Supabase e executar
as migrations.

## Site público

```bash
cd finder-site
npm install
npm run dev
```

Para publicar na Vercel, escolha `finder-site` como **Root Directory**. As etapas
e variáveis necessárias estão em [`finder-site/README.md`](./finder-site/README.md).

Depois da publicação, configure no `app/.env`:

```env
EXPO_PUBLIC_PUBLIC_SITE_URL=https://seu-projeto.vercel.app
```

## Validação

```bash
cd app
npx tsc --noEmit
npm run lint

cd ../finder-site
npm run build
```
