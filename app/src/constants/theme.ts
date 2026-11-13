import { Platform } from 'react-native';

/**
 * Paleta Sálvia: neutros levemente esverdeados, ações em grafite e um degradê
 * verde-água → verde reservado para localização, estados "ao vivo" e confirmações.
 * Os valores aqui espelham o contrato de tokens em `global.css` (variáveis HSL),
 * que também é usado pelo site em `finder-site/src/styles.css`. Mantenha os
 * lados em sincronia ao ajustar a identidade.
 */
export const Palette = {
  white: '#FFFFFF',

  // Grafite: texto principal e botões de ação.
  graphite: '#1E2320',
  // Ponta clara do degradê dos cartões escuros e textos sobre eles.
  graphiteSoft: '#2B3A33',
  onGraphiteSoft: '#B9C7BF',
  onGraphiteLine: 'rgba(255, 255, 255, 0.12)',
  // Sobre o cartão verde (ingresso da tag): texto/ícones grafite e vidro escuro.
  graphiteGlass: 'rgba(30, 35, 32, 0.12)',
  graphiteMuted: 'rgba(30, 35, 32, 0.68)',
  graphiteLine: 'rgba(30, 35, 32, 0.28)',
  ink: '#1E2320',

  // Sálvia: degradê de destaque e seus apoios.
  sage500: '#3FA584',
  sage400: '#6CC160',
  sage700: '#1F7A5C',
  sage100: '#E3F3EC',
  sage200dark: '#1D3A2E',
  sage300dark: '#8EE0BA',

  // Neutros claros.
  gray700: '#636B66',
  gray300: '#A3ABA6',
  gray200: '#E6E9E5',
  gray150: '#E8EAE6',
  gray50: '#F1F2F0',
  // Ponta do degradê sutil dos cartões (branco puxando para a sálvia).
  cardTint: '#E9F4EE',
  // Degradê dos campos dentro de cartões: cinza-sálvia → azul-névoa.
  fieldFrom: '#ECEFEA',
  fieldTo: '#E3E9F0',
  // Trilho do interruptor desligado.
  toggleTrack: '#DCE0DB',

  // Neutros escuros.
  night: '#121614',
  nightSoft: '#1B201D',
  nightRaised: '#252B27',
  nightBorder: '#2A302C',
  nightCardTint: '#22302A',
  nightFieldFrom: '#232A26',
  nightFieldTo: '#1F2630',
  nightToggleTrack: '#3A433E',

  // Destaque pontual (selos, "QR ativo").
  sun: '#F5C542',

  // Legado: ainda usados em telas que serão repaginadas depois.
  denim700: '#405078',
  denim500: '#6B7FB6',
  emerald500: '#10B981',

  rose: '#FB7185',
  orange: '#FB923C',
  blue: '#38BDF8',
  teal: '#14B8A6',
  amber: '#F59E0B',
  lime: '#84CC16',
  // Vermelho de erro: escuro o bastante para texto de 14 px sobre branco (≥ 4,5:1).
  red: '#C73A3F',

  shadow: 'rgba(30, 35, 32, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.32)',
  // Sombra de cartões escuros/de destaque, que precisam de mais contraste.
  shadowStrong: 'rgba(30, 35, 32, 0.32)',
  shadowStrongDark: 'rgba(0, 0, 0, 0.55)',
  overlay: 'rgba(10, 12, 11, 0.66)',
} as const;

