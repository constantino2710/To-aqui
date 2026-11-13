/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data (12/10). */
export function tempoRelativo(iso: string, agora = Date.now()): string {
  const quando = new Date(iso).getTime();
  const minutos = Math.max(0, Math.round((agora - quando) / 60000));
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
