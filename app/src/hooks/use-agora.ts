import { useEffect, useState } from 'react';

/** Relógio que re-renderiza a tela a cada `intervaloMs`, para textos como "há 40 s". */
export function useAgora(intervaloMs = 5_000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(timer);
  }, [intervaloMs]);
  return agora;
}
