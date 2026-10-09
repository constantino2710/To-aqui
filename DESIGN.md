# Padrão de design — To Aqui

Este documento é a fonte única do padrão visual do produto, válido para o
aplicativo (`app/`) e o site público (`finder-site/`). **Siga sempre este
padrão. Só troque com um pedido explícito do usuário.**

## Identidade

- **Cor:** paleta Emerald (verde), com tema claro e escuro acompanhando o
  tema do sistema.
- **Marca principal:** emerald (`#10B981` no claro, `#34D399` no escuro).
- **Tom:** calmo, confiável e acolhedor. É um produto de segurança para
  famílias, então clareza e tranquilidade vêm antes de efeito visual.
- **Formas:** cantos bem arredondados, sombras discretas, bastante espaço em
  branco, ícones simples.

## Bibliotecas de componentes

- **App (Expo / React Native):** [react-native-reusables](https://reactnativereusables.com)
  sobre **NativeWind** (Tailwind no React Native). O shadcn/ui não roda em
  React Native; o react-native-reusables é o equivalente oficial.
- **Site (React / Vite):** **shadcn/ui** (Radix + Tailwind CSS).
- Em ambos, os componentes ficam em `src/components/ui/`. Novos componentes
  entram por esse mesmo padrão (copiar o componente para o projeto, estilizar
  com classes Tailwind e os tokens semânticos abaixo).

## Contrato de cores (tokens, estilo shadcn)

As cores vivem como variáveis HSL e **devem ser idênticas** nos dois projetos:

- App: `app/global.css`
- Site: `finder-site/src/styles.css`
- Espelho em JS para os componentes antigos do app: `app/src/constants/theme.ts`

Tokens semânticos (use sempre estes, nunca um hex solto):

| Token | Função |
| --- | --- |
| `background` / `foreground` | Fundo da tela e texto principal |
| `card` / `card-foreground` | Superfícies elevadas e seu texto |
| `primary` / `primary-foreground` | Marca (botões principais, destaques) |
| `secondary` / `secondary-foreground` | Ações e chips suaves |
| `muted` / `muted-foreground` | Fundos neutros e texto de apoio |
| `accent` / `accent-foreground` | Realces pontuais |
| `destructive` / `destructive-foreground` | Ações perigosas e erros |
| `success` / `success-foreground` | Confirmações |
| `border` / `input` / `ring` | Contornos, campos e foco |

Claro e escuro trocam automaticamente pelo tema do sistema
(`@media (prefers-color-scheme: dark)` no site; `darkMode: 'media'` no app).

### Regra de ouro das cores

- **Nunca** escreva um valor hexadecimal novo direto numa tela ou componente.
- No app, classes NativeWind usam os tokens (`bg-primary`, `text-foreground`,
  `border-border`). Componentes antigos ainda em `StyleSheet` leem de
  `theme.ts`, que espelha os mesmos tokens.
- No site, use as classes Tailwind com os mesmos nomes (`bg-primary`, etc.).
- Mudou a identidade? Edite os tokens nos três arquivos acima, juntos.

## Layout das páginas

- Coluna central, largura máxima confortável (~460 px no app, ~34 rem no site),
  recuo lateral de 16–20 px, nada de rolagem horizontal.
- Uma ação principal por tela (botão `primary`); o resto é secundário.
- Mobile primeiro. Alvos de toque ≥ 44 px. Foco de teclado visível.
- Movimento com parcimônia: um único momento orquestrado por tela, no máximo.

### Evite os clichês de layout gerado

- Nada de rótulo em CAIXA ALTA espaçada acima de cada título.
- Não destaque uma única palavra do título em cor/itálico.
- Não use marcadores numerados (01 / 02 / 03) a menos que seja mesmo uma
  sequência.

## Escrita (copy)

- Voz ativa e frase em caixa normal. O botão diz o que acontece
  ("Compartilhar minha localização", não "Enviar").
- A mesma ação mantém o mesmo nome do começo ao fim do fluxo.
- Erro explica o que houve e como resolver, sem pedir desculpas nem ser vago.
- Tela vazia é convite para agir, não enfeite.

## Ao criar telas novas

1. Leia este arquivo.
2. Monte o layout com os componentes de `src/components/ui/`.
3. Use só tokens semânticos para cor.
4. Rode a validação do projeto (`npx tsc --noEmit`, build) antes de concluir.
