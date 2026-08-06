# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Design system (regra permanente)

- Siga o padrão visual do arquivo Figma "Task management & to-do list app":
  https://www.figma.com/pt-br/comunidade/file/1143575071825582037/task-management-to-do-list-app
- Mantenha o visual moderno e limpo: fundo lavanda suave, superfícies claras,
  roxo como destaque, cartões bem arredondados, sombras discretas, ícones
  simples e bastante espaço em branco.
- Não troque esse padrão sem um pedido explícito do usuário.
- Nunca coloque cores hexadecimais novas diretamente em telas ou componentes.
  Cores do produto devem vir dos tokens semânticos em `src/constants/theme.ts`.
- Raios de borda devem usar `Radii`; alterações de identidade visual devem ser
  possíveis mudando principalmente `Palette`, `Colors` e `Radii` nesse arquivo.
