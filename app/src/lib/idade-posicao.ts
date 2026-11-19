import { tempoRelativo } from '@/lib/tempo-relativo';

/**
 * Até quanto tempo uma posição ainda conta como "ao vivo". O site manda uma a
 * cada poucos segundos enquanto a página está aberta; 30 s sem nada quer dizer
 * que a tela foi bloqueada, o GPS travou ou a internet caiu.
 */
export const LIMITE_AO_VIVO_MS = 30_000;

/**
 * Idade de uma posição, para o app nunca apresentar como ao vivo um ponto
 * velho. Um pin desatualizado que se anuncia é útil; um que mente manda a
 * família para o lugar errado.
 */
export function idadePosicao(iso: string, agora: number) {
  const ms = Math.max(0, agora - new Date(iso).getTime());
  const segundos = Math.round(ms / 1000);
  const ha = segundos < 60 ? `há ${Math.max(segundos, 1)} s` : tempoRelativo(iso, agora);
  return { aoVivo: ms < LIMITE_AO_VIVO_MS, ha };
}
