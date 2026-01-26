/**
 * Offline Storage Layer
 * Uses IndexedDB to store pending journal entries and photos when offline
 */

import type { CreateJournalEntryInput } from "./api";

// Database configuration
const DB_NAME = "bigfun-hikes-offline";
const DB_VERSION = 1;
const ENTRIES_STORE = "pending-entries";

// Pending entry with photos stored as base64
export interface PendingEntry {
  id: string;
  createdAt: string;
  data: CreateJournalEntryInput;
  photos: PendingPhoto[];
  status: "pending" | "syncing" | "error";
  errorMessage?: string;
  retryCount: number;
}

export interface PendingPhoto {
  id: string;
  caption: string;
  order: number;
  base64: string;
  mimeType: string;
  fileName: string;
}

// Generate unique ID for pending entries
function generateId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Open database connection
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open offline database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create entries store if it doesn't exist
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        const store = db.createObjectStore(ENTRIES_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Convert base64 back to Blob
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Save a pending entry to IndexedDB
export async function savePendingEntry(
  data: CreateJournalEntryInput,
  photos: Array<{ file: File; caption: string; order: number }>
): Promise<PendingEntry> {
  const db = await openDatabase();

  // Convert photos to base64
  const pendingPhotos: PendingPhoto[] = await Promise.all(
    photos.map(async (photo, index) => ({
      id: generateId(),
      caption: photo.caption,
      order: photo.order ?? index,
      base64: await fileToBase64(photo.file),
      mimeType: photo.file.type,
      fileName: photo.file.name,
    }))
  );

  const pendingEntry: PendingEntry = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    data,
    photos: pendingPhotos,
    status: "pending",
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE);
    const request = store.add(pendingEntry);

    request.onsuccess = () => resolve(pendingEntry);
    request.onerror = () => reject(new Error("Failed to save offline entry"));

    transaction.oncomplete = () => db.close();
  });
}

// Get all pending entries
export async function getPendingEntries(): Promise<PendingEntry[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readonly");
    const store = transaction.objectStore(ENTRIES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by createdAt descending
      const entries = request.result as PendingEntry[];
      entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(entries);
    };
    request.onerror = () => reject(new Error("Failed to get pending entries"));

    transaction.oncomplete = () => db.close();
  });
}

// Get count of pending entries
export async function getPendingCount(): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readonly");
    const store = transaction.objectStore(ENTRIES_STORE);
    const index = store.index("status");
    const request = index.count(IDBKeyRange.only("pending"));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Failed to count pending entries"));

    transaction.oncomplete = () => db.close();
  });
}

// Update a pending entry
export async function updatePendingEntry(
  id: string,
  updates: Partial<PendingEntry>
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const entry = getRequest.result as PendingEntry;
      if (!entry) {
        reject(new Error("Entry not found"));
        return;
      }

      const updated = { ...entry, ...updates };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error("Failed to update entry"));
    };
    getRequest.onerror = () => reject(new Error("Failed to get entry"));

    transaction.oncomplete = () => db.close();
  });
}

// Delete a pending entry
export async function deletePendingEntry(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to delete entry"));

    transaction.oncomplete = () => db.close();
  });
}

// Clear all pending entries (use after successful sync or for testing)
export async function clearAllPendingEntries(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRIES_STORE], "readwrite");
    const store = transaction.objectStore(ENTRIES_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to clear entries"));

    transaction.oncomplete = () => db.close();
  });
}
