import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { LatLngExpression } from 'leaflet';

type Point = { lat: number; lng: number };

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
  return <div className="live-map" aria-label="Mapa das localizações compartilhadas">
    <MapContainer center={center} zoom={finder || responsible ? 16 : 4} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <AdjustBounds finder={finder} responsible={responsible} />
      {finder && <CircleMarker center={[finder.lat, finder.lng]} radius={10} pathOptions={{ color: '#6732ee', fillColor: '#6732ee', fillOpacity: 1 }}><Tooltip permanent direction="top">Sua localização</Tooltip></CircleMarker>}
      {responsible && <CircleMarker center={[responsible.lat, responsible.lng]} radius={10} pathOptions={{ color: '#e5484d', fillColor: '#e5484d', fillOpacity: 1 }}><Tooltip permanent direction="top">Responsável</Tooltip></CircleMarker>}
    </MapContainer>
  </div>;
}
