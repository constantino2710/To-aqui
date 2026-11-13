# Padrão de design — Found

Fonte única do padrão visual do produto, válida para o aplicativo (`app/`) e
para o site público (`finder-site/`). **Siga sempre este padrão. Só troque com
um pedido explícito do usuário.** As telas aprovadas estão desenhadas no canvas
"Found — Propostas de redesign" (pranchetas `T-*`).

## Identidade

- **Paleta Sálvia:** neutros levemente esverdeados, ações em **grafite** e um
  degradê verde-água → verde (`#3FA584` → `#6CC160`) reservado para
  localização, estado "ao vivo" e confirmações.
- **Logo Pin-QR:** pin de localização em degradê com o "olho" de um QR Code no
  centro, sobre quadrado grafite; ao lado, o nome "found" em ExtraBold.
  Componentes: `FoundMark` e `FoundLogo` (`src/components/found-logo.tsx`).
  Abaixo de 32 px o "olho" vira um quadrado simples.
- **Tom:** calmo, confiável e acolhedor. É um produto de segurança para
  famílias: clareza e tranquilidade vêm antes de efeito visual.
- **Formas:** tudo bem arredondado. Campos, botões, seletores e linhas de
  pessoa são **pílulas**; cartões têm cantos de 28 (grandes, 32).
- **Superfícies:** cartões e linhas de pessoa **sem borda**, com degradê
  diagonal quase imperceptível (`card` → `card-gradient`) e **sombra leve**
  (`sombraCartao`: contato de 1–2 px + halo largo). Cartões escuros de
  destaque usam `sombraDestaque` (`shadowStrong`). Campos dentro de um cartão
  têm degradê próprio, de outra matiz (`field-gradient-from/to`), para se
  destacarem do cartão.
- **Uma peça de destaque por aba**, cada uma com papel próprio (não repita a
  mesma nas três): Início = `CartaoDestaque` grafite com o resumo; Comunidade =
  cartão de embarque da tag (`FormaIngresso`); Perfil = cartão com capa verde
  suave e avatar sobreposto.
- **Tema:** claro é o padrão; o escuro existe e usa os mesmos tokens. No app, o
  tema escolhido também define a cor dos ícones da barra de status e o fundo
  nativo da janela; no site, há botão claro/escuro no topo (classe no `<html>`,
  salvo no navegador).
- **Ícones:** só **Feather** (traço de 2 px, pontas redondas; a mesma família do
  Lucide do site), sempre pelo componente `Icone`. O que o Feather não tem é
  desenhado no mesmo traço dentro de `Icone` (ex.: `qr-code`). Não use outro
  set de ícones direto nas telas.

## Fonte e escala de texto

- **Plus Jakarta Sans** (pesos 400–800), carregada em `app/src/app/_layout.tsx`
  e, no site, por `finder-site/index.html`.
- Texto corrido, rótulos e botões usam **só 14 / 16 / 18 px**
  (`FontSize.small / body / large`, com `LineHeight` 20 / 24 / 26).
  Títulos têm escala própria: 28 (título de tela) e 40 (destaque).
- Logotipo ("found" ao lado do símbolo) é parte da marca e fica fora da escala.
- Títulos em peso 700 com tracking levemente negativo; textos de apoio em
  `textSecondary`.

## Espaçamento

Grade de 8 (`Spacing.two/three/four/five` = 8/16/24/32; `one` = 4 só para ajuste
fino). **Nunca some ou subtraia tokens** (`three + 4`).

- Laterais da tela: 24. Entre blocos: 24.
- Dentro de um bloco: 8 entre itens do mesmo grupo (título/apoio, campo/campo,
  linha/linha); 16 entre elementos de um cartão.
- Cartões: padding 24 (listas densas: 16). Linhas de pessoa: pílula de 64 px
  com folga de 8 nos quatro lados (avatar de 48 e botão de 48 concêntricos
  com as pontas).
- Alvos de toque ≥ 44 px: botões compactos 44–48, botões principais 58,
  campos 64, barra de busca 56.
- Subtítulos de tela cabem em **uma linha** a 390 px: assim o primeiro bloco
  começa na mesma altura em todas as abas.
- A barra de abas **flutua** sobre o conteúdo: o `Screen` e o `Fab` reservam o
  espaço dela (`useEspacoBarra`).

## Tokens de cor

Variáveis HSL nos três arquivos, que **devem ser idênticos**: `app/global.css`,
`finder-site/src/styles.css` e o espelho JS `app/src/constants/theme.ts`.
Nunca escreva hex novo numa tela ou componente.

| Token | Função |
| --- | --- |
| `background` / `foreground` | Fundo da tela (cinza esverdeado) e texto |
| `card` / `card-foreground` | Cartões e campos brancos |
| `primary` / `primary-foreground` | **Grafite**: botão principal e barra de abas |
| `secondary`, `accent` | Verde suave (chips, ícones em foco) |
| `muted` / `muted-foreground` | Neutros e texto de apoio |
| `destructive` | Erros e ações perigosas (`#C73A3F`, passa de 4,5:1 em texto) |
| `success` | Confirmações |
| `border` / `input` / `ring` | Contornos e foco |
| `card-gradient` | Ponta final do degradê dos cartões |
| `field-gradient-from/to` | Degradê dos campos dentro de cartões (sálvia → azul-névoa) |
| `warning` / `warning-soft` | Avisos (toast de aviso) |
| `toggle-track` | Trilho do interruptor desligado |

