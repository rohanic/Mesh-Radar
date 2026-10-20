import { Storage } from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// App settings and content live in a small SQLite key-value store (DEC-017). Mesh data lives in
// the native engine, not here.
const backend: StateStorage = {
  getItem: (k) => Storage.getItemSync(k),
  setItem: (k, v) => Storage.setItemSync(k, v),
  removeItem: (k) => {
    Storage.removeItemSync(k);
  },
};

export const kvStorage = createJSONStorage(() => backend);

export function clearAll(keys: string[]) {
  for (const k of keys) Storage.removeItemSync(k);
}
