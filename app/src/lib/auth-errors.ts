import { traduzErroBanco } from '@/lib/db-errors';

/**
 * O Supabase devolve as mensagens de erro em inglês. Traduzimos as que o fluxo
 * de e-mail e senha realmente produz e deixamos o resto passar direto, para não
 * esconder um erro inesperado atrás de um texto genérico.
 */
const MENSAGENS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed':
    'Você ainda não confirmou seu e-mail. Abra o link que enviamos para a sua caixa de entrada.',
  'User already registered': 'Esse e-mail já está cadastrado.',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'E-mail em formato inválido.',
  'Signups not allowed for this instance': 'O cadastro está desabilitado neste projeto.',
  'Email rate limit exceeded': 'Muitas tentativas seguidas. Espere alguns minutos.',
  'For security purposes, you can only request this after 60 seconds.':
    'Aguarde um minuto antes de tentar de novo.',
  // O gatilho que cria o perfil recusou o cadastro. Como a tela valida os campos
  // antes de enviar, na prática isto só aparece numa corrida: alguém registrou o
  // mesmo nome de usuário entre a checagem de disponibilidade e o envio.
  'Database error saving new user':
    'Não foi possível criar a conta. O nome de usuário pode ter sido escolhido por outra pessoa agora há pouco — tente outro.',
};

export function traduzErroAuth(mensagem: string): string {
  return MENSAGENS[mensagem] ?? traduzErroBanco(mensagem);
}
