import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Bell, CircleAlert, MessageCircle, SendHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEventoSessao } from './canal-sessao';
import { supabase } from './supabase';

type Mensagem = { id: number; sender: 'finder' | 'family'; body: string; created_at: string };

/** Respostas de um toque, só até quem encontrou mandar a primeira mensagem. */
const RAPIDAS = ['Estou esperando aqui', 'Estamos em um lugar seguro', 'Estou indo até um posto de apoio'];
const LIMITE = 500;

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const DURACAO_AVISO_MS = 6000;
const temNotificacao = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
const permissaoAtual = () => (temNotificacao ? Notification.permission : 'denied');

/** Aviso de mensagem nova enquanto o chat está fechado (estilo app de conversa). */
type Aviso = { texto: string; quantidade: number; chave: number };

type ChatProps = {
  finderToken: string;
  /** Chamado quando o servidor avisa que a sessão acabou (a família encontrou). */
  aoEncerrar: () => void;
};

/**
 * Conversa com a família, sem identificar ninguém: aqui as mensagens da família
 * aparecem só como "Família"; no app, as daqui aparecem como "Quem encontrou".
 * Um FAB no canto (com o número de mensagens novas) abre o chat em tela cheia.
 * As mensagens chegam em tempo real (Realtime Broadcast, ver `canal-sessao`);
 * uma conferência a cada 30 s pega o que se perder numa queda de conexão.
 */
