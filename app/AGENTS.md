# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Design system (regra permanente)

O padrão visual completo está em [`../DESIGN.md`](../DESIGN.md), válido para o
app e o site. **Siga-o sempre; só troque com pedido explícito do usuário.**
Resumo para este app:

- **Identidade Emerald (verde)**, tema claro e escuro acompanhando o sistema.
  Visual moderno e limpo: cartões bem arredondados, sombras discretas, ícones
  simples e bastante espaço em branco.
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
