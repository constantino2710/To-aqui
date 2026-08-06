import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export type EstadoAsync<T> = {
  dados: T | null;
  carregando: boolean;
  atualizando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/**
 * Carrega dados quando a tela ganha foco, e não apenas na montagem.
 *
 * A diferença importa neste app: as abas ficam montadas em segundo plano, então
 * aceitar um amigo em Comunidade e voltar para Início mostraria a lista velha se
 * o carregamento acontecesse só uma vez. Recarregar no foco é o que mantém as
 * três abas contando a mesma história.
 */
export function useDadosAsync<T>(carregar: () => Promise<T>): EstadoAsync<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A função de carregar costuma ser recriada a cada render. Guardar numa ref
  // evita que isso vire um laço de recarregamento infinito.
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const executar = useCallback(async (puxouParaAtualizar: boolean) => {
    if (puxouParaAtualizar) setAtualizando(true);
    setErro(null);

    try {
      setDados(await carregarRef.current());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar agora.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void executar(false);
    }, [executar])
  );

  return {
    dados,
    carregando,
    atualizando,
    erro,
    recarregar: useCallback(() => void executar(true), [executar]),
  };
}
