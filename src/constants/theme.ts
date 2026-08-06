import '@/global.css';

import { Platform } from 'react-native';

/** Paleta-base: mudanças de identidade visual começam neste único objeto. */
export const Palette = {
  white: '#FFFFFF',
  ink: '#211F2D',
  purple700: '#5625D8',
  purple600: '#6732EE',
  purple500: '#7B4DFF',
  purple200: '#D9CCFF',
  purple100: '#EEE8FF',
  lavender50: '#F7F4FF',
  gray700: '#5F5B6B',
  gray300: '#D9D4E3',
  gray200: '#EAE6F2',
  charcoal: '#17151F',
  charcoalSoft: '#24212E',
  charcoalRaised: '#302C3C',
  pink: '#FF79B0',
  orange: '#FF9559',
  blue: '#69B7FF',
  green: '#31B978',
  red: '#E5484D',
  shadow: 'rgba(54, 28, 117, 0.18)',
  shadowDark: 'rgba(0, 0, 0, 0.42)',
  overlay: 'rgba(23, 21, 31, 0.52)',
} as const;

/** Tokens semânticos consumidos pelos componentes. */
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.lavender50,
    backgroundElement: Palette.white,
    backgroundSelected: Palette.purple100,
    textSecondary: Palette.gray700,
    brand: Palette.purple600,
    onBrand: Palette.white,
    danger: Palette.red,
    success: Palette.green,
    border: Palette.gray200,
    shadow: Palette.shadow,
    overlay: Palette.overlay,
    accentPink: Palette.pink,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
  dark: {
    text: Palette.white,
    background: Palette.charcoal,
    backgroundElement: Palette.charcoalSoft,
    backgroundSelected: Palette.charcoalRaised,
    textSecondary: Palette.gray300,
    brand: Palette.purple500,
    onBrand: Palette.white,
    danger: '#FF6B70',
    success: '#42D08A',
    border: Palette.charcoalRaised,
    shadow: Palette.shadowDark,
    overlay: Palette.overlay,
    accentPink: Palette.pink,
    accentOrange: Palette.orange,
    accentBlue: Palette.blue,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
