/**
 * Tiny IndexedDB wrapper for PR proof videos (too big for localStorage).
 * MVP: videos stay on the lifter's device. When Supabase Storage is connected,
 * replace these three functions with uploads to a "proofs" bucket.
 */
const DB_NAME = "ironleague";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export const saveVideo = (id: string, blob: Blob) =>
  run<IDBValidKey>("readwrite", (s) => s.put(blob, id)).then(() => undefined);

export const getVideo = (id: string) =>
  run<Blob | undefined>("readonly", (s) => s.get(id));

export const deleteVideo = (id: string) =>
  run<undefined>("readwrite", (s) => s.delete(id));

/** Stills extracted for the AI / moderator, stored next to the clip. */
export const saveFrames = (id: string, frames: string[]) =>
  saveVideo(`frames:${id}`, new Blob([JSON.stringify(frames)], { type: "application/json" }));

export async function getFrames(id: string): Promise<string[]> {
  const b = await getVideo(`frames:${id}`);
  if (!b) return [];
  try {
    return JSON.parse(await b.text()) as string[];
  } catch {
    return [];
  }
}

/**
 * Upload queue. Demo: saves the recorded clip on this device.
 * With Supabase: upload to Storage (bucket "lifts") with retry, then insert the attempt row.
 */
export const enqueueUpload = (id: string, blob: Blob) => saveVideo(id, blob);
