import { File, Paths } from 'expo-file-system';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';
import { Platform } from 'react-native';

export type ResultadoSalvarQr = 'salvo' | 'permissao-negada';

/** Salva um PNG Base64 na galeria do Android/iOS com acesso somente de escrita. */
export async function salvarImagemQr(base64: string, nomeArquivo: string): Promise<ResultadoSalvarQr> {
  // Android 13+ permite que o app adicione uma imagem própria ao MediaStore
  // sem receber acesso às fotos que já existem no aparelho. No Expo Go, pedir
  // essa permissão desnecessária pode voltar como negada e bloquear o download.
  const androidSemPermissaoDeEscrita = Platform.OS === 'android' && Number(Platform.Version) >= 33;

  if (!androidSemPermissaoDeEscrita) {
    const permissao = await requestPermissionsAsync(true, []);
    if (permissao.status !== 'granted') return 'permissao-negada';
  }

  const arquivo = new File(Paths.cache, nomeArquivo);
  if (arquivo.exists) arquivo.delete();
  arquivo.write(base64, { encoding: 'base64' });
  await saveToLibraryAsync(arquivo.uri);
  return 'salvo';
}
