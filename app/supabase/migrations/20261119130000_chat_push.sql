-- Push de mensagem nova do chat: a Edge Function notify-chat-message avisa a
-- família quando quem encontrou escreve. Esta coluna é o lock que garante um
-- push por mensagem, mesmo se o site chamar a função duas vezes (rede ruim,
-- duas abas): a função só envia se conseguir avançar este número.
alter table public.tracking_sessions
  add column chat_notified_message_id bigint;

comment on column public.tracking_sessions.chat_notified_message_id is
  'Id da última mensagem de quem encontrou que já virou push para a família.';
