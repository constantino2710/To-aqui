import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * `true` quando o usuário pediu "reduzir movimento" no sistema (no navegador,
 * `prefers-reduced-motion`). Quem anima deve pular a animação nesse caso.
 */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => vivo && setReduzido(valor));
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzido);
    return () => {
      vivo = false;
      assinatura.remove();
    };
  }, []);

  return reduzido;
}
