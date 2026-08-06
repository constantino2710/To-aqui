import { Redirect } from 'expo-router';

/** Compatibilidade com links antigos; o detalhe agora abre em modal na família. */
export default function QrCodeRedirect() {
  return <Redirect href="/" />;
}