/** Tokens semânticos consumidos pelos componentes. */
export const Colors = {
  light: {
    text: Palette.graphite,
    background: Palette.gray50,
    backgroundElement: Palette.white,
    /** Ponta final do degradê sutil dos cartões (começa em `backgroundElement`). */
    cardGradientTo: Palette.cardTint,
    /** Degradê dos campos e superfícies internas de um cartão (outra matiz, para destacar). */
    fieldGradientFrom: Palette.fieldFrom,
    fieldGradientTo: Palette.fieldTo,
    /** Trilho do interruptor desligado: contrasta com cartões nos dois temas. */
    toggleTrack: Palette.toggleTrack,
    backgroundSelected: Palette.gray150,
    textSecondary: Palette.gray700,
    /** Cor da marca para texto e ícones (links, destaques). */
    brand: Palette.sage700,
    onBrand: Palette.white,
    /** Botão de ação principal (grafite). */
    action: Palette.graphite,
    onAction: Palette.white,
    /** Fundo suave do destaque (chips, ícones em foco). */
    brandSoft: Palette.sage100,
    /** Pontas do degradê de destaque. */
    gradientFrom: Palette.sage500,
    gradientTo: Palette.sage400,
    danger: Palette.red,
    /** Fundo suave de erro (avisos, selos). */
    dangerSoft: '#FCE8E9',
    /** Avisos: texto/ícone (≥ 4,5:1 sobre branco) e fundo suave. */
    warning: '#B4570E',
    warningSoft: '#FCEFE3',
    success: Palette.sage700,
    border: Palette.gray200,
    shadow: Palette.shadow,
    /** Sombra mais presente, para cartões escuros (ex.: identidade do perfil). */
    shadowStrong: Palette.shadowStrong,
    overlay: Palette.overlay,
    accentPink: Palette.rose,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
  dark: {
    text: Palette.gray50,
    background: Palette.night,
    backgroundElement: Palette.nightSoft,
    cardGradientTo: Palette.nightCardTint,
    fieldGradientFrom: Palette.nightFieldFrom,
    fieldGradientTo: Palette.nightFieldTo,
    toggleTrack: Palette.nightToggleTrack,
    backgroundSelected: Palette.nightRaised,
    textSecondary: Palette.gray300,
    brand: Palette.sage300dark,
    onBrand: Palette.night,
    action: Palette.gray50,
    onAction: Palette.night,
    brandSoft: Palette.sage200dark,
    gradientFrom: Palette.sage500,
    gradientTo: Palette.sage400,
    danger: '#FF8A8F',
    dangerSoft: '#3A1E20',
    warning: '#F6B97A',
    warningSoft: '#3B2A18',
    success: Palette.sage300dark,
    border: Palette.nightBorder,
    shadow: Palette.shadowDark,
    shadowStrong: Palette.shadowStrongDark,
    overlay: Palette.overlay,
    accentPink: Palette.rose,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Avatares: fundo suave + iniciais na mesma matiz, em tom escuro. Todos passam
 * de 4,5:1 (texto sobre fundo). A matiz sai de uma "semente" estável da pessoa.
 */
export const AvatarTints = {
  light: [
    { bg: '#E3F3EC', fg: '#1F7A5C' },
    { bg: '#E4EBFA', fg: '#2C4A9A' },
    { bg: '#FCEBE2', fg: '#9A3F16' },
    { bg: '#F0E8FA', fg: '#6A3A9A' },
    { bg: '#FFF1CC', fg: '#7A5A00' },
  ],
  dark: [
    { bg: '#1D3A2E', fg: '#8EE0BA' },
    { bg: '#1E2A4A', fg: '#A9BDF5' },
    { bg: '#3B2218', fg: '#F6B79A' },
    { bg: '#2E2140', fg: '#CBA9F0' },
    { bg: '#3A2E10', fg: '#F5D27A' },
  ],
} as const;

/**
 * Plus Jakarta Sans, carregada em `app/_layout.tsx`. Cada peso é uma família
 * própria (exigência do Android), então use `fontePorPeso` em vez de só
 * `fontWeight`.
 */
export const JakartaFamilies = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

type Peso = keyof typeof JakartaFamilies;

/** Converte um `fontWeight` qualquer na família Plus Jakarta Sans equivalente. */
export function fontePorPeso(peso?: string | number | null): string {
  const n = peso === 'bold' ? 700 : peso === 'normal' || peso == null ? 400 : Number(peso);
  const pesos = Object.keys(JakartaFamilies).map(Number) as Peso[];
  const maisProximo = pesos.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a), 400 as Peso);
  return JakartaFamilies[maisProximo];
}

export const Fonts = Platform.select({
  ios: {
    sans: JakartaFamilies[400],
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: JakartaFamilies[400],
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: JakartaFamilies[400],
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Espaçamento em grade de 8 (com 4 e 2 só para ajustes finos). Prefira
 * `two`, `three`, `four` e `five`; evite somar ou subtrair (`three + 4`).
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Escala tipográfica. Texto corrido e rótulos usam só 14 / 16 / 18;
 * títulos têm escala própria. Marcas (logo) ficam fora da escala.
 */
export const FontSize = {
  small: 14,
  body: 16,
  large: 18,
  heading: 28,
  display: 40,
} as const;

export const LineHeight = {
  small: 20,
  body: 24,
  large: 26,
  heading: 34,
  display: 46,
} as const;

export const Radii = {
  small: 8,
  medium: 13,
  large: 22,
  extraLarge: 28,
  /** Cartões de destaque e janelas: cartão escuro do perfil, card do mapa, modais. */
  huge: 32,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
