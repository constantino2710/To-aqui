import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { Toggle } from '@/components/toggle';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  desligarMinhaLocalizacao,
  esquecerMinhaLocalizacao,
  ligarMinhaLocalizacao,
  useMinhaLocalizacao,
} from '@/lib/minha-localizacao';

export type BotaoMinhaLocalizacaoProps = {
  sessaoId: string;
  /** Com o atendimento encerrado, o envio para sozinho. */
  ativa: boolean;
};

/**
 * Linha com interruptor que liga e desliga a posição ao vivo da família para
 * quem encontrou o QR. Uma linha só, em vez de mais um botão empilhado:
 * ligado, a posição vai ao vivo; desligado, some do mapa de quem encontrou.
 */
export function BotaoMinhaLocalizacao({ sessaoId, ativa }: BotaoMinhaLocalizacaoProps) {
  const theme = useTheme();
  const { notificar } = useToast();
  const { compartilhando, ligando } = useMinhaLocalizacao(sessaoId);
  const [parando, setParando] = useState(false);

  useEffect(() => {
    if (!ativa) esquecerMinhaLocalizacao(sessaoId);
  }, [ativa, sessaoId]);

  async function ligar() {
    const resultado = await ligarMinhaLocalizacao(sessaoId);
    if (resultado === 'sem-permissao') {
      notificar({
        titulo: 'Localização não permitida',
        mensagem: 'Autorize a localização para que a pessoa que encontrou o QR possa ver onde você está.',
        tom: 'aviso',
      });
    } else if (resultado === 'erro') {
      notificar({ titulo: 'Não foi possível compartilhar', mensagem: 'Verifique o GPS e a conexão e tente de novo.', tom: 'erro' });
    }
  }

  async function parar() {
    setParando(true);
    const ok = await desligarMinhaLocalizacao(sessaoId);
    setParando(false);
    if (!ok) {
      notificar({ titulo: 'Envio parado', mensagem: 'Não foi possível apagar sua última posição. Tente de novo.', tom: 'aviso' });
    }
  }

  if (!ativa) return null;

  const ocupado = ligando || parando;
  const ligado = compartilhando || ligando;

  return (
    <View style={[styles.linha, { backgroundColor: ligado ? theme.brandSoft : theme.backgroundSelected }]}>
      <View style={[styles.icone, { backgroundColor: theme.backgroundElement }]}>
        <Icone nome="navigation" tamanho={20} cor={ligado ? theme.brand : theme.textSecondary} />
      </View>
      <View style={styles.textos}>
        <ThemedText type="smallBold">Compartilhar minha localização</ThemedText>
        <ThemedText type="small" themeColor={ligado ? 'brand' : 'textSecondary'}>
          {ligando ? 'Ligando…' : compartilhando ? 'Enviando ao vivo para quem encontrou' : 'Quem encontrou vê você chegando'}
        </ThemedText>
      </View>
      {ocupado ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <Toggle
          value={compartilhando}
          onValueChange={(valor) => void (valor ? ligar() : parar())}
          accessibilityLabel="Compartilhar minha localização com quem encontrou"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Radii.pill,
  },
  icone: { width: 48, height: 48, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
});
