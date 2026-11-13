import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, fontePorPeso, FontSize, LineHeight, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'large' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const composto: TextStyle = StyleSheet.flatten([
    { color: theme[themeColor ?? 'text'] },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'large' && styles.large,
    type === 'subtitle' && styles.subtitle,
    type === 'link' && styles.link,
    type === 'linkPrimary' && [styles.linkPrimary, { color: theme.brand }],
    type === 'code' && styles.code,
    style,
  ]);

  // Cada peso da Plus Jakarta Sans é uma família separada. Trocamos o peso pela
  // família certa e zeramos o fontWeight para o navegador não engrossar de novo.
  const fonte =
    type === 'code' || composto.fontFamily
      ? composto
      : { ...composto, fontFamily: fontePorPeso(composto.fontWeight), fontWeight: 'normal' as const };

  return <Text style={fonte} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontWeight: 700,
  },
  default: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: 500,
  },
  large: {
    fontSize: FontSize.large,
    lineHeight: LineHeight.large,
    fontWeight: 600,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: 700,
    lineHeight: LineHeight.display,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontSize: FontSize.heading,
    lineHeight: LineHeight.heading,
    fontWeight: 700,
    letterSpacing: -0.8,
  },
  link: {
    lineHeight: 30,
    fontSize: FontSize.small,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: FontSize.small,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: FontSize.small,
  },
});
