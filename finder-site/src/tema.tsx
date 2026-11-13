import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Tema = 'light' | 'dark';
const CHAVE = 'found-tema';

/** Tema em vigor: a classe já aplicada pelo script do <head> ou o do sistema. */
function temaAtual(): Tema {
  const raiz = document.documentElement;
  if (raiz.classList.contains('dark')) return 'dark';
  if (raiz.classList.contains('light')) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Alterna claro/escuro. Sem escolha salva, o site segue o sistema; depois de
 * trocar, a escolha fica neste navegador (localStorage, que pode estar
 * bloqueado: nesse caso a troca vale só até recarregar).
 */
export function BotaoTema() {
  const [tema, setTema] = useState<Tema>(temaAtual);
  const proximo: Tema = tema === 'dark' ? 'light' : 'dark';

  function alternar() {
    const raiz = document.documentElement;
    raiz.classList.remove('light', 'dark');
    raiz.classList.add(proximo);
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // Armazenamento indisponível (aba anônima, bloqueio): segue sem lembrar.
    }
    setTema(proximo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={proximo === 'dark' ? 'Usar tema escuro' : 'Usar tema claro'}
      title={proximo === 'dark' ? 'Tema escuro' : 'Tema claro'}
      className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-border bg-card text-card-foreground transition-transform duration-[160ms] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      {tema === 'dark' ? <Sun className="size-5" strokeWidth={1.8} /> : <Moon className="size-5" strokeWidth={1.8} />}
    </button>
  );
}
