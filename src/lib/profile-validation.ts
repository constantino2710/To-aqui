/**
 * As mesmas regras que o banco aplica em `private.create_profile_for_user` e nos
 * CHECKs de `public.profiles`.
 *
 * A duplicação é proposital, e a ordem importa: o banco é a garantia, isto aqui
 * é conveniência. Validar na tela evita que a pessoa preencha o formulário
 * inteiro para receber de volta o "Database error saving new user" que o GoTrue
 * devolve quando o gatilho recusa — mensagem que não ajuda ninguém.
 *
 * Se mudar alguma regra aqui, mude na migration junto. O contrário também vale.
 */

export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export function validarUsername(valor: string): string | null {
  const limpo = valor.trim();
  if (!limpo) return 'Escolha um nome de usuário.';
  if (!USERNAME_REGEX.test(limpo)) {
    return 'Use de 3 a 30 caracteres: letras, números, ponto e underline.';
  }
  return null;
}

export function validarNomeCompleto(valor: string): string | null {
  const limpo = valor.trim();
  if (limpo.length < 2) return 'Informe seu nome.';
  if (limpo.length > 80) return 'Use no máximo 80 caracteres.';
  return null;
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function validarTelefone(valor: string): string | null {
  const digitos = apenasDigitos(valor);
  if (!digitos) return 'Informe seu telefone.';
  if (digitos.startsWith('0')) return 'DDD inválido — não comece com zero.';
  // DDD (2) + 8 dígitos no fixo ou 9 no celular.
  if (digitos.length < 10) return 'Faltou o DDD ou algum dígito.';
  if (digitos.length > 11) return 'Número longo demais. Use só DDD e número.';
  return null;
}

/** Formata para exibição: (81) 99999-8888. O banco guarda em E.164. */
export function formatarTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
