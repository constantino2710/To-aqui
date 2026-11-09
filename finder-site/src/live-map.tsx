import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';

type Point = { lat: number; lng: number };

const cssColor = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
};

function AdjustBounds({ finder, responsible }: { finder?: Point; responsible?: Point }) {
  const map = useMap();
  useEffect(() => {
    const points = [finder, responsible].filter((point): point is Point => Boolean(point));
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 16);
    if (points.length === 2) map.fitBounds(points.map((point) => [point.lat, point.lng]), { padding: [36, 36], maxZoom: 16 });
  }, [finder, responsible, map]);
  return null;
}

export function LiveMap({ finder, responsible }: { finder?: Point; responsible?: Point }) {
  const center: LatLngExpression = finder ? [finder.lat, finder.lng] : responsible ? [responsible.lat, responsible.lng] : [-14.235, -51.9253];
  const green = cssColor('--ring', 'hsl(161 45% 45%)');
  const red = cssColor('--destructive', 'hsl(358 70% 58%)');
  const white = cssColor('--card', '#ffffff');
  const marker = (color: string) => ({ color: white, weight: 4, fillColor: color, fillOpacity: 1 });
  const halo = (color: string) => ({ color, weight: 1.5, opacity: 0.5, fillColor: color, fillOpacity: 0.12 });
  return <div className="h-64 w-full overflow-hidden rounded-[28px] bg-card" aria-label="Mapa das localizações compartilhadas">
    <MapContainer center={center} zoom={finder || responsible ? 16 : 4} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <AdjustBounds finder={finder} responsible={responsible} />
      {finder && <Circle center={[finder.lat, finder.lng]} radius={40} pathOptions={halo(green)} />}
      {finder && <CircleMarker center={[finder.lat, finder.lng]} radius={11} pathOptions={marker(green)}><Tooltip permanent direction="top" className="found-tip">Sua localização</Tooltip></CircleMarker>}
      {responsible && <Circle center={[responsible.lat, responsible.lng]} radius={40} pathOptions={halo(red)} />}
      {responsible && <CircleMarker center={[responsible.lat, responsible.lng]} radius={11} pathOptions={marker(red)}><Tooltip permanent direction="top" className="found-tip">Responsável</Tooltip></CircleMarker>}
    </MapContainer>
  </div>;
}
