import { Colors, Palette } from '@/constants/theme';

/**
 * Mapa no padrão visual do Found, gerado como um documento HTML com Leaflet.
 * O mesmo documento roda na WebView (celular) e num <iframe srcdoc> (web), então
 * os dois ficam idênticos.
 *
 * Estética: mapa em tons neutros puxados para o verde-acinzentado da paleta
 * Sálvia (filtro sobre os tiles), pin do Found com ondas de localização,
 * marcador grafite para "você", linha tracejada verde entre os dois, etiquetas
 * em pílula com Plus Jakarta Sans e controles discretos.
 */

export type PontoMapa = {
  lat: number;
  lng: number;
  /** `encontrado`: quem achou o QR (pin do Found). `pessoa`: você/responsável. */
  tipo: 'encontrado' | 'pessoa';
  rotulo: string;
};

export type OpcoesMapa = {
  pontos: PontoMapa[];
  modo: 'light' | 'dark';
  /** Selo flutuante no canto (ex.: "Atualizada há 2 min"). */
  selo?: string;
  /** Mostra os botões de zoom (mapas maiores). */
  zoom?: boolean;
};

/**
 * Tiles: OpenStreetMap padrão, que não exige chave (a CARTO passou a exigir).
 * Para produção, vale um provedor com chave (Stadia, MapTiler...): basta
 * definir EXPO_PUBLIC_MAP_TILES_URL com o modelo {z}/{x}/{y} e a atribuição.
 */
const URL_TILES = process.env.EXPO_PUBLIC_MAP_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO =
  process.env.EXPO_PUBLIC_MAP_TILES_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * O visual do Found vem de filtros sobre o mapa colorido padrão: tons de cinza
 * e um leve tom sálvia no claro; no escuro, invertido (ruas claras sobre fundo
 * escuro) com o mesmo tom. Mesmos valores no site (finder-site/src/styles.css).
 */
const FILTRO_CLARO = 'grayscale(1) sepia(0.18) hue-rotate(80deg) saturate(1.3) brightness(1.04) contrast(0.92)';
const FILTRO_ESCURO = 'grayscale(1) invert(1) sepia(0.25) hue-rotate(95deg) saturate(1.3) brightness(0.82) contrast(0.88)';

const PIN = 'M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8z';

// Símbolo do Found em SVG, para o marcador de quem achou o QR.
const MARCA_SVG = `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${Palette.sage500}"/><stop offset="1" stop-color="${Palette.sage400}"/></linearGradient></defs><rect width="48" height="48" rx="14" fill="${Palette.graphite}"/><path d="${PIN}" fill="url(#g)"/><rect x="18.5" y="14.5" width="11" height="11" rx="3" fill="${Palette.graphite}"/><rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill="#FFFFFF"/></svg>`;

