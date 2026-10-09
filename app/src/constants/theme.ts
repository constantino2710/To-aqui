import { Platform } from 'react-native';

/**
 * Paleta-base denim sobre neutros levemente quentes. Verde é reservado para sucesso.
 * Os valores aqui espelham o contrato de tokens em `global.css` (variáveis HSL),
 * que também é usado pelo site em `finder-site/src/styles.css`. Mantenha os dois
 * lados em sincronia ao ajustar a identidade.
 */
export const Palette = {
  white: '#FFFFFF',
  ink: '#24262D',

  denim700: '#405078',
  denim500: '#6B7FB6',
  denim300: '#AFC1F5',

  // Verde semântico: confirmações, estado seguro e localização positiva.
  emerald700: '#2E7D5B',
  emerald500: '#10B981',
  emerald400: '#57C28D',

  gray700: '#6B6F79',
  gray300: '#A3A6AE',
  gray200: '#DEDCD7',
  gray100: '#F0EEEA',
  gray50: '#F7F5F2',

  night: '#111318',
  nightSoft: '#1A1D24',
  nightRaised: '#252933',
  nightBorder: '#30343E',

  rose: '#FB7185',
  orange: '#FB923C',
  blue: '#38BDF8',
  teal: '#14B8A6',
  amber: '#F59E0B',
  lime: '#84CC16',
  red: '#E5484D',

  charcoal: '#24262D',
  shadow: 'rgba(36, 38, 45, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.28)',
  overlay: 'rgba(10, 11, 14, 0.66)',
} as const;

/** Tokens semânticos consumidos pelos componentes. */
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.gray50,
    backgroundElement: '#FFFEFC',
    backgroundSelected: '#E9E7E3',
    textSecondary: Palette.gray700,
    brand: Palette.denim700,
    onBrand: Palette.white,
    danger: Palette.red,
    success: Palette.emerald700,
    border: Palette.gray200,
    shadow: Palette.shadow,
    overlay: Palette.overlay,
    accentPink: Palette.rose,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
  dark: {
    text: Palette.white,
    background: Palette.night,
    backgroundElement: Palette.nightSoft,
    backgroundSelected: Palette.nightRaised,
    textSecondary: Palette.gray300,
    brand: Palette.denim300,
    onBrand: Palette.night,
    danger: '#FF6B70',
    success: Palette.emerald400,
    border: Palette.nightBorder,
    shadow: Palette.shadowDark,
    overlay: Palette.overlay,
    accentPink: Palette.rose,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de avatar: multi-hue que harmoniza com o verde da marca. */
export const AvatarColors = [
  Palette.denim500,
  Palette.teal,
  Palette.emerald500,
  Palette.lime,
  Palette.amber,
  Palette.orange,
  Palette.rose,
] as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 8,
  medium: 11,
  large: 15,
  extraLarge: 20,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
