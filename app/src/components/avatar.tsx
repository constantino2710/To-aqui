import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AvatarTints, JakartaFamilies } from '@/constants/theme';
import { useThemePreference } from '@/lib/theme-preference';

export type AvatarProps = {
  /** Nome completo. As iniciais saem daqui. */
  nome: string;
  /** Usado só para escolher a cor, sempre a mesma para a mesma pessoa. */
  semente?: string;
  tamanho?: number;
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function indiceDe(texto: string, total: number): number {
  // Soma dos códigos: estável entre sessões e entre aparelhos, que é o que
  // importa — a mesma pessoa nunca troca de cor.
  let soma = 0;
  for (let i = 0; i < texto.length; i += 1) soma += texto.charCodeAt(i);
  return soma % total;
}

/**
 * Só iniciais, por enquanto: `profiles.avatar_path` existe no banco mas ainda não
 * há upload de imagem no app. Quando houver, é aqui que a foto entra.
 * Visual: fundo suave e iniciais na mesma matiz (ver `AvatarTints`).
 */
export function Avatar({ nome, semente, tamanho = 48 }: AvatarProps) {
  const { mode } = useThemePreference();
  const tons = AvatarTints[mode];
  const tom = tons[indiceDe(semente ?? nome, tons.length)];

  return (
    <View
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: tom.bg },
      ]}>
      <ThemedText
        style={[
          styles.iniciais,
          { color: tom.fg, fontSize: Math.round(tamanho * 0.34), lineHeight: Math.round(tamanho * 0.42) },
        ]}>
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
    fontFamily: JakartaFamilies[700],
    fontWeight: 'normal',
  },
});
