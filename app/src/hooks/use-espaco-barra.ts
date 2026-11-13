import { createContext, useContext } from 'react';

/**
 * Altura que a barra de abas flutuante ocupa sobre a base da tela (barra +
 * margem inferior). Fora das abas vale 0. O `Screen` e o `Fab` usam para que o
 * conteúdo role até acima da barra em vez de ficar escondido atrás dela.
 */
export const EspacoBarraContext = createContext(0);

export function useEspacoBarra() {
  return useContext(EspacoBarraContext);
}
