import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, EyeOff, Hand, MapPin, UserRoundX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FoundLogo } from './found-logo';
import { LiveMap } from './live-map';
import { Radar } from './radar';
import { BotaoTema } from './tema';
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

const GARANTIAS = [
  { Icone: UserRoundX, titulo: 'Sem cadastro', texto: 'Não pedimos seu nome, telefone nem qualquer dado pessoal.' },
  { Icone: Hand, titulo: 'Você decide quando parar', texto: 'Um toque encerra o compartilhamento na hora.' },
  { Icone: EyeOff, titulo: 'Só a família vê', texto: 'A posição vai apenas para os responsáveis deste QR Code.' },
];

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

  const grupo = ativo ? 'ativo' : encerrado ? 'encerrado' : 'inicio';
  const mostrarErro = estado === 'erro';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-6 px-6 py-6">
      {/* A marca em destaque: é ela que diz a quem encontrou o QR que o link é confiável. */}
      <header className="flex animate-fade-up items-center justify-between gap-4 px-2 pb-2 pt-4">
        <FoundLogo size={56} />
        <BotaoTema />
      </header>

      <div className="flex animate-fade-up flex-col gap-2 px-2 [animation-delay:50ms]">
        <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.03em]">Você encontrou este QR Code?</h1>
        <p className="text-base text-muted-foreground">
          Ajude esta família compartilhando sua localização. É rápido, seguro e você decide quando parar.
        </p>
      </div>

      <Card aria-labelledby="titulo" className="animate-fade-up [animation-delay:100ms]">
        <div key={grupo} className="flex animate-fade-in flex-col gap-4">
          {/* Antes de começar, a ilustração explica o pedido; depois, o ícone de estado. */}
          {grupo === 'inicio' ? (
            <Radar />
          ) : (
          <span
            className={cn(
              'relative m-2 grid size-16 place-items-center rounded-full',
              encerrado ? 'bg-gradient-to-br from-[#3FA584] to-[#6CC160] text-primary' : 'bg-secondary text-secondary-foreground',
            )}
            aria-hidden="true"
          >
            {ativo && (
              <>
                <span className="absolute -inset-2 animate-pulse-ring rounded-full border-[1.5px] border-ring opacity-45" />
                <span className="absolute -inset-4 animate-pulse-ring rounded-full border-[1.5px] border-ring opacity-20 [animation-delay:600ms]" />
              </>
            )}
            {encerrado ? <Check className="size-7" strokeWidth={2.4} /> : <MapPin className="size-7" strokeWidth={1.8} />}
          </span>
          )}

          <div className="flex flex-col gap-2">
            <h2 id="titulo" className="text-lg font-bold leading-[26px]">{titulo}</h2>
            {mostrarErro && mensagem ? (
              <p role="alert" className="flex gap-2 rounded-[22px] bg-destructive/10 p-4 text-base font-semibold text-destructive">
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                {mensagem}
              </p>
            ) : (
              <p className="text-base text-muted-foreground">{mensagem || textoPadrao}</p>
            )}
          </div>

          {(estado === 'introducao' || estado === 'erro') && (
            <Button className="mt-2 w-full" onClick={iniciar}>
              Compartilhar minha localização
            </Button>
          )}
          {estado === 'iniciando' && (
            <Button className="mt-2 w-full" disabled>
              Iniciando…
            </Button>
          )}
          {ativo && (
            <Button variant="destructive" className="mt-2 w-full" onClick={parar} disabled={estado === 'parando'}>
              {estado === 'parando' ? 'Encerrando…' : 'Parar de compartilhar'}
            </Button>
          )}
        </div>
      </Card>

      {ativo && (
        <section aria-labelledby="mapa" className="flex animate-fade-up flex-col gap-2">
          <h2 id="mapa" className="px-2 text-lg font-bold leading-[26px]">No mapa</h2>
          <p className="px-2 pb-2 text-sm text-muted-foreground">
            O <strong className="font-semibold text-secondary-foreground">pin do Found</strong> é você.{' '}
            O <strong className="font-semibold text-foreground">círculo com pessoas</strong> é a família.
          </p>
          <LiveMap finder={finder} responsible={responsible} />
          {!responsible && (
            <p className="px-2 pt-2 text-sm text-muted-foreground">
              Aguardando a família abrir o mapa no aplicativo.
            </p>
          )}
        </section>
      )}

      {/* Garantias: quem abre o link é um desconhecido; a confiança vem primeiro. */}
      <aside aria-label="Sua privacidade" className="animate-fade-up [animation-delay:150ms]">
        <ul className="flex flex-col gap-3">
          {GARANTIAS.map(({ Icone, titulo, texto }) => (
            <li key={titulo} className="flex items-center gap-4 px-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground" aria-hidden="true">
                <Icone className="size-5" strokeWidth={1.8} />
              </span>
              <p className="text-sm text-muted-foreground">
                <strong className="block text-base font-semibold text-foreground">{titulo}</strong>
                {texto}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
