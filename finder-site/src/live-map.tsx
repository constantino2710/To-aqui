import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';
import { useEffect, useMemo } from 'react';

type Point = { lat: number; lng: number };

const PIN = 'M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8z';

/**
 * Tiles: OpenStreetMap padrão (sem chave; a CARTO passou a exigir uma). Para
 * produção, defina VITE_MAP_TILES_URL/VITE_MAP_TILES_ATTRIBUTION com um provedor
 * com chave. O visual do Found vem do filtro em `.leaflet-tile-pane` (styles.css),
 * igual ao do app.
 */
const URL_TILES = import.meta.env.VITE_MAP_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO =
  import.meta.env.VITE_MAP_TILES_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Você (quem achou o QR): o pin do Found com ondas de localização.
const iconeVoce = divIcon({
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: `<div class="found-alvo"><span class="found-onda"></span><span class="found-onda d2"></span><svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><defs><linearGradient id="found-pin-mapa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3FA584"/><stop offset="1" stop-color="#6CC160"/></linearGradient></defs><rect width="48" height="48" rx="14" fill="#1E2320"/><path d="${PIN}" fill="url(#found-pin-mapa)"/><rect x="18.5" y="14.5" width="11" height="11" rx="3" fill="#1E2320"/><rect x="21.5" y="17.5" width="5" height="5" rx="1.4" fill="#FFFFFF"/></svg></div>`,
});

// A família (responsável): círculo no tom do botão principal, com ícone de pessoas.
const iconeFamilia = divIcon({
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: '<div class="found-pessoa"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>',
});

function AjustarEnquadramento({ finder, responsible }: { finder?: Point; responsible?: Point }) {
  const map = useMap();
  // Créditos: só o do OpenStreetMap (obrigatório), sem o prefixo do Leaflet.
  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);
  useEffect(() => {
    const points = [finder, responsible].filter((point): point is Point => Boolean(point));
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 16);
    if (points.length === 2) map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [56, 56], maxZoom: 16 });
  }, [finder, responsible, map]);
  return null;
}

export function LiveMap({ finder, responsible }: { finder?: Point; responsible?: Point }) {
  const center: LatLngExpression = finder ? [finder.lat, finder.lng] : responsible ? [responsible.lat, responsible.lng] : [-14.235, -51.9253];
  const linha = useMemo<LatLngExpression[] | null>(
    () => (finder && responsible ? [[finder.lat, finder.lng], [responsible.lat, responsible.lng]] : null),
    [finder, responsible],
  );

  return (
    <div className="mapa-found superficie-cartao relative h-72 w-full overflow-hidden rounded-[28px] bg-background" aria-label="Mapa das localizações compartilhadas">
      {/* Selo "ao vivo": a posição é atualizada a cada poucos segundos. */}
      <span className="absolute left-3 top-3 z-[500] inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-card-foreground shadow-[0_4px_14px_rgb(0_0_0/0.16)]">
        <span className="size-2 animate-pulse rounded-full bg-[#6CC160]" aria-hidden="true" />
        Ao vivo
      </span>
      <MapContainer center={center} zoom={finder || responsible ? 16 : 4} scrollWheelZoom={false} attributionControl>
        <TileLayer attribution={ATRIBUICAO} url={URL_TILES} maxZoom={19} />
        <AjustarEnquadramento finder={finder} responsible={responsible} />
        {linha && <Polyline positions={linha} pathOptions={{ color: '#3FA584', weight: 3, opacity: 0.9, dashArray: '2 8', lineCap: 'round' }} />}
        {finder && (
          <Marker position={[finder.lat, finder.lng]} icon={iconeVoce} keyboard={false}>
            <Tooltip permanent direction="top" offset={[0, -26]} className="found-tip">Você</Tooltip>
          </Marker>
        )}
        {responsible && (
          <Marker position={[responsible.lat, responsible.lng]} icon={iconeFamilia} keyboard={false}>
            <Tooltip permanent direction="top" offset={[0, -20]} className="found-tip">Família</Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
