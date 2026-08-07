import { useEffect, useRef, useState } from 'react';

import { LiveMap } from './live-map';
import { supabase } from './supabase';

type Estado = 'introducao' | 'iniciando' | 'ativo' | 'parando' | 'encerrado' | 'erro';
type ScanResult = { session_id: string; finder_token: string };
type MapResult = {
  status: Estado;
  finder_lat: number | null;
  finder_lng: number | null;
  responsible_lat: number | null;
  responsible_lng: number | null;
};

export function App() {
  const [estado, setEstado] = useState<Estado>('introducao');
  const [mensagem, setMensagem] = useState('');
  const [mapa, setMapa] = useState<MapResult | null>(null);
  const watcherRef = useRef<number | null>(null);
  const finderTokenRef = useRef<string | null>(null);
  const token = new URLSearchParams(window.location.search).get('token');

  function limparObservador() {
    if (watcherRef.current !== null) {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
  }

  useEffect(() => limparObservador, []);

  async function atualizarMapa() {
    if (!finderTokenRef.current) return;
    const { data } = await supabase.rpc('get_session_map', { p_finder_token: finderTokenRef.current });
    const result = (data as MapResult[] | null)?.[0];
    if (result) setMapa(result);
  }

  useEffect(() => {
    if (estado !== 'ativo') return;
    void atualizarMapa();
    const timer = window.setInterval(() => void atualizarMapa(), 5_000);
    return () => window.clearInterval(timer);
  }, [estado]);

  async function enviarPosicao(position: GeolocationPosition) {
    if (!finderTokenRef.current) return;
    const { data, error } = await supabase.rpc('record_location_ping', {
      p_finder_token: finderTokenRef.current,
      p_lat: position.coords.latitude,
      p_lng: position.coords.longitude,
      p_accuracy_m: position.coords.accuracy,
      p_source: 'gps',
      p_recorded_at: new Date(position.timestamp).toISOString(),
    });
    if (error) setMensagem('Não foi possível enviar a posição. Verifique sua conexão.');
    if (data === 'ended') {
      limparObservador();
      setEstado('encerrado');
      setMensagem('A família informou que já encontrou o que procurava. Obrigado pela ajuda!');
    }
    void atualizarMapa();
  }

  async function iniciar() {
    if (!token) {
      setEstado('erro');
      setMensagem('Este QR Code está incompleto. Peça à família um novo código.');
      return;
    }
    if (!navigator.geolocation) {
      setEstado('erro');
      setMensagem('Este navegador não permite acessar a localização.');
      return;
    }
    setEstado('iniciando');
    setMensagem('');
    const scanCall = await supabase.rpc('scan_qr_code', { p_token: token });
    const scan = (scanCall.data as ScanResult[] | null)?.[0];
    if (scanCall.error || !scan) {
      setEstado('erro');
      setMensagem('Este QR Code não está ativo ou não é válido.');
      return;
    }
    finderTokenRef.current = scan.finder_token;
    const consent = await supabase.rpc('grant_tracking_consent', { p_finder_token: scan.finder_token });
    if (consent.error || consent.data === 'ended') {
      setEstado(consent.data === 'ended' ? 'encerrado' : 'erro');
      setMensagem(consent.data === 'ended' ? 'Este atendimento já foi encerrado.' : 'Não foi possível iniciar. Tente novamente.');
      return;
    }
    setEstado('ativo');
    setMensagem('Localização compartilhada. Mantenha esta página aberta enquanto aguarda a família.');
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => void enviarPosicao(position),
      (error) => setMensagem(error.code === error.PERMISSION_DENIED ? 'A permissão foi negada. Libere a localização nas configurações do navegador e tente novamente.' : 'Ainda não conseguimos obter a posição. Mantenha o GPS ligado.'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
  }

  async function parar() {
    setEstado('parando');
    limparObservador();
    if (finderTokenRef.current) await supabase.rpc('end_tracking_session', { p_finder_token: finderTokenRef.current });
    setEstado('encerrado');
    setMensagem('O compartilhamento foi encerrado e sua localização não será mais enviada.');
  }

  const ativo = estado === 'ativo' || estado === 'parando';
  const finder = mapa?.finder_lat != null && mapa.finder_lng != null ? { lat: mapa.finder_lat, lng: mapa.finder_lng } : undefined;
  const responsible = mapa?.responsible_lat != null && mapa.responsible_lng != null ? { lat: mapa.responsible_lat, lng: mapa.responsible_lng } : undefined;

  return <main className="page">
    <section className="hero"><span className="eyebrow">TO AQUI</span><h1>Você encontrou este QR Code?</h1><p>Ajude a família enviando sua localização com segurança.</p></section>
    <section className="card">
      <div className={`location-icon ${estado === 'encerrado' ? 'done' : ''}`} aria-hidden="true">{estado === 'encerrado' ? '✓' : '⌖'}</div>
      <div><h2>{ativo ? 'Localização sendo enviada' : estado === 'encerrado' ? 'Compartilhamento encerrado' : 'Compartilhar localização'}</h2><p className="message">{mensagem || 'Ao continuar, o navegador pedirá sua permissão. Somente os responsáveis desta família verão a posição enviada.'}</p></div>
      {(estado === 'introducao' || estado === 'erro') && <button className="primary" onClick={iniciar}>Permitir e enviar localização</button>}
      {estado === 'iniciando' && <button className="primary" disabled>Iniciando…</button>}
      {ativo && <><button className="secondary danger" onClick={parar} disabled={estado === 'parando'}>{estado === 'parando' ? 'Encerrando…' : 'Parar de compartilhar'}</button><section className="map-section"><h2>Localizações compartilhadas</h2><p className="message">Roxo: sua localização. Vermelho: responsável.</p><LiveMap finder={finder} responsible={responsible} />{!responsible && <p className="message">Aguardando o responsável compartilhar a localização no aplicativo.</p>}</section></>}
    </section>
    <aside className="privacy"><span aria-hidden="true">◆</span><p>Você pode parar a qualquer momento. Seu nome, telefone e outros dados pessoais não são solicitados.</p></aside>
  </main>;
}
