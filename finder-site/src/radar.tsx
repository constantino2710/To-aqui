import { useId } from 'react';

const PIN = 'M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8z';

/**
 * Ilustração do topo: um mapa estilizado com ondas de "raio de localização"
 * saindo do pin do Found. É decorativa (não mostra posição real) e espelha o
 * `LocationHero` do app. As ondas pulsam devagar; com "reduzir movimento" ficam
 * paradas (regra global em styles.css).
 */
export function Radar() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-secondary" aria-hidden="true">
      <svg viewBox="0 0 350 190" className="block h-auto w-full">
        <defs>
          <linearGradient id={`${id}pin`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3FA584" />
            <stop offset="1" stopColor="#6CC160" />
          </linearGradient>
          <radialGradient id={`${id}brilho`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#6CC160" stopOpacity="0.35" />
            <stop offset="1" stopColor="#6CC160" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ruas: traços na cor do fundo da página, como no mapa do app. */}
        <g className="stroke-background" strokeLinecap="round" fill="none">
          <path d="M-10 52 L360 34" strokeWidth={12} />
          <path d="M-10 156 L360 172" strokeWidth={12} />
          <path d="M78 -10 L104 200" strokeWidth={10} />
          <path d="M264 -10 L244 200" strokeWidth={10} />
          <path d="M-10 104 L360 98" strokeWidth={4} />
          <path d="M176 -10 L170 200" strokeWidth={4} />
        </g>

        {/* Brilho e ondas em volta do pin. */}
        <circle cx="175" cy="100" r="90" fill={`url(#${id}brilho)`} />
        {[34, 58, 82].map((r, i) => (
          <circle
            key={r}
            cx="175"
            cy="100"
            r={r}
            fill="none"
            className="animate-onda stroke-ring"
            strokeWidth={1.5}
            style={{ animationDelay: `${i * 0.6}s`, opacity: 0.55 - i * 0.15 }}
          />
        ))}

        {/* Pin do Found no centro (símbolo da marca). */}
        <g transform="translate(147 70) scale(1.17)">
          <rect width="48" height="48" rx="14" fill="#1E2320" />
          <path d={PIN} fill={`url(#${id}pin)`} />
          <rect x="18.5" y="14.5" width="11" height="11" rx="3" fill="#1E2320" />
          <rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Selo na base, como no mapa do app. */}
      <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-card-foreground shadow-[0_4px_14px_rgb(0_0_0/0.12)]">
        <span className="size-2 rounded-full bg-[#6CC160]" />
        Localização só com o seu sim
      </span>
    </div>
  );
}