// Ícone de pessoa (traço, no estilo Feather) para o marcador "você".
const PESSOA_SVG = (cor: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/** Evita que um rótulo com aspas/ângulos quebre o HTML gerado. */
const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export function mapaFoundHtml({ pontos, modo, selo, zoom = false }: OpcoesMapa): string {
  const c = Colors[modo];
  const escuro = modo === 'dark';
  const tiles = URL_TILES;
  const filtro = escuro ? FILTRO_ESCURO : FILTRO_CLARO;
  // Marcador "você": grafite no claro, claro no escuro (como o botão de ação).
  const pessoaFundo = c.action;
  const pessoaIcone = c.onAction;

  const dados = JSON.stringify(
    pontos.map((p) => ({ lat: p.lat, lng: p.lng, tipo: p.tipo, rotulo: escapar(p.rotulo) })),
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap" />
<style>
  html, body, #map { width: 100%; height: 100%; margin: 0; background: ${c.background}; }
  body { overflow: hidden; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; }
  .leaflet-container { font-family: inherit; background: ${c.background}; }
  .leaflet-tile-pane { filter: ${filtro}; }

  /* Pin do Found com ondas de localização. */
  .found-alvo { position: relative; width: 44px; height: 44px; }
  .found-alvo svg { position: relative; z-index: 1; display: block; border-radius: 13px;
    box-shadow: 0 0 0 3px ${c.backgroundElement}, 0 6px 14px rgba(0,0,0,.28); }
  .found-onda { position: absolute; inset: -14px; border-radius: 50%; border: 2px solid ${Palette.sage500}; background: ${Palette.sage500}22; animation: onda 2.8s ease-out infinite; }
  .found-onda.d2 { animation-delay: 1.4s; }
  @keyframes onda { from { transform: scale(.55); opacity: .9; } to { transform: scale(1.6); opacity: 0; } }

  /* Marcador "você": círculo com anel na cor do cartão. */
  .found-pessoa { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%;
    background: ${pessoaFundo}; border: 3px solid ${c.backgroundElement}; box-sizing: border-box;
    box-shadow: 0 6px 14px rgba(0,0,0,.25); }

  /* Etiquetas em pílula. */
  .leaflet-tooltip.found-etiqueta { border: 0; border-radius: 999px; padding: 4px 12px; background: ${c.backgroundElement};
    color: ${c.text}; font-weight: 700; font-size: 12px; line-height: 18px; box-shadow: 0 4px 14px rgba(0,0,0,.16); }
  .leaflet-tooltip-top.found-etiqueta::before { border-top-color: ${c.backgroundElement}; }

  /* Selo flutuante no canto. */
  #selo { position: absolute; top: 12px; left: 12px; z-index: 500; display: none; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 999px; background: ${c.backgroundElement}; color: ${c.text};
    font-size: 12px; font-weight: 700; box-shadow: 0 4px 14px rgba(0,0,0,.16); }
  #selo i { width: 8px; height: 8px; border-radius: 50%; background: ${Palette.sage400}; animation: pisca 2s ease-in-out infinite; }
  @keyframes pisca { 50% { opacity: .35; } }

  /* Controles discretos, em pílula. */
  .leaflet-control-attribution { margin: 0 8px 8px 0 !important; border-radius: 999px; padding: 1px 8px !important;
    background: ${escuro ? 'rgba(18,22,20,.72)' : 'rgba(255,255,255,.78)'} !important; color: ${c.textSecondary}; font-size: 9px; }
  .leaflet-control-attribution a { color: inherit; }
  .leaflet-bar { border: 0 !important; border-radius: 999px !important; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,.16) !important; }
  .leaflet-bar a { width: 36px !important; height: 36px !important; line-height: 36px !important; border: 0 !important;
    background: ${c.backgroundElement} !important; color: ${c.text} !important; font-weight: 600; }
  .leaflet-control-zoom { margin: 12px 12px 0 0 !important; }

  #falha { position: fixed; inset: 0; z-index: 900; display: none; place-items: center; padding: 24px;
    color: ${c.textSecondary}; background: ${c.background}; text-align: center; font-size: 14px; }
  #falha.visivel { display: grid; }
  @media (prefers-reduced-motion: reduce) { .found-onda, #selo i { animation: none; } }
</style>
</head>
<body>
<div id="map" role="img" aria-label="Mapa das localizações"></div>
<div id="selo"><i></i><span></span></div>
<div id="falha">Não foi possível carregar o mapa. Use “Abrir mapa” logo abaixo.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(() => {
  const falha = document.getElementById('falha');
  if (!window.L) { falha.classList.add('visivel'); return; }
  const pontos = ${dados};
  const selo = ${JSON.stringify(selo ? escapar(selo) : '')};
  if (selo) { const s = document.getElementById('selo'); s.querySelector('span').innerHTML = selo; s.style.display = 'flex'; }

  const mapa = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: false }).setView([pontos[0].lat, pontos[0].lng], 16);
  ${zoom ? "L.control.zoom({ position: 'topright' }).addTo(mapa);" : ''}
  mapa.attributionControl.setPrefix(false);

  const camada = L.tileLayer('${tiles}', {
    attribution: ${JSON.stringify(ATRIBUICAO)},
    maxZoom: 19,
  });
  let erros = 0;
  camada.on('tileerror', () => { erros += 1; if (erros >= 6) falha.classList.add('visivel'); });
  camada.addTo(mapa);

  const icones = {
    encontrado: L.divIcon({ className: '', iconSize: [44, 44], iconAnchor: [22, 22],
      html: '<div class="found-alvo"><span class="found-onda"></span><span class="found-onda d2"></span>${MARCA_SVG.replace(/'/g, "\\'")}</div>' }),
    pessoa: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      html: '<div class="found-pessoa">${PESSOA_SVG(pessoaIcone).replace(/'/g, "\\'")}</div>' }),
  };

  pontos.forEach((p) => {
    L.marker([p.lat, p.lng], { icon: icones[p.tipo], keyboard: false })
      .addTo(mapa)
      .bindTooltip(p.rotulo, { permanent: true, direction: 'top', offset: [0, p.tipo === 'encontrado' ? -26 : -20], className: 'found-etiqueta' });
  });

  if (pontos.length > 1) {
    const linha = pontos.map((p) => [p.lat, p.lng]);
    L.polyline(linha, { color: '${Palette.sage500}', weight: 3, opacity: .9, dashArray: '2 8', lineCap: 'round' }).addTo(mapa);
    mapa.fitBounds(linha, { padding: [56, 56], maxZoom: 16 });
  }
  setTimeout(() => mapa.invalidateSize(false), 100);
})();
</script>
</body>
</html>`;
}
