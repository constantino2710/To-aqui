import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, Info, MapPin, MapPinOff, Smartphone, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { conectarSessao, desconectarSessao, useEventoSessao } from './canal-sessao';
import { Chat } from './chat';
import { FoundLogo } from './found-logo';
import { LiveMap } from './live-map';
import { Radar } from './radar';
import { BotaoTema } from './tema';
import { chamarRpcAoSair, supabase } from './supabase';

type Estado = 'introducao' | 'iniciando' | 'ativo' | 'parando' | 'encerrado' | 'erro';
type ScanResult = { session_id: string; finder_token: string };
type NotificationResult = { sent?: boolean; reason?: string };

/** O aviso já saiu (agora ou antes): não precisa tentar de novo. */
const avisoResolvido = (r?: NotificationResult | null) =>
  Boolean(r?.sent || r?.reason === 'already-sent' || r?.reason === 'recently-sent');
type MapResult = {
  status: 'awaiting_consent' | 'active' | 'ended';
  finder_lat: number | null;
  finder_lng: number | null;
  responsible_lat: number | null;
  responsible_lng: number | null;
};
type SessaoFinder = { status: 'awaiting_consent' | 'active' | 'ended'; location_paused?: boolean };
type EventoSessao = {
  status?: string;
  responsible_lat?: number | null;
  responsible_lng?: number | null;
};

/** O mapa e o chat chegam em tempo real; esta conferência só cobre quedas do Realtime. */
const CONFERENCIA_MS = 30_000;

/**
 * O atendimento fica guardado na aba: recarregar a página continua o mesmo
 * atendimento em vez de escanear de novo (o que abriria outro e contaria no
 * limite de leituras do QR).
 */
const chaveSessao = (token: string) => `found:atendimento:${token}`;
function lerSessaoGuardada(token: string) {
  try {
    return sessionStorage.getItem(chaveSessao(token));
  } catch {
    return null;
  }
}
function guardarSessao(token: string, finderToken: string | null) {
  try {
    if (finderToken) sessionStorage.setItem(chaveSessao(token), finderToken);
    else sessionStorage.removeItem(chaveSessao(token));
  } catch {
    // Navegação privada sem armazenamento: só não retoma ao recarregar.
  }
}

