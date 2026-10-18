import { useSyncExternalStore } from "react";
import type { StampedItem } from "@/components/stamped-collection";

let memoryCollection: StampedItem[] = [];
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

const EMPTY_SERVER_SNAPSHOT: StampedItem[] = [];

// IndexedDB persistence for large images (no 5MB quota limit)
const IDB_NAME = "stamper_database";
const IDB_STORE = "stamped_items";

function saveToIndexedDb(items: StampedItem[]) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    };
  } catch (e) {
    console.warn("IndexedDB save failed:", e);
  }
}

function loadFromIndexedDb(onLoaded: (items: StampedItem[]) => void) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const results = getAllReq.result;
        if (Array.isArray(results) && results.length > 0) {
          results.sort((a, b) => b.timestamp - a.timestamp);
          onLoaded(results);
        }
      };
    };
  } catch {}
}

// Initial IndexedDB sync on client mount
if (typeof window !== "undefined") {
  loadFromIndexedDb((items) => {
    if (items.length > 0 && memoryCollection.length <= items.length) {
      memoryCollection = items;
      notify();
    }
  });
}

export const collectionStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "stamper_collection") {
        cachedRaw = null;
        notify();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  },

  getSnapshot(): StampedItem[] {
    if (typeof window === "undefined") return memoryCollection;
    try {
      const raw = localStorage.getItem("stamper_collection");
      if (raw === cachedRaw) return memoryCollection;
      cachedRaw = raw;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCollection = parsed;
          return memoryCollection;
        }
      }
      return memoryCollection;
    } catch {
      return memoryCollection;
    }
  },

  getServerSnapshot(): StampedItem[] {
    return EMPTY_SERVER_SNAPSHOT;
  },

  save(items: StampedItem[]): void {
    memoryCollection = items;
    saveToIndexedDb(items);

    try {
      cachedRaw = JSON.stringify(items.slice(0, 30));
      localStorage.setItem("stamper_collection", cachedRaw);
    } catch {
      // If full items exceed 5MB localStorage limit, trim massive raw source data URLs
      try {
        const safeItems = items.slice(0, 20).map((it) => ({
          ...it,
          config: {
            ...it.config,
            imageUrl:
              it.config.imageUrl?.startsWith("data:") &&
              it.config.imageUrl.length > 300000
                ? it.previewDataUrl
                : it.config.imageUrl,
          },
        }));
        cachedRaw = JSON.stringify(safeItems);
        localStorage.setItem("stamper_collection", cachedRaw);
      } catch (err2) {
        console.warn("LocalStorage full, persistent in IndexedDB only:", err2);
      }
    }
    notify();
  },
};

export function useStampedCollection(): [
  StampedItem[],
  (items: StampedItem[]) => void,
] {
  const collection = useSyncExternalStore(
    collectionStore.subscribe,
    collectionStore.getSnapshot,
    collectionStore.getServerSnapshot
  );

  return [collection, collectionStore.save];
}