No app, o `theme.ts` expõe também `action`/`onAction` (botão grafite),
`brand` (verde para texto e ícones), `brandSoft`, `gradientFrom/To`,
`dangerSoft`, `shadow`/`shadowStrong` e `AvatarTints` (avatares: fundo suave +
iniciais na mesma matiz). Verde = boa notícia (localização recebida,
confirmação); vermelho só para erro e ação perigosa.

## Componentes (app)

Base: [react-native-reusables](https://reactnativereusables.com) sobre
**NativeWind**; componentes próprios em `app/src/components/`.

| Componente | Uso |
| --- | --- |
| `Screen` | Fundo, área segura, cabeçalho (título 28 + subtítulo 16), rolagem com indicador próprio na web e `aoVoltar` (voltar à esquerda, acima do título) |
| `PrimaryButton` | Ação principal: pílula grafite de 58, uma por tela |
| `SecondaryButton` | Pílula com contorno; `compacto` (48) ou normal (56); tons neutro/marca/perigo |
| `IconField` | Campo em pílula com ícone e rótulo dentro; `status` cria o selo sobre a borda ("Disponível"). Foco: contorno único verde translúcido. Aceita `ref` e encadeia campos com "Próximo" no teclado |
| `BarraBusca` | Busca em pílula; a lupa e o "X" só aparecem com a busca em uso |
| `PersonRow` | Pessoa em lista (pílula de 64, degradê + sombra) com ações à direita |
| `Card` | Cartão com degradê e sombra leve, cantos 28, padding 24 (`FundoCartao`, `sombraCartao`) |
| `CartaoDestaque` | Cartão grafite com anéis e pin da marca (só no Início) |
| `FormaIngresso` | Cartão de embarque com picote e furos recortados (tag de amizade) |
| `Toggle` | Interruptor em pílula: trilho neutro / degradê sálvia, bolinha sempre dentro |
| `IconButton` / `ActionPill` | Botão redondo só com ícone / pílula compacta; contornos neutros usam `border` |
| `Icone` | Único ponto de entrada de ícones (Feather + desenhados) |
| `QrFound` | QR com a identidade: pontos arredondados, cantos grafite→verde, pin no centro; `moldura` gera o adesivo do download |
| `LocationMap` | Mapa no padrão da marca (`lib/mapa-found.ts`): tiles neutros com tom sálvia, pin do Found com ondas, marcador "você", linha tracejada e selo |
| `AlturaAnimada` | Anima a altura só na troca de conteúdo (`chave`) |
| `Entrada` | Fade + 10 px de deslize ao montar (o `Screen` já aplica) |
| `Section` | Título 18/700 + itens com 8 de espaço |
| `SegmentedTabs` | Alterna seções (Membros / QR Codes) |
| `EmptyState` | Estado vazio com círculo, título, apoio e ação |
| `Fab` | Botão "+" grafite de 56 |
| `Badge` | Selo em pílula com fundo suave |
| `LocationHero` | Card de mapa com raio de localização (`marca` põe a logo como pin) |
| Barra inferior | Pílula grafite flutuante; aba ativa em pílula branca (`(app)/_layout.tsx`) |

No site: **shadcn/ui** (Radix + Tailwind) com os mesmos tokens e a mesma escala.
Os cartões usam `.superficie-cartao` (mesmo degradê e sombra do app), o topo
tem a ilustração `Radar` e o mapa ao vivo segue o mesmo visual do mapa do app.

## Movimento

- Curto e suave (`Motion`: 160 / 260 / 360 ms, curva `suave`), sem quicar.
- Entrada de blocos: `Entrada`. No celular usa o Reanimated (thread de UI); na
  web, animação CSS (`entrada.web.tsx`). **Não use a animação de entrada do
  Reanimated na web**: ela deixa o bloco com `position: absolute` e ele deixa
  de ocupar espaço.
- Nada aparece "de estalo" ao lado de algo que anima: se um elemento entra
  junto com outro animado, use o mesmo progresso (ex.: o "X" e a lupa da busca).
- Evite montar coisas pesadas no instante em que uma janela abre (ex.: a cópia
  do QR para download só é montada ao baixar).
- Respeite `useMovimentoReduzido` (no site, `prefers-reduced-motion`).

## Mapa

Tiles do OpenStreetMap (sem chave; a CARTO passou a exigir uma) com filtro para
o tom sálvia. Para produção, configure um provedor com chave por
`EXPO_PUBLIC_MAP_TILES_URL`/`_ATTRIBUTION` (app) e
`VITE_MAP_TILES_URL`/`_ATTRIBUTION` (site), sem mudar código.

## Layout das páginas

- Coluna central, largura máxima ~460 px, mobile primeiro.
- Uma ação principal por tela (botão `primary`/grafite); o resto é secundário.
- Foco de teclado visível: contorno verde suave nos campos; na web, anel verde
  arredondado nos botões (só com teclado; com mouse/toque não aparece).
- Movimento com parcimônia: um momento orquestrado por tela, no máximo.

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

1. Leia este arquivo e veja a prancheta correspondente no canvas.
2. Monte o layout com os componentes de `app/src/components/`.
3. Use só tokens semânticos para cor e a grade de 8 para espaço.
4. Rode a validação do projeto (`npx tsc --noEmit`, `npx expo lint`, build).
