export type ResultadoSalvarQr = 'salvo' | 'permissao-negada';

/** No navegador, usa o download nativo sem solicitar acesso à galeria. */
export async function salvarImagemQr(base64: string, nomeArquivo: string): Promise<ResultadoSalvarQr> {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64}`;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return 'salvo';
}
