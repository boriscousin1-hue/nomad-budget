// Couche hors-ligne : IndexedDB pour (1) un instantané des données d'un voyage
// (consultation sans réseau) et (2) une file d'attente d'écritures faites hors-ligne,
// rejouées à la reconnexion. Tout est sans dépendance et garde-fou SSR.

const DB_NAME = 'nomad-offline'
const DB_VERSION = 1
const STORE_SNAPSHOT = 'snapshots' // keyPath: tripId
const STORE_QUEUE = 'queue' // keyPath: localId

export type QueueKind = 'expense.insert'

export type QueuedMutation = {
  localId: string // = id temporaire de la ligne créée localement
  kind: QueueKind
  tripId: string
  payload: Record<string, unknown> // corps prêt pour supabase.insert
  createdAt: number
}

// Un instantané est un objet libre { expenses, categories, ... } sérialisable.
export type Snapshot = { tripId: string; data: Record<string, unknown>; savedAt: number }

function hasIDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) db.createObjectStore(STORE_SNAPSHOT, { keyPath: 'tripId' })
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: 'localId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

// ---- Instantané (consultation hors-ligne) ----

export async function saveSnapshot(tripId: string, data: Record<string, unknown>): Promise<void> {
  if (!hasIDB()) return
  try {
    await tx(STORE_SNAPSHOT, 'readwrite', (s) => s.put({ tripId, data, savedAt: Date.now() } as Snapshot))
  } catch {
    /* quota/privé : on ignore, le hors-ligne est un bonus */
  }
}

export async function loadSnapshot(tripId: string): Promise<Snapshot | null> {
  if (!hasIDB()) return null
  try {
    const snap = await tx<Snapshot | undefined>(STORE_SNAPSHOT, 'readonly', (s) => s.get(tripId) as IDBRequest<Snapshot | undefined>)
    return snap || null
  } catch {
    return null
  }
}

// ---- File d'attente d'écritures ----

export async function enqueue(m: QueuedMutation): Promise<void> {
  if (!hasIDB()) return
  await tx(STORE_QUEUE, 'readwrite', (s) => s.put(m))
}

export async function getQueue(): Promise<QueuedMutation[]> {
  if (!hasIDB()) return []
  try {
    const all = await tx<QueuedMutation[]>(STORE_QUEUE, 'readonly', (s) => s.getAll() as IDBRequest<QueuedMutation[]>)
    return (all || []).sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    return []
  }
}

export async function getQueueForTrip(tripId: string): Promise<QueuedMutation[]> {
  return (await getQueue()).filter((m) => m.tripId === tripId)
}

export async function dequeue(localId: string): Promise<void> {
  if (!hasIDB()) return
  await tx(STORE_QUEUE, 'readwrite', (s) => s.delete(localId))
}
