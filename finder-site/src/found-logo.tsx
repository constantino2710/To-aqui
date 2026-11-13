import { useId } from 'react';

export function FoundMark({ size = 40 }: { size?: number }) {
  const gid = useId();
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3FA584" />
          <stop offset="1" stopColor="#6CC160" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="#1E2320" />
      <path d="M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8z" fill={`url(#${gid})`} />
      <rect x="18.5" y="14.5" width="11" height="11" rx="3" fill="#1E2320" />
      <rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill="#FFFFFF" />
    </svg>
  );
}

/** Símbolo + nome. O nome acompanha o tamanho do símbolo (logotipo, fora da escala de texto). */
export function FoundLogo({ size = 40 }: { size?: number }) {
  return (
    <div role="img" aria-label="Found" className="flex items-center" style={{ gap: size * 0.25 }}>
      {/* Contorno fino + sombra: no tema escuro o quadrado grafite se perderia no fundo. */}
      <span
        className="shrink-0 shadow-[0_8px_20px_-6px_hsl(var(--shadow))] ring-1 ring-border"
        style={{ borderRadius: size * (14 / 48), lineHeight: 0 }}>
        <FoundMark size={size} />
      </span>
      <span
        aria-hidden="true"
        className="font-extrabold tracking-[-0.05em]"
        style={{ fontSize: size * 0.62, lineHeight: `${size * 0.75}px` }}>
        found
      </span>
    </div>
  );
}
