import { useEffect, useRef, useState } from 'react';
import { Check, MapPin, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
      setMensagem('A família avisou que já encontrou o que procurava. Obrigado pela ajuda!');
    }
    void atualizarMapa();
  }

  async function iniciar() {
    if (!token) {
      setEstado('erro');
      setMensagem('Este QR Code está incompleto. Peça um novo código à família.');
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
    setMensagem('Localização sendo enviada. Mantenha esta página aberta enquanto aguarda a família.');
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => void enviarPosicao(position),
      (error) => setMensagem(error.code === error.PERMISSION_DENIED ? 'A permissão foi negada. Libere a localização nas configurações do navegador e tente de novo.' : 'Ainda não conseguimos obter a posição. Mantenha o GPS ligado.'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
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
  const encerrado = estado === 'encerrado';
  const finder = mapa?.finder_lat != null && mapa.finder_lng != null ? { lat: mapa.finder_lat, lng: mapa.finder_lng } : undefined;
  const responsible = mapa?.responsible_lat != null && mapa.responsible_lng != null ? { lat: mapa.responsible_lat, lng: mapa.responsible_lng } : undefined;

  const titulo = ativo ? 'Localização sendo enviada' : encerrado ? 'Compartilhamento encerrado' : 'Compartilhar localização';
  const textoPadrao = 'Ao continuar, o navegador vai pedir sua permissão. Só os responsáveis desta família verão a posição enviada.';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-7 px-4 py-12">
      <header className="flex flex-col gap-3 animate-fade-up">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="size-5" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">To Aqui</span>
        </div>
        <h1 className="text-[2.1rem] font-semibold leading-[1.1] tracking-tight text-foreground">
          Você encontrou este QR Code?
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Ajude esta família compartilhando sua localização. É rápido, seguro e você decide quando parar.
        </p>
      </header>

      <Card className="animate-fade-up [animation-delay:80ms]">
        <CardHeader className="items-start gap-4">
          <span
            className={cn(
              'relative grid size-16 place-items-center rounded-[1.25rem] text-primary',
              encerrado ? 'bg-primary text-primary-foreground' : 'bg-secondary',
            )}
            aria-hidden="true"
          >
            {ativo && (
              <span className="absolute inset-0 rounded-[1.25rem] bg-primary/30 animate-pulse-ring" />
            )}
            {encerrado ? <Check className="size-8" /> : <MapPin className="size-8" />}
          </span>
          <CardTitle>{titulo}</CardTitle>
          <p className="text-base leading-relaxed text-muted-foreground">{mensagem || textoPadrao}</p>
        </CardHeader>

        <CardFooter>
          {(estado === 'introducao' || estado === 'erro') && (
            <Button className="w-full" onClick={iniciar}>
              Compartilhar minha localização
            </Button>
          )}
          {estado === 'iniciando' && (
            <Button className="w-full" disabled>
              Iniciando…
            </Button>
          )}
          {ativo && (
            <>
              <Button variant="destructive" className="w-full" onClick={parar} disabled={estado === 'parando'}>
                {estado === 'parando' ? 'Encerrando…' : 'Parar de compartilhar'}
              </Button>
              <CardContent className="w-full p-0 pt-2">
                <h2 className="mb-1 text-base font-semibold">No mapa</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Verde</span> é a sua posição.{' '}
                  <span className="font-medium text-destructive">Vermelho</span> é a família.
                </p>
                <LiveMap finder={finder} responsible={responsible} />
                {!responsible && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aguardando a família abrir o mapa no aplicativo.
                  </p>
                )}
              </CardContent>
            </>
          )}
        </CardFooter>
      </Card>

      <aside className="flex items-start gap-3 px-1 text-sm leading-relaxed text-muted-foreground animate-fade-up [animation-delay:160ms]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Você pode parar quando quiser. Não pedimos seu nome, telefone nem qualquer dado pessoal.</p>
      </aside>
    </main>
  );
}
