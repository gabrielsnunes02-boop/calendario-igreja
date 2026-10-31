// Armazenamento offline dos looks (IndexedDB — aguenta muitas imagens).

export interface Look {
  id: string;
  name: string;
  created: number;
  mode: 'free' | 'challenge' | 'client';
  subtitle: string;
  stars: number;
  image: Blob;     // croqui final com fundo branco
  sprite: Blob;    // croqui com fundo transparente (para a passarela)
}

const DB = 'atelie-db';
const STORE = 'looks';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req.result);
    t.onerror = () => rej(t.error);
  }));
}

export const saveLook = (l: Look) => tx('readwrite', (s) => s.put(l)).then(() => undefined);
export const getLook = (id: string) => tx<Look | undefined>('readonly', (s) => s.get(id));
export const deleteLook = (id: string) => tx('readwrite', (s) => s.delete(id)).then(() => undefined);
export const allLooks = () =>
  tx<Look[]>('readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => b.created - a.created));
