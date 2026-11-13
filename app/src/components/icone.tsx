import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type NomeFeather = ComponentProps<typeof Feather>['name'];

/**
 * Ícones do Found: família **Feather** (traço de 2 px, pontas redondas — a
 * mesma do Lucide usado no site) + os desenhados aqui no mesmo estilo, para o
 * que o Feather não tem (`qr-code`). Use sempre este componente, nunca um set
 * de ícones direto, para o app manter um traço só.
 */
export type NomeIcone = NomeFeather | 'qr-code';

export type IconeProps = {
  nome: NomeIcone;
  tamanho: number;
  cor: string;
  estilo?: StyleProp<ViewStyle & TextStyle>;
};

export function Icone({ nome, tamanho, cor, estilo }: IconeProps) {
  if (nome === 'qr-code') return <IconeQr tamanho={tamanho} cor={cor} estilo={estilo as StyleProp<ViewStyle>} />;
  return <Feather name={nome} size={tamanho} color={cor} style={estilo as StyleProp<TextStyle>} />;
}

/** QR Code no traço do Feather: três "olhos" arredondados e alguns módulos. */
function IconeQr({ tamanho, cor, estilo }: { tamanho: number; cor: string; estilo?: StyleProp<ViewStyle> }) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={estilo}>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" />
      <Path d="M14 14h3v3M21 14v.01M14 21h.01M17.5 21H21v-3.5" />
    </Svg>
  );
}
