import { useSyncExternalStore } from "react";
import type { StampedItem } from "@/components/stamped-collection";

let memoryCollection: StampedItem[] = [];
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

const EMPTY_SERVER_SNAPSHOT: StampedItem[] = [];

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
        if (Array.isArray(parsed)) {
          memoryCollection = parsed;
          return memoryCollection;
        }
      }
      memoryCollection = [];
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
    cachedRaw = JSON.stringify(items.slice(0, 30));
    try {
      localStorage.setItem("stamper_collection", cachedRaw);
    } catch {
      // Ignore quota exceeded
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