export function App() {
  const [estado, setEstado] = useState<Estado>('introducao');
  const [mensagem, setMensagem] = useState('');
  const [mapa, setMapa] = useState<MapResult | null>(null);
  const watcherRef = useRef<number | null>(null);
  const finderTokenRef = useRef<string | null>(null);
  const notificacaoEnviadaRef = useRef(false);
  const proximaTentativaNotificacaoRef = useRef(0);
  // Última posição do GPS e se o servidor já confirmou o recebimento dela.
  const ultimaPosicaoRef = useRef<{ position: GeolocationPosition; enviada: boolean } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // null = ainda não tentou; true = a tela vai ficar acesa; false = navegador não deixou.
  const [telaAcesa, setTelaAcesa] = useState<boolean | null>(null);
  // Localização pausada: o GPS para, mas o atendimento e a conversa continuam.
  const [pausada, setPausada] = useState(false);
  const pausadaRef = useRef(false);
  const [alternando, setAlternando] = useState(false);
  // Observação que a família escreveu para quem escaneia (opcional).
  const [nota, setNota] = useState<string | null>(null);
  const token = new URLSearchParams(window.location.search).get('token');

  // A observação aparece antes de a pessoa decidir ajudar, sem abrir atendimento.
  useEffect(() => {
    if (!token) return;
    void supabase.rpc('get_qr_public_info', { p_token: token }).then(({ data }) => {
      const texto = (data as { finder_note: string | null }[] | null)?.[0]?.finder_note?.trim();
      if (texto) setNota(texto);
    });
  }, [token]);

  // Recarregou a página no meio do atendimento: continua de onde estava.
  useEffect(() => {
    if (!token) return;
    const guardado = lerSessaoGuardada(token);
    if (!guardado) return;
    void supabase.rpc('get_finder_session', { p_finder_token: guardado }).then(({ data }) => {
      const sessao = (data as SessaoFinder[] | null)?.[0];
      if (sessao?.status === 'active') {
        finderTokenRef.current = guardado;
        notificacaoEnviadaRef.current = true; // o alarme já tocou na primeira vez
        // Estava pausada: volta pausada, sem religar o GPS sozinho.
        if (sessao.location_paused) entrarPausada();
        else comecarCompartilhamento();
      } else if (sessao?.status === 'ended') {
        guardarSessao(token, null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function limparObservador() {
    if (watcherRef.current !== null) {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
  }

  useEffect(() => limparObservador, []);

  /**
   * Wake Lock: com a tela apagada o navegador congela a página e o GPS para.
   * O sistema solta o bloqueio sempre que a aba sai de cena, então ele é pedido
   * de novo a cada volta (ver o efeito de visibilidade abaixo).
   */
  async function manterTelaAcesa() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      setTelaAcesa(false);
      return;
    }
    try {
      const sentinela = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinela;
      setTelaAcesa(true);
      sentinela.addEventListener('release', () => {
        if (wakeLockRef.current === sentinela) wakeLockRef.current = null;
      });
    } catch {
      // Bateria fraca, economia de energia ou navegador antigo.
      setTelaAcesa(false);
    }
  }

  function liberarTela() {
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }

  /** Ao sair da página, entrega a última posição que ainda não chegou ao servidor. */
  function enviarUltimaPosicaoAoSair() {
    const ultima = ultimaPosicaoRef.current;
    const finderToken = finderTokenRef.current;
    if (!ultima || ultima.enviada || !finderToken || pausadaRef.current) return;
    ultima.enviada = true;
    chamarRpcAoSair('record_location_ping', {
      p_finder_token: finderToken,
      p_lat: ultima.position.coords.latitude,
      p_lng: ultima.position.coords.longitude,
      p_accuracy_m: ultima.position.coords.accuracy,
      p_source: 'gps',
      p_recorded_at: new Date(ultima.position.timestamp).toISOString(),
    });
  }

  const compartilhando = estado === 'ativo' || estado === 'parando';

  // Tela acesa e envio ao sair só enquanto a localização está ligada.
  useEffect(() => {
    if (!compartilhando || pausada) return;
    void manterTelaAcesa();

    function aoMudarVisibilidade() {
      if (document.visibilityState === 'hidden') {
        enviarUltimaPosicaoAoSair();
        return;
      }
      // De volta: tela acesa de novo e uma posição fresca na hora, sem esperar o watch.
      void manterTelaAcesa();
      navigator.geolocation.getCurrentPosition(
        (position) => void enviarPosicao(position),
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
      );
    }

    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', enviarUltimaPosicaoAoSair);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', enviarUltimaPosicaoAoSair);
      liberarTela();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compartilhando, pausada]);

  async function atualizarMapa() {
    if (!finderTokenRef.current) return;
    const { data } = await supabase.rpc('get_session_map', { p_finder_token: finderTokenRef.current });
    const result = (data as MapResult[] | null)?.[0];
    if (!result) return;
    setMapa(result);
    if (result.status === 'ended') encerradoPelaFamilia();
  }

  // Tempo real: a família mexe a posição dela ou encerra, e a página sabe na hora.
  useEffect(() => {
    if (!compartilhando || !finderTokenRef.current) return;
    void conectarSessao(finderTokenRef.current);
    void atualizarMapa();
    const timer = window.setInterval(() => void atualizarMapa(), CONFERENCIA_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compartilhando]);

  // Sai do canal só quando o atendimento acaba (não durante o "Encerrando…").
  useEffect(() => {
    if (estado === 'encerrado' || estado === 'erro') desconectarSessao();
  }, [estado]);
  useEffect(() => desconectarSessao, []);

  useEventoSessao(
    'sessao',
    (payload) => {
      const evento = payload as EventoSessao;
      if (evento.status === 'ended') {
        encerradoPelaFamilia();
        return;
      }
      setMapa((atual) => ({
        status: atual?.status ?? 'active',
        finder_lat: atual?.finder_lat ?? null,
        finder_lng: atual?.finder_lng ?? null,
        responsible_lat: evento.responsible_lat ?? null,
        responsible_lng: evento.responsible_lng ?? null,
      }));
    },
    // Reconectou depois de uma queda: busca o que pode ter perdido.
    () => void atualizarMapa(),
  );

  async function enviarPosicao(position: GeolocationPosition) {
    // Uma posição atrasada do GPS não pode sair depois de a pessoa pausar.
    if (!finderTokenRef.current || pausadaRef.current) return;
    const atual = { position, enviada: false };
    ultimaPosicaoRef.current = atual;
    const { data, error } = await supabase.rpc('record_location_ping', {
      p_finder_token: finderTokenRef.current,
      p_lat: position.coords.latitude,
      p_lng: position.coords.longitude,
      p_accuracy_m: position.coords.accuracy,
      p_source: 'gps',
      p_recorded_at: new Date(position.timestamp).toISOString(),
    });
    if (error) setMensagem('Não foi possível enviar a posição. Verifique sua conexão.');
    else atual.enviada = true;
    if (
      // Reforço do aviso do escaneamento (a função ignora se já foi enviado).
      !error &&
      data === 'active' &&
      !notificacaoEnviadaRef.current &&
      Date.now() >= proximaTentativaNotificacaoRef.current
    ) {
      proximaTentativaNotificacaoRef.current = Date.now() + 30_000;
      const push = await supabase.functions.invoke<NotificationResult>('notify-location-found', {
        body: { finder_token: finderTokenRef.current },
      });
      if (!push.error && avisoResolvido(push.data)) notificacaoEnviadaRef.current = true;
    }
    if (data === 'ended') {
      encerradoPelaFamilia();
      return;
    }
    // A própria posição vai direto para o mapa, sem perguntar ao servidor.
    setMapa((atual) => ({
      status: atual?.status ?? 'active',
      responsible_lat: atual?.responsible_lat ?? null,
      responsible_lng: atual?.responsible_lng ?? null,
      finder_lat: position.coords.latitude,
      finder_lng: position.coords.longitude,
    }));
  }

  function encerradoPelaFamilia() {
    limparObservador();
    if (token) guardarSessao(token, null);
    setEstado('encerrado');
    setMensagem('A família avisou que já encontrou o que procurava. Obrigado pela ajuda!');
  }

  /** Começa (ou retoma) o envio: tela de ativo + GPS. */
  function comecarCompartilhamento() {
    pausadaRef.current = false;
    setPausada(false);
    setEstado('ativo');
    setMensagem('Localização sendo enviada. Mantenha esta página aberta enquanto aguarda a família.');
    limparObservador();
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => void enviarPosicao(position),
      (error) =>
        setMensagem(
          error.code === error.PERMISSION_DENIED
            ? 'A permissão foi negada. Libere a localização nas configurações do navegador e tente de novo.'
            : 'Ainda não conseguimos obter a posição. Mantenha o GPS ligado.',
        ),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }

  /** Atendimento ativo, mas sem enviar a posição (a conversa segue). */
  function entrarPausada() {
    limparObservador();
    ultimaPosicaoRef.current = null;
    pausadaRef.current = true;
    setPausada(true);
    setEstado('ativo');
    setMensagem('A família não recebe mais a sua posição. A conversa continua aberta.');
  }

  async function pararLocalizacao() {
    if (!finderTokenRef.current) return;
    entrarPausada();
    setAlternando(true);
    const { data } = await supabase.rpc('set_finder_location_sharing', {
      p_finder_token: finderTokenRef.current,
      p_sharing: false,
    });
    setAlternando(false);
    if (data === 'ended') encerradoPelaFamilia();
  }

  async function voltarACompartilhar() {
    if (!finderTokenRef.current) return;
    setAlternando(true);
    const { data, error } = await supabase.rpc('set_finder_location_sharing', {
      p_finder_token: finderTokenRef.current,
      p_sharing: true,
    });
    setAlternando(false);
    if (data === 'ended') {
      encerradoPelaFamilia();
      return;
    }
    if (error) {
      setMensagem('Não foi possível voltar a compartilhar. Verifique sua conexão e tente de novo.');
      return;
    }
    comecarCompartilhamento();
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

    // Já existe atendimento desta aba (ex.: negou o GPS e tentou de novo): reaproveita.
    let finderToken = lerSessaoGuardada(token);
    if (finderToken) {
      const { data } = await supabase.rpc('get_finder_session', { p_finder_token: finderToken });
      const sessao = (data as SessaoFinder[] | null)?.[0];
      const status = sessao?.status;
      if (status === 'active') {
        finderTokenRef.current = finderToken;
        if (sessao?.location_paused) entrarPausada();
        else comecarCompartilhamento();
        return;
      }
      if (status !== 'awaiting_consent') finderToken = null; // encerrado ou inexistente: escaneia de novo
    }

    if (!finderToken) {
      const scanCall = await supabase.rpc('scan_qr_code', { p_token: token });
      const scan = (scanCall.data as ScanResult[] | null)?.[0];
      if (scanCall.error || !scan) {
        setEstado('erro');
        setMensagem(
          scanCall.error?.message.includes('LIMITE_LEITURAS')
            ? 'Este QR Code foi lido muitas vezes agora. Aguarde alguns minutos e tente de novo.'
            : 'Este QR Code não está ativo ou não é válido.',
        );
        return;
      }
      finderToken = scan.finder_token;
      guardarSessao(token, finderToken);
      notificacaoEnviadaRef.current = false;
      proximaTentativaNotificacaoRef.current = 0;
      // A família é avisada já no escaneamento ("[nome] foi encontrado!"), sem
      // esperar o GPS. Sem `await`: o pedido de permissão não fica parado nisso.
      // Se falhar, o primeiro ping (em `enviarPosicao`) tenta de novo.
      void supabase.functions
        .invoke<NotificationResult>('notify-location-found', { body: { finder_token: finderToken } })
        .then((push) => {
          if (!push.error && avisoResolvido(push.data)) notificacaoEnviadaRef.current = true;
        });
    }
    finderTokenRef.current = finderToken;

    const consent = await supabase.rpc('grant_tracking_consent', { p_finder_token: finderToken });
    if (consent.error || consent.data === 'ended') {
      if (consent.data === 'ended') guardarSessao(token, null);
      setEstado(consent.data === 'ended' ? 'encerrado' : 'erro');
      setMensagem(consent.data === 'ended' ? 'Este atendimento já foi encerrado.' : 'Não foi possível iniciar. Tente novamente.');
      return;
    }
    comecarCompartilhamento();
  }

  async function parar() {
    setEstado('parando');
    limparObservador();
    if (token) guardarSessao(token, null);
    if (finderTokenRef.current) await supabase.rpc('end_tracking_session', { p_finder_token: finderTokenRef.current });
    setEstado('encerrado');
    setMensagem('O atendimento foi encerrado. Sua localização e a conversa com a família pararam.');
  }

  const ativo = compartilhando;
  const encerrado = estado === 'encerrado';
  const finder = mapa?.finder_lat != null && mapa.finder_lng != null ? { lat: mapa.finder_lat, lng: mapa.finder_lng } : undefined;
  const responsible = mapa?.responsible_lat != null && mapa.responsible_lng != null ? { lat: mapa.responsible_lat, lng: mapa.responsible_lng } : undefined;

  const titulo = ativo
    ? pausada
      ? 'Localização pausada'
      : 'Localização sendo enviada'
    : encerrado
      ? 'Atendimento encerrado'
      : 'Compartilhar localização';
  const textoPadrao = 'Ao continuar, o navegador vai pedir sua permissão. Só os responsáveis desta família verão a posição enviada.';

  const grupo = ativo ? (pausada ? 'pausada' : 'ativo') : encerrado ? 'encerrado' : 'inicio';
  const mostrarErro = estado === 'erro';

  return (
    // Com o chat ativo, o fim da página ganha espaço para o FAB não cobrir nada.
    <main className={cn('mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-6 px-6 py-6', ativo && 'pb-28')}>
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

      {/* Escrita pela família no app, para quem encontrou (ex.: cuidados, como abordar). */}
      {nota && (
        <section
          aria-labelledby="sobre"
          className="flex animate-fade-up items-center gap-4 rounded-[28px] bg-secondary p-6 text-secondary-foreground [animation-delay:75ms]"
        >
          <Info className="size-7 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="sobre" className="text-lg font-bold leading-[26px] tracking-[-0.01em]">Sobre quem você encontrou</h2>
            <p className="whitespace-pre-wrap break-words text-lg leading-[26px] text-foreground">{nota}</p>
          </div>
        </section>
      )}

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
            {ativo && !pausada && (
              <>
                <span className="absolute -inset-2 animate-pulse-ring rounded-full border-[1.5px] border-ring opacity-45" />
                <span className="absolute -inset-4 animate-pulse-ring rounded-full border-[1.5px] border-ring opacity-20 [animation-delay:600ms]" />
              </>
            )}
            {encerrado ? (
              <Check className="size-7" strokeWidth={2.4} />
            ) : pausada ? (
              <MapPinOff className="size-7" strokeWidth={1.8} />
            ) : (
              <MapPin className="size-7" strokeWidth={1.8} />
            )}
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
          {/* Parar a localização não encerra nada: a conversa continua. */}
          {ativo && !pausada && (
            <Button className="mt-2 w-full" onClick={() => void pararLocalizacao()} disabled={alternando || estado === 'parando'}>
              <MapPinOff strokeWidth={2} aria-hidden="true" />
              Parar de compartilhar a localização
            </Button>
          )}
          {ativo && pausada && (
            <Button className="mt-2 w-full" onClick={() => void voltarACompartilhar()} disabled={alternando || estado === 'parando'}>
              <MapPin strokeWidth={2} aria-hidden="true" />
              {alternando ? 'Ligando…' : 'Voltar a compartilhar'}
            </Button>
          )}
          {ativo && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10"
              onClick={parar}
              disabled={estado === 'parando'}
            >
              {estado === 'parando' ? 'Encerrando…' : 'Encerrar atendimento'}
            </Button>
          )}
          {ativo && !pausada && telaAcesa !== null && (
            <p
              className={cn(
                'flex items-center gap-2 rounded-[22px] p-4 text-sm',
                telaAcesa ? 'bg-secondary text-secondary-foreground' : 'bg-warning-soft font-semibold text-warning',
              )}
            >
              {telaAcesa ? (
                <Sun className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Smartphone className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              )}
              {telaAcesa
                ? 'A tela vai ficar acesa enquanto você compartilha.'
                : 'Não bloqueie a tela: com o celular bloqueado, a localização para de ser enviada.'}
            </p>
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
          {pausada && (
            <p className="px-2 pt-2 text-sm text-muted-foreground">
              Sua localização está pausada. A família vê só o último ponto enviado.
            </p>
          )}
          {!responsible && (
            <p className="px-2 pt-2 text-sm text-muted-foreground">
              A família ainda não está compartilhando a localização dela.
            </p>
          )}
        </section>
      )}

      {ativo && finderTokenRef.current && (
        <Chat finderToken={finderTokenRef.current} aoEncerrar={encerradoPelaFamilia} />
      )}
    </main>
  );
}
