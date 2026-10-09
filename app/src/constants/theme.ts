import { Platform } from 'react-native';

/**
 * Paleta-base Emerald. Mudanças de identidade visual começam neste único objeto.
 * Os valores aqui espelham o contrato de tokens em `global.css` (variáveis HSL),
 * que também é usado pelo site em `finder-site/src/styles.css`. Mantenha os dois
 * lados em sincronia ao ajustar a identidade.
 */
export const Palette = {
  white: '#FFFFFF',
  ink: '#10281F',

  emerald700: '#047857',
  emerald600: '#059669',
  emerald500: '#10B981',
  emerald400: '#34D399',
  emerald200: '#A7F3D0',
  emerald100: '#D1FAE5',
  mint50: '#F0FDF4',

  gray700: '#56766A',
  gray300: '#9AB6A8',
  gray200: '#D9E8E0',

  forest: '#0B1F17',
  forestSoft: '#122B21',
  forestRaised: '#1E3E32',

  rose: '#FB7185',
  orange: '#FB923C',
  blue: '#38BDF8',
  teal: '#14B8A6',
  amber: '#F59E0B',
  lime: '#84CC16',
  red: '#E5484D',

  charcoal: '#10281F',
  shadow: 'rgba(6, 78, 59, 0.16)',
  shadowDark: 'rgba(0, 0, 0, 0.42)',
  overlay: 'rgba(6, 24, 18, 0.55)',
} as const;

/** Tokens semânticos consumidos pelos componentes. */
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.mint50,
    backgroundElement: Palette.white,
    backgroundSelected: Palette.emerald100,
    textSecondary: Palette.gray700,
    brand: Palette.emerald700,
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
    background: Palette.forest,
    backgroundElement: Palette.forestSoft,
    backgroundSelected: Palette.forestRaised,
    textSecondary: Palette.gray300,
    brand: Palette.emerald400,
    onBrand: Palette.forest,
    danger: '#FF6B70',
    success: Palette.emerald400,
    border: Palette.forestRaised,
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
  Palette.emerald500,
  Palette.teal,
  Palette.blue,
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
  small: 10,
  medium: 14,
  large: 18,
  extraLarge: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
