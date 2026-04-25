const DB_NAME = 'sqhn_mat_offline';
const DB_VERSION = 1;

let dbPromise = null;

export function initDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingWrites')) {
        db.createObjectStore('pendingWrites', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('voiceQueue')) {
        db.createObjectStore('voiceQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

function getDb() {
  return dbPromise || initDb();
}

function tx(storeName, mode, fn) {
  return getDb().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  }));
}

export async function cacheSet(key, data, ttlMinutes = 60) {
  const record = {
    key,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMinutes * 60000,
  };
  return tx('cachedData', 'readwrite', store => store.put(record));
}

export async function cacheGet(key) {
  const record = await tx('cachedData', 'readonly', store => store.get(key));
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record.data;
}

export async function queueWrite(functionName, params) {
  return tx('pendingWrites', 'readwrite', store =>
    store.add({ functionName, params, queuedAt: Date.now(), status: 'pending' })
  );
}

export async function getPendingWrites() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingWrites', 'readonly');
    const store = transaction.objectStore('pendingWrites');
    const req = store.getAll();
    req.onsuccess = (e) => resolve((e.target.result || []).filter(r => r.status === 'pending'));
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function markWriteComplete(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingWrites', 'readwrite');
    const store = transaction.objectStore('pendingWrites');
    const getReq = store.get(id);
    getReq.onsuccess = (e) => {
      const record = e.target.result;
      if (!record) { resolve(); return; }
      record.status = 'completed';
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = (err) => reject(err.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

export async function queueVoiceNote(data) {
  return tx('voiceQueue', 'readwrite', store => store.add(data));
}

export async function getPendingVoiceNotes() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('voiceQueue', 'readonly');
    const store = transaction.objectStore('voiceQueue');
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function clearVoiceNote(id) {
  return tx('voiceQueue', 'readwrite', store => store.delete(id));
}