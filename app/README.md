# to-aqui

App em React Native (Expo) com autenticação por e-mail e senha via Supabase.

Telas: login, cadastro e uma home que mostra o e-mail de quem está logado.

## Requisitos

- **Node.js 20.19.4 ou superior** (exigência do React Native 0.81.5)
- **Expo Go compatível com o SDK 54** no celular, ou um development build
- Um projeto Supabase (a parte de banco é gratuita para começar)

## Como rodar

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha com os dados do seu projeto Supabase
(**Dashboard → Project Settings → API Keys**):

| Variável | Onde encontrar |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A chave que começa com `sb_publishable_` |
| `SUPABASE_DB_PASSWORD` | **Project Settings → Database**. Opcional: só é usada por CLI/migrations, nunca pelo app |

Sem as duas primeiras o app lança um erro explícito na inicialização, de propósito —
é melhor do que falhar silenciosamente em toda requisição.

> **Sobre o prefixo `EXPO_PUBLIC_`:** ele faz a variável ser embutida no bundle do
> app, ficando visível para qualquer pessoa que baixe o APK. Isso é o esperado para
> a publishable key, que é pública por design e protegida por RLS. **Nunca** use esse
> prefixo na senha do banco nem na secret key.

### 3. Autorize os redirects no Supabase

Este projeto usa confirmação de e-mail. Para o link do e-mail voltar ao app, vá em
**Authentication → URL Configuration** e adicione em *Redirect URLs*:

- `exp://**` — para o Expo Go em desenvolvimento
- `app://**` — para builds nativos

E em *Site URL*, use `app://auth/callback`.

Se você pular este passo, a conta ainda é confirmada, mas o usuário não volta
automaticamente para o app: precisará abrir o app e fazer login manualmente.

### 4. Inicie

```bash
npm run start
```

Escaneie o QR code com o Expo Go.

> Sempre que editar o `.env`, use `npx expo start --clear`. O Metro faz cache das
> variáveis dentro do bundle e sem isso continua servindo os valores antigos.

## Estrutura

```
src/
  app/                 rotas (expo-router, file-based)
    _layout.tsx        tema + provider de sessão + Stack.Protected
    (auth)/            login e cadastro (visível só sem sessão)
    (app)/             home (visível só com sessão)
  components/          UI reutilizável
  constants/theme.ts   cores, espaçamentos e fontes
  hooks/               hooks de tema
  lib/
    supabase.ts        cliente Supabase (PKCE + AsyncStorage)
    auth.tsx           sessão, onAuthStateChange e deep link de confirmação
    auth-errors.ts     tradução das mensagens de erro do Supabase
```

O redirecionamento entre logado e deslogado é feito por `Stack.Protected` no layout
raiz. Nenhuma tela navega manualmente após login ou logout, então não existe caminho
em que a sessão e a tela fiquem dessincronizadas.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run start` | Sobe o Metro e mostra o QR code |
| `npm run android` | Abre em emulador/aparelho — requer o Android SDK instalado |
| `npm run ios` | Abre no simulador iOS — só em macOS |
| `npm run web` | Abre no navegador |
| `npm run lint` | `expo lint` (o ESLint ainda não está configurado; ele se oferece para configurar) |
| `npm run reset-project` | ⚠️ **Destrutivo.** Apaga `src/` e `scripts/` e recria um projeto em branco. Vestígio do template do Expo — não rode neste projeto |
