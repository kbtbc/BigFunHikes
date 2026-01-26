/**
 * Sync Service
 * Handles syncing pending offline entries when back online
 */

import { entriesApi, api } from "./api";
import {
  getPendingEntries,
  updatePendingEntry,
  deletePendingEntry,
  base64ToBlob,
  type PendingEntry,
} from "./offline-storage";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ entryId: string; error: string }>;
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Sync a single pending entry
async function syncEntry(entry: PendingEntry): Promise<void> {
  // Mark as syncing
  await updatePendingEntry(entry.id, { status: "syncing" });

  try {
    // Create the entry on the server
    const newEntry = await entriesApi.create(entry.data);

    // Upload photos if any
    for (const photo of entry.photos) {
      const blob = base64ToBlob(photo.base64, photo.mimeType);
      const file = new File([blob], photo.fileName, { type: photo.mimeType });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", photo.caption);
      formData.append("order", photo.order.toString());

      const response = await api.raw(
        `/api/entries/${newEntry.id}/photos/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        console.warn(`Failed to upload photo for entry ${entry.id}`);
      }
    }

    // Success - delete from pending
    await deletePendingEntry(entry.id);
  } catch (error) {
    // Mark as error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await updatePendingEntry(entry.id, {
      status: "error",
      errorMessage,
      retryCount: entry.retryCount + 1,
    });
    throw error;
  }
}

// Sync all pending entries
export async function syncAllPendingEntries(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (!isOnline()) {
    return { ...result, success: false };
  }

  const pendingEntries = await getPendingEntries();
  const toSync = pendingEntries.filter(
    (e) => e.status === "pending" || e.status === "error"
  );

  for (const entry of toSync) {
    try {
      await syncEntry(entry);
      result.syncedCount++;
    } catch (error) {
      result.failedCount++;
      result.errors.push({
        entryId: entry.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  result.success = result.failedCount === 0;
  return result;
}

// Listeners for online/offline events
type OnlineStatusCallback = (isOnline: boolean) => void;
const statusListeners: Set<OnlineStatusCallback> = new Set();

export function addOnlineStatusListener(callback: OnlineStatusCallback): void {
  statusListeners.add(callback);
}

export function removeOnlineStatusListener(
  callback: OnlineStatusCallback
): void {
  statusListeners.delete(callback);
}

// Initialize listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    statusListeners.forEach((cb) => cb(true));
  });

  window.addEventListener("offline", () => {
    statusListeners.forEach((cb) => cb(false));
  });
}
