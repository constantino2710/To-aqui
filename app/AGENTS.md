# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Design system (regra permanente)

O padrão visual completo está em [`../DESIGN.md`](../DESIGN.md), válido para o
app e o site. **Siga-o sempre; só troque com pedido explícito do usuário.**
Resumo para este app:

- **Paleta Sálvia**: neutros esverdeados, ações em grafite e degradê
  verde-água → verde só para localização, "ao vivo" e confirmações. Claro é o
  padrão (há tema escuro). Tudo em pílulas e cartões de cantos grandes, sem
  bordas, com degradê quase imperceptível e sombra leve (`Card`,
  `FundoCartao`, `sombraCartao`), muito espaço em branco. Fonte **Plus Jakarta
  Sans**. Ícones só **Feather**, sempre pelo componente `Icone`.
- **Escala e espaço:** texto só em 14/16/18 (títulos 28/40) via `FontSize` e
  `LineHeight`; espaçamento em grade de 8 via `Spacing` — nunca `Spacing.x + n`.
  Linhas de pessoa são pílulas de 64 com folga de 8; alvos de toque ≥ 44.
- **Movimento:** curto e suave (≤ ~360 ms, sem quicar). Use `Motion` em
  `src/constants/motion.ts`, `PressableScale` para tocáveis, `Entrada` para
  blocos que aparecem (o `Screen` já faz isso) e respeite
  `useMovimentoReduzido`. Valores animados: `useState(() => new Animated.Value(0))`
  (o React Compiler não aceita `useRef(...).current` no render). Na web, não use
  `entering` do Reanimated (deixa o bloco absoluto); o `Entrada` já tem versão web.
- **Componentes:** [react-native-reusables](https://reactnativereusables.com)
  sobre **NativeWind** (Tailwind no React Native). Novos componentes entram em
  `src/components/ui/`, estilizados com classes NativeWind. O shadcn/ui não roda
  em React Native; o react-native-reusables é o equivalente oficial.
- **Cores:** nunca escreva um hex novo direto numa tela ou componente. Classes
  NativeWind usam tokens semânticos (`bg-primary`, `text-foreground`,
  `border-border`). O contrato de tokens fica em `global.css` e é espelhado em
  `src/constants/theme.ts`, que ainda serve os componentes em `StyleSheet`.
- **Raios de borda** usam `Radii` (ou `rounded-md`/`rounded-lg` no NativeWind).
  Mudança de identidade começa alterando os tokens em `global.css` +
  `src/constants/theme.ts` + `finder-site/src/styles.css`, juntos.
