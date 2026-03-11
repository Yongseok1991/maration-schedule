const DB_NAME = "maraton-db";
const DB_VERSION = 1;
const STORE_ENTRIES = "entries_state";
const KEY_ENTRIES = "entries";

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-not-supported"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        db.createObjectStore(STORE_ENTRIES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("db-open-failed"));
  });

const withStore = async (mode, run) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, mode);
    const store = tx.objectStore(STORE_ENTRIES);
    let output;
    try {
      output = run(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(output);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("db-tx-failed"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("db-tx-aborted"));
    };
  });
};

export const getEntriesFromDb = async () =>
  withStore("readonly", (store) =>
    new Promise((resolve, reject) => {
      const req = store.get(KEY_ENTRIES);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error || new Error("db-read-failed"));
    })
  );

export const saveEntriesToDb = async (entries) =>
  withStore("readwrite", (store) => store.put(Array.isArray(entries) ? entries : [], KEY_ENTRIES));
