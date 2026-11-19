import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { FundoCartao } from '@/components/card';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { FontSize, JakartaFamilies, LineHeight, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const LIMITE_OBSERVACAO = 300;

// No navegador, o <textarea> ganha anel de foco próprio por dentro da caixa.
const semAnelDoNavegador = (Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}) as TextStyle;

export type CampoObservacaoProps = {
  value: string;
  onChangeText: (texto: string) => void;
};

/**
 * Observação do QR que aparece no site para quem escaneia ("Sobre quem você
 * encontrou"). Mesmo visual do `IconField` sobre cartão (degradê de campo,
 * rótulo dentro, borda verde no foco), mas com várias linhas: por isso cantos
 * de 22 em vez de pílula. O aviso abaixo lembra que o texto é público.
 */
export function CampoObservacao({ value, onChangeText }: CampoObservacaoProps) {
  const theme = useTheme();
  const [focado, setFocado] = useState(false);
  const [input, setInput] = useState<TextInput | null>(null);
  const corDestaque = focado ? theme.brand : theme.textSecondary;

  return (
    <View style={styles.grupo}>
      <Pressable onPress={() => input?.focus()} accessible={false}>
        <View
          style={[
            styles.caixa,
            { backgroundColor: theme.background, borderColor: focado ? `${theme.brand}80` : 'transparent' },
          ]}>
          <View style={styles.fundo} pointerEvents="none">
            <FundoCartao de={theme.fieldGradientFrom} para={theme.fieldGradientTo} />
          </View>
          <View style={styles.cabecalho}>
            <Icone nome="info" tamanho={20} cor={corDestaque} />
            <ThemedText style={[styles.rotulo, { color: corDestaque }]}>Observação para quem encontrar (opcional)</ThemedText>
          </View>
          <TextInput
            ref={setInput}
            value={value}
            onChangeText={onChangeText}
            maxLength={LIMITE_OBSERVACAO}
            multiline
            textAlignVertical="top"
            placeholder="Ex.: É autista. Fale baixo e não toque sem avisar."
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Observação para quem encontrar"
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            style={[styles.input, semAnelDoNavegador, { color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.contador}>
            {value.length}/{LIMITE_OBSERVACAO}
          </ThemedText>
        </View>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary" style={styles.ajuda}>
        Aparece no site, em “Sobre quem você encontrou”, para quem escanear o QR. Não coloque nome completo,
        endereço nem telefone.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: Spacing.two },
  caixa: {
    minHeight: 136,
    borderRadius: Radii.large,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // Absoluto atrás do conteúdo; o resto da caixa fica em `relative` acima dele (web).
  fundo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, position: 'relative', zIndex: 1 },
  rotulo: {
    flex: 1,
    fontSize: FontSize.small,
    lineHeight: LineHeight.small,
    fontFamily: JakartaFamilies[600],
  },
  input: {
    position: 'relative',
    zIndex: 1,
    minHeight: LineHeight.body * 3,
    fontFamily: JakartaFamilies[400],
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    padding: 0,
  },
  contador: { alignSelf: 'flex-end', position: 'relative', zIndex: 1 },
  ajuda: { paddingHorizontal: Spacing.two },
});
