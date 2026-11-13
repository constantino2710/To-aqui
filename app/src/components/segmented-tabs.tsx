import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Motion } from '@/constants/motion';
import { FontSize, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useMovimentoReduzido } from '@/hooks/use-movimento-reduzido';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedTabsOpcao<T extends string> = {
  chave: T;
  rotulo: string;
  icone: NomeIcone;
};

export type SegmentedTabsProps<T extends string> = {
  opcoes: readonly SegmentedTabsOpcao<T>[];
  valor: T;
  onChange: (chave: T) => void;
};

/**
 * Seletor de seções em pílula: faixa cinza com um destaque branco que desliza
 * até a opção escolhida (ícone na cor da marca). Usado para Membros / QR Codes.
 */
export function SegmentedTabs<T extends string>({ opcoes, valor, onChange }: SegmentedTabsProps<T>) {
  const theme = useTheme();
  const reduzido = useMovimentoReduzido();
  const indice = Math.max(
    opcoes.findIndex((opcao) => opcao.chave === valor),
    0,
  );
  const [largura, setLargura] = useState(0);
  const [pos] = useState(() => new Animated.Value(indice));

  useEffect(() => {
    if (reduzido) {
      pos.setValue(indice);
      return;
    }
    const animacao = Animated.timing(pos, {
      toValue: indice,
      duration: Motion.base,
      easing: Motion.suave,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacao.start();
    return () => animacao.stop();
  }, [indice, reduzido, pos]);

  const larguraOpcao = Math.max((largura - Spacing.one * 2) / opcoes.length, 0);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      style={[styles.faixa, { backgroundColor: theme.border }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.destaque,
          {
            width: larguraOpcao,
            backgroundColor: theme.backgroundElement,
            boxShadow: `0 2px 8px ${theme.shadow}`,
            transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, larguraOpcao] }) }],
          },
        ]}
      />
      {opcoes.map((opcao) => {
        const ativa = opcao.chave === valor;
        return (
          <Pressable
            key={opcao.chave}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            onPress={() => onChange(opcao.chave)}
            style={styles.opcao}>
            <Icone nome={opcao.icone} tamanho={18} cor={ativa ? theme.brand : theme.textSecondary} />
            <ThemedText
              style={[
                styles.rotulo,
                { color: ativa ? theme.text : theme.textSecondary, fontWeight: ativa ? 700 : 600 },
              ]}>
              {opcao.rotulo}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radii.pill,
  },
  destaque: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    height: 48,
    borderRadius: Radii.pill,
  },
  opcao: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  rotulo: {
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
  },
});
