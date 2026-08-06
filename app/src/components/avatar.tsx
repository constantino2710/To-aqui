import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export type AvatarProps = {
  /** Nome completo. As iniciais saem daqui. */
  nome: string;
  /** Usado só para escolher a cor de fundo, sempre a mesma para a mesma pessoa. */
  semente?: string;
  tamanho?: number;
};

// Paleta com contraste suficiente para texto branco por cima, nos dois temas.
const FUNDOS = [
  Palette.pink,
  Palette.purple500,
  Palette.purple700,
  Palette.blue,
  Palette.green,
  Palette.orange,
  Palette.red,
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corDe(texto: string): string {
  // Soma dos códigos: estável entre sessões e entre aparelhos, que é o que
  // importa — a mesma pessoa nunca troca de cor.
  let soma = 0;
  for (let i = 0; i < texto.length; i += 1) soma += texto.charCodeAt(i);
  return FUNDOS[soma % FUNDOS.length];
}

/**
 * Só iniciais, por enquanto: `profiles.avatar_path` existe no banco mas ainda não
 * há upload de imagem no app. Quando houver, é aqui que a foto entra.
 */
export function Avatar({ nome, semente, tamanho = 44 }: AvatarProps) {
  const fundo = corDe(semente ?? nome);

  return (
    <View
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: fundo },
      ]}>
      <ThemedText style={[styles.iniciais, { fontSize: tamanho * 0.36 }]}>
        {iniciais(nome)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: {
    color: Palette.white,
    fontWeight: '700',
  },
});
