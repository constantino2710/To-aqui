import { Platform } from 'react-native';

// Lembra se a última interação foi com mouse/toque ou com teclado (só na web).
let ultimaFoiPonteiro = true;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { ultimaFoiPonteiro = true; }, true);
  window.addEventListener('keydown', () => { ultimaFoiPonteiro = false; }, true);
}

/**
 * Ao fechar uma janela, o navegador devolve o foco ao elemento que a abriu e
 * desenha o anel de foco nele. Para quem navega pelo teclado isso é útil (sabe
 * onde está); para quem usou mouse/toque é só um contorno estranho. Esta função
 * solta esse foco devolvido apenas no segundo caso.
 */
export function soltarFocoDevolvido() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !ultimaFoiPonteiro) return;
  // O foco é devolvido logo depois de a janela desmontar; espera esse momento.
  setTimeout(() => {
    const ativo = document.activeElement as HTMLElement | null;
    if (ativo && ativo !== document.body) ativo.blur();
  }, 0);
}
