/**
 * As funções do banco levantam exceções com um código no começo da mensagem —
 * `USERNAME_EM_USO: ...`, `JA_SAO_AMIGOS: ...`. O código existe porque a mensagem
 * atravessa PostgREST (e às vezes o GoTrue) antes de chegar aqui, e nem sempre
 * chega inteira: procurar por um código é confiável, comparar a frase toda não é.
 *
 * Erros que não estão nesta lista passam direto. Esconder um erro desconhecido
 * atrás de "algo deu errado" só transfere o problema para o suporte depois.
 */
const CODIGOS: Record<string, string> = {
  // Cadastro
  PERFIL_INCOMPLETO: 'Preencha nome completo, nome de usuário e telefone.',
  USERNAME_INVALIDO: 'Nome de usuário inválido: use de 3 a 30 caracteres, sem espaços.',
  NOME_INVALIDO: 'Nome completo inválido.',
  TELEFONE_INVALIDO: 'Telefone inválido. Informe DDD e número, como (81) 99999-8888.',
  USERNAME_EM_USO: 'Esse nome de usuário já está sendo usado. Escolha outro.',

  // Amizade
  AMIZADE_CONSIGO: 'Você não pode adicionar a si mesmo.',
  PESSOA_NAO_ENCONTRADA: 'Não encontramos essa pessoa.',
  JA_SAO_AMIGOS: 'Vocês já são amigos.',
  PEDIDO_NAO_ENCONTRADO: 'Esse pedido não existe mais.',
  PEDIDO_JA_RESPONDIDO: 'Esse pedido já foi respondido.',
};

/** Mensagens do Postgres que não têm código nosso, mas são previsíveis. */
const PADROES: { contem: string; texto: string }[] = [
  {
    contem: 'ficaria sem chefe',
    texto:
      'Você é o único chefe desta família. Promova outra pessoa a chefe antes de sair.',
  },
  {
    contem: 'row-level security',
    texto: 'Você não tem permissão para fazer isso.',
  },
  {
    contem: 'duplicate key value',
    texto: 'Isso já existe.',
  },
];

export function traduzErroBanco(mensagem: string): string {
  for (const [codigo, texto] of Object.entries(CODIGOS)) {
    if (mensagem.includes(codigo)) return texto;
  }
  for (const { contem, texto } of PADROES) {
    if (mensagem.includes(contem)) return texto;
  }
  return mensagem;
}
