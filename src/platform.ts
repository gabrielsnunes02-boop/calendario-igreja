// Integração com o Android (compartilhar imagem, botão voltar) com alternativa para o navegador.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from './ui';

export const isNative = Capacitor.isNativePlatform();

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

export async function shareImage(blob: Blob, name: string) {
  const safe = name.normalize('NFD').replace(/[^\w-]+/g, '_').slice(0, 40) || 'croqui';
  try {
    if (isNative) {
      const data = await blobToBase64(blob);
      const file = await Filesystem.writeFile({ path: `${safe}.png`, data, directory: Directory.Cache });
      await Share.share({ title: name, files: [file.uri], dialogTitle: 'Compartilhar croqui' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${safe}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  } catch (e) {
    if (!String(e).includes('cancel')) toast('Não deu para compartilhar agora 😕');
  }
}

export function onBackButton(handler: () => void) {
  if (isNative) App.addListener('backButton', handler);
}

export function exitApp() { if (isNative) App.exitApp(); }
