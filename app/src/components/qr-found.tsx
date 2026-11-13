import { buildQR, type QRGeometry } from '@ttsalpha/qrcode/core';
import { useId, useMemo } from 'react';
import { Platform } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { PIN } from '@/components/found-logo';
import { JakartaFamilies, Palette } from '@/constants/theme';

/** O que o ref do Svg oferece para exportar a imagem (PNG em base64). */
export type QrExportavel = {
  toDataURL: (callback: (base64: string) => void, options?: { width?: number; height?: number }) => void;
};

export type QrFoundProps = {
  /** Conteúdo codificado (o link da página do QR). */
  valor: string;
  /** Lado do QR em px. */
  tamanho: number;
  /**
   * Com `moldura`, o QR vira um "adesivo" pronto para imprimir: cartão branco
   * com o nome embaixo, a instrução e a marca. Usado na imagem baixada.
   */
  moldura?: { nome: string };
  /** Recebe o Svg para exportar com `toDataURL`. */
  svgRef?: (svg: QrExportavel | null) => void;
  accessibilityLabel?: string;
};

// Proporções da moldura, em unidades do QR (o QR ocupa `LADO` unidades).
const LADO = 280;
const RESPIRO = 30;
const RODAPE = 128;

// Fonte do texto da moldura. Na web, a imagem exportada é um SVG solto, sem as
// fontes carregadas na página: a lista dá uma reserva parecida.
const fonte = (peso: 700 | 800) =>
  Platform.OS === 'web'
    ? `${JakartaFamilies[peso]}, 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif`
    : JakartaFamilies[peso];

function geometria(valor: string): QRGeometry | null {
  try {
    return buildQR({
      value: valor,
      size: LADO,
      margin: 0,
      // Pontos vizinhos se fundem em formas arredondadas: mais limpo que bolinhas soltas.
      dotStyle: 'rounded',
      dotColor: Palette.graphite,
      backgroundColor: Palette.white,
      corner: { square: { style: 'extra-rounded' }, dot: { style: 'rounded' } },
      // Área reservada para o pin, desenhado aqui mesmo (vetorial, nítido em
      // qualquer tamanho). A biblioteca sobe a correção de erro para caber.
      logo: { custom: true, size: 0.5, margin: 1, hideDots: true, radius: 0.3 },
    });
  } catch {
    return null;
  }
}

/**
 * QR Code com a identidade do Found: pontos arredondados em grafite, os três
 * cantos de leitura em degradê grafite → verde (escuros o bastante para
 * qualquer leitor) e o símbolo Pin-QR no centro.
 */
export function QrFound({ valor, tamanho, moldura, svgRef, accessibilityLabel }: QrFoundProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const geo = useMemo(() => geometria(valor), [valor]);
  if (!geo) return null;

  const vb = geo.viewBox;
  const escala = LADO / vb;
  const logo = geo.logo;

  const qr = (
    <G>
      <Defs>
        <LinearGradient id={`${id}canto`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Palette.graphite} />
          <Stop offset="1" stopColor={Palette.sage700} />
        </LinearGradient>
        <LinearGradient id={`${id}pin`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Palette.sage500} />
          <Stop offset="1" stopColor={Palette.sage400} />
        </LinearGradient>
      </Defs>
      <G transform={`scale(${escala})`}>
        {geo.modules && <Path d={geo.modules.d} fill={Palette.graphite} />}
        {geo.finders.map((f, i) => (
          <G key={i}>
            <Path d={f.square.d} fill={`url(#${id}canto)`} fillRule="evenodd" />
            <Path d={f.dot.d} fill={Palette.sage700} />
          </G>
        ))}
        {/* Área limpa em volta do pin. */}
        {geo.clear && (
          <Rect x={geo.clear.x} y={geo.clear.y} width={geo.clear.width} height={geo.clear.height} fill={Palette.white} />
        )}
        {logo && (
          <G transform={`translate(${logo.x} ${logo.y}) scale(${logo.width / 48})`}>
            <Rect width="48" height="48" rx="14" fill={Palette.graphite} />
            <Path d={PIN} fill={`url(#${id}pin)`} />
            <Rect x="18.5" y="14.5" width="11" height="11" rx="3" fill={Palette.graphite} />
            <Rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill={Palette.white} />
          </G>
        )}
      </G>
    </G>
  );

  if (!moldura) {
    return (
      <Svg
        ref={svgRef as never}
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${LADO} ${LADO}`}
        accessibilityLabel={accessibilityLabel}>
        {qr}
      </Svg>
    );
  }

  // Adesivo: cartão branco com o QR em cima e a identificação embaixo.
  const largura = LADO + RESPIRO * 2;
  const altura = LADO + RESPIRO + RODAPE;
  const centro = largura / 2;
  const base = RESPIRO + LADO;

  return (
    <Svg
      ref={svgRef as never}
      width={tamanho}
      height={(tamanho * altura) / largura}
      viewBox={`0 0 ${largura} ${altura}`}
      accessibilityLabel={accessibilityLabel}>
      <Rect width={largura} height={altura} rx="32" fill={Palette.white} />
      <G transform={`translate(${RESPIRO} ${RESPIRO})`}>{qr}</G>
      <SvgText x={centro} y={base + 46} textAnchor="middle" fontSize="28" fontWeight="800" fontFamily={fonte(800)} fill={Palette.graphite}>
        {moldura.nome}
      </SvgText>
      <SvgText x={centro} y={base + 72} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily={fonte(700)} fill={Palette.gray700}>
        Se encontrar, escaneie para avisar a família
      </SvgText>
      {/* Marca no rodapé: pin + "found". */}
      <G transform={`translate(${centro - 38} ${base + 88})`}>
        <G transform="scale(0.5)">
          <Rect width="48" height="48" rx="14" fill={Palette.graphite} />
          <Path d={PIN} fill={`url(#${id}pin)`} />
          <Rect x="19" y="15" width="10" height="10" rx="2.5" fill={Palette.graphite} />
        </G>
        <SvgText x="32" y="18" fontSize="18" fontWeight="800" fontFamily={fonte(800)} fill={Palette.graphite}>
          found
        </SvgText>
      </G>
    </Svg>
  );
}
