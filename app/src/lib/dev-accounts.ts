// Contas de teste para troca rápida (estilo Instagram), só em desenvolvimento.
// A lista vem da variável EXPO_PUBLIC_DEV_ACCOUNTS no .env (que não é versionado),
// para não fixar credenciais no código. Formato: JSON de
// [{ "label": "Ana", "email": "...", "password": "..." }, ...]
//
// Em build de produção (__DEV__ === false) a função devolve [] e o seletor some.

export type DevAccount = {
  label: string;
  email: string;
  password: string;
};

// Fallback embutido (só em desenvolvimento): as contas de teste criadas pelo
// seed SQL. Existe para o seletor funcionar sem depender de `expo start -c`
// para carregar a variável de ambiente. Se EXPO_PUBLIC_DEV_ACCOUNTS estiver
// preenchida, ela tem prioridade.
const FALLBACK: DevAccount[] = [
  { label: 'Ana Teste', email: 'ana.teste@toaqui.test', password: 'Teste@123456' },
  { label: 'Bruno Teste', email: 'bruno.teste@toaqui.test', password: 'Teste@123456' },
  { label: 'Carla Teste', email: 'carla.teste@toaqui.test', password: 'Teste@123456' },
  { label: 'Diego Teste', email: 'diego.teste@toaqui.test', password: 'Teste@123456' },
  { label: 'Elena Teste', email: 'elena.teste@toaqui.test', password: 'Teste@123456' },
  { label: 'Felipe Teste', email: 'felipe.teste@toaqui.test', password: 'Teste@123456' },
];

export function getDevAccounts(): DevAccount[] {
  if (!__DEV__) return [];

  const raw = process.env.EXPO_PUBLIC_DEV_ACCOUNTS;
  if (!raw) return FALLBACK;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK;
    return parsed
      .filter((a) => a && typeof a.email === 'string' && typeof a.password === 'string')
      .map((a) => ({
        label: String(a.label ?? a.email),
        email: String(a.email),
        password: String(a.password),
      }));
  } catch {
    // JSON malformado no .env não deve derrubar o app; usa o fallback.
    return FALLBACK;
  }
}