export function Chat({ finderToken, aoEncerrar }: ChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [vistaAte, setVistaAte] = useState(0);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const ultimoIdRef = useRef(0);
  const listaRef = useRef<HTMLOListElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [permissao, setPermissao] = useState(permissaoAtual);
  // O intervalo de busca é criado uma vez; lê o estado atual por refs.
  const abertoRef = useRef(aberto);
  abertoRef.current = aberto;
  const carregouRef = useRef(false);

  async function buscar() {
    const { data, error } = await supabase.rpc('get_finder_messages', {
      p_finder_token: finderToken,
      p_after_id: ultimoIdRef.current,
    });
    if (error) return;
    // A primeira busca só carrega o que já existia (recarregar a página não avisa de novo).
    const primeiraBusca = !carregouRef.current;
    carregouRef.current = true;
    receber((data as Mensagem[] | null) ?? [], !primeiraBusca);
  }

  /** Junta mensagens novas (da busca ou do tempo real), sem repetir, e avisa as da família. */
  function receber(chegaram: Mensagem[], avisarFamilia: boolean) {
    const novas = chegaram.filter((m) => m.id > ultimoIdRef.current);
    if (novas.length === 0) return;
    ultimoIdRef.current = Math.max(...novas.map((m) => m.id));
    setMensagens((atuais) => {
      const vistos = new Set(atuais.map((m) => m.id));
      return [...atuais, ...novas.filter((m) => !vistos.has(m.id))].sort((a, b) => a.id - b.id);
    });
    const daFamilia = novas.filter((m) => m.sender === 'family');
    if (avisarFamilia && daFamilia.length > 0) avisar(daFamilia);
  }

  // Tempo real: a mensagem chega na hora. Ao (re)conectar, busca o que perdeu.
  useEventoSessao(
    'mensagem',
    (payload) => receber([payload as unknown as Mensagem], true),
    () => void buscar(),
  );

  /**
   * Mensagem da família com o chat fechado: aba em segundo plano vira
   * notificação do aparelho; aba na frente vira o banner da própria página.
   */
  function avisar(daFamilia: Mensagem[]) {
    navigator.vibrate?.(120);
    const ultima = daFamilia[daFamilia.length - 1];
    if (document.visibilityState === 'hidden') {
      if (permissaoAtual() !== 'granted') return;
      void navigator.serviceWorker.getRegistration('/sw-found.js').then((registro) =>
        registro?.showNotification('Família', {
          body: daFamilia.map((m) => m.body).slice(-4).join('\n'),
          icon: '/found-app-icon-v2.png',
          badge: '/found-app-icon-v2.png',
          // Mesma etiqueta: as mensagens se acumulam numa notificação só.
          tag: `found-chat-${finderToken}`,
          // …e cada mensagem nova toca e vibra de novo, em vez de trocar o texto em silêncio.
          ...({ renotify: true } as NotificationOptions),
          data: { tipo: 'abrir-chat' },
        }),
      );
      return;
    }
    if (abertoRef.current) return;
    setAviso((atual) => ({
      texto: ultima.body,
      quantidade: (atual?.quantidade ?? 0) + daFamilia.length,
      chave: ultima.id,
    }));
  }

  // As mensagens vêm em tempo real; esta conferência só cobre quedas do Realtime.
  useEffect(() => {
    void buscar();
    const timer = window.setInterval(() => void buscar(), 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finderToken]);

  // Tocar na notificação do aparelho volta para cá com o chat aberto.
  useEffect(() => {
    if (!temNotificacao) return;
    const aoReceber = (evento: MessageEvent) => {
      if ((evento.data as { tipo?: string } | null)?.tipo === 'abrir-chat') setAberto(true);
    };
    navigator.serviceWorker.addEventListener('message', aoReceber);
    // Se a permissão já foi dada antes, o service worker precisa estar registrado.
    if (Notification.permission === 'granted') void navigator.serviceWorker.register('/sw-found.js');
    return () => navigator.serviceWorker.removeEventListener('message', aoReceber);
  }, []);

  // O banner some sozinho; uma mensagem nova reinicia o tempo.
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  async function ativarAvisos() {
    if (!temNotificacao) return;
    const resultado = await Notification.requestPermission();
    setPermissao(resultado);
    if (resultado === 'granted') await navigator.serviceWorker.register('/sw-found.js');
  }

  function abrirChat() {
    setAviso(null);
    setAberto(true);
  }

  const ultimaDaFamilia = mensagens.reduce((maior, m) => (m.sender === 'family' ? Math.max(maior, m.id) : maior), 0);
  // Com o chat aberto, tudo o que chega já está sendo visto.
  if (aberto && ultimaDaFamilia > vistaAte) setVistaAte(ultimaDaFamilia);
  const naoLidas = mensagens.filter((m) => m.sender === 'family' && m.id > vistaAte).length;
  const jaEscrevi = mensagens.some((m) => m.sender === 'finder');

  // A conversa sempre mostra a mensagem mais recente.
  useEffect(() => {
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
  }, [mensagens.length, aberto]);

  // Tela cheia: a página de trás não rola, Esc fecha e o foco vai para o campo.
  useEffect(() => {
    if (!aberto) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    campoRef.current?.focus({ preventScroll: true });
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoTeclar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function fechar() {
    setAberto(false);
    fabRef.current?.focus({ preventScroll: true });
  }

  async function enviar(corpo: string) {
    const limpo = corpo.trim();
    if (!limpo || enviando) return;
    setEnviando(true);
    setErro('');
    const { data, error } = await supabase.rpc('send_finder_message', {
      p_finder_token: finderToken,
      p_body: limpo.slice(0, LIMITE),
    });
    setEnviando(false);
    if (error) {
      setErro(
        error.message.includes('Muitas mensagens')
          ? 'Muitas mensagens em pouco tempo. Aguarde um instante e envie de novo.'
          : 'A mensagem não foi enviada. Verifique sua conexão e tente de novo.',
      );
      return;
    }
    if (data === 'ended') {
      aoEncerrar();
      return;
    }
    setTexto('');
    void buscar();
    // Avisa a família no celular. Sem esperar: a mensagem já está salva, e se o
    // push falhar a próxima mensagem leva esta junto (a função agrupa as pendentes).
    void supabase.functions.invoke('notify-chat-message', { body: { finder_token: finderToken } });
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(texto);
  }

  return (
    <>
      {/* Mensagem nova com o chat fechado: quem mandou + o texto; toque abre a conversa. */}
      {aviso && !aberto && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
          <div
            key={aviso.chave}
            role="status"
            className="superficie-cartao pointer-events-auto flex w-full max-w-[32rem] animate-fade-up items-center gap-4 rounded-[28px] bg-card p-4 text-card-foreground"
          >
            <button
              type="button"
              onClick={abrirChat}
              className="flex min-w-0 flex-1 items-center gap-4 rounded-[20px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mensagem da família: ${aviso.texto}. Abrir a conversa.`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground" aria-hidden="true">
                <MessageCircle className="size-5" strokeWidth={1.8} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm">
                  <strong className="font-bold">Família</strong>
                  <span className="text-muted-foreground">agora</span>
                </span>
                <span className="line-clamp-2 text-base">{aviso.texto}</span>
                {aviso.quantidade > 1 && (
                  <span className="text-sm font-semibold text-secondary-foreground">{aviso.quantidade} mensagens novas</span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Dispensar"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* FAB: grafite, 56 px, no canto inferior direito, como no app. */}
      <button
        ref={fabRef}
        type="button"
        onClick={abrirChat}
        aria-label={naoLidas > 0 ? `Abrir conversa, ${naoLidas} mensagens novas` : 'Abrir conversa com a família'}
        className="fixed bottom-6 right-6 z-40 grid size-14 animate-fade-up place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--shadow))] transition-transform duration-[160ms] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle className="size-7" strokeWidth={2} aria-hidden="true" />
        {naoLidas > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border-2 border-background bg-gradient-to-br from-[#3FA584] to-[#6CC160] px-1 text-sm font-bold leading-5 text-white"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conversa"
          className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-background"
        >
          <div className="mx-auto flex h-full w-full max-w-[34rem] flex-col">
            <header className="flex items-center gap-4 px-6 pb-4 pt-6">
              <Button variant="outline" size="icon" className="size-12 shrink-0 border-0 bg-card" onClick={fechar} aria-label="Fechar conversa">
                <ArrowLeft strokeWidth={2} />
              </Button>
              <div className="min-w-0">
                <h2 id="conversa" className="text-lg font-bold leading-[26px]">Conversa com a família</h2>
                <p className="truncate text-sm text-muted-foreground">A família não sabe quem você é.</p>
              </div>
            </header>

            {mensagens.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground" aria-hidden="true">
                  <MessageCircle className="size-7" strokeWidth={1.8} />
                </span>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Avise onde vocês estão ou combine um ponto de encontro. As respostas aparecem aqui.
                </p>
              </div>
            ) : (
              <ol ref={listaRef} aria-live="polite" aria-label="Mensagens" className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-4">
                {mensagens.map((m) => {
                  const minha = m.sender === 'finder';
                  return (
                    <li key={m.id} className={cn('flex flex-col gap-1', minha ? 'items-end' : 'items-start')}>
                      <span className="px-2 text-sm text-muted-foreground">
                        {minha ? 'Você' : 'Família'} · {hora(m.created_at)}
                      </span>
                      <p
                        className={cn(
                          'max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] px-4 py-2 text-base',
                          minha ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        {m.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
              {erro && (
                <p role="alert" className="flex gap-2 rounded-[22px] bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                  <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  {erro}
                </p>
              )}

              {/* Depois da primeira mensagem: oferecer aviso no aparelho quando a família responder. */}
              {jaEscrevi && temNotificacao && permissao === 'default' && (
                <div className="flex items-center gap-4 rounded-[22px] bg-secondary p-4 text-secondary-foreground">
                  <Bell className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <p className="min-w-0 flex-1 text-sm">Quer ser avisado quando a família responder?</p>
                  <Button type="button" size="sm" className="shrink-0" onClick={() => void ativarAvisos()}>
                    Avisar
                  </Button>
                </div>
              )}

              {!jaEscrevi && (
                <div className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none]" aria-label="Respostas rápidas">
                  {RAPIDAS.map((rapida) => (
                    <Button
                      key={rapida}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      disabled={enviando}
                      onClick={() => void enviar(rapida)}
                    >
                      {rapida}
                    </Button>
                  ))}
                </div>
              )}

              <form onSubmit={aoEnviar} className="flex items-center gap-2">
                <label htmlFor="mensagem" className="sr-only">Mensagem para a família</label>
                <input
                  ref={campoRef}
                  id="mensagem"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={LIMITE}
                  autoComplete="off"
                  enterKeyHint="send"
                  placeholder="Escreva uma mensagem"
                  className="campo-chat h-14 min-w-0 flex-1 rounded-full px-6 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="icon" className="size-14 shrink-0" disabled={enviando || !texto.trim()} aria-label="Enviar mensagem">
                  <SendHorizontal strokeWidth={2} />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
