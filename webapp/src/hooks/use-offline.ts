/**
 * Hook for managing offline status and pending entries sync
 */

import { useState, useEffect, useCallback } from "react";
import {
  isOnline,
  syncAllPendingEntries,
  addOnlineStatusListener,
  removeOnlineStatusListener,
  type SyncResult,
} from "@/lib/sync-service";
import { getPendingCount, getPendingEntries, type PendingEntry } from "@/lib/offline-storage";

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncResult: null,
  });

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setStatus((prev) => ({ ...prev, pendingCount: count }));
    } catch (error) {
      console.error("Failed to get pending count:", error);
    }
  }, []);

  // Sync pending entries
  const syncPending = useCallback(async () => {
    if (!status.isOnline || status.isSyncing) return;

    setStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await syncAllPendingEntries();
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncResult: result,
      }));
      await refreshPendingCount();
      return result;
    } catch (error) {
      setStatus((prev) => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, [status.isOnline, status.isSyncing, refreshPendingCount]);

  // Listen for online/offline changes
  useEffect(() => {
    const handleStatusChange = (online: boolean) => {
      setStatus((prev) => ({ ...prev, isOnline: online }));

      // Auto-sync when coming back online
      if (online) {
        syncPending().catch(console.error);
      }
    };

    addOnlineStatusListener(handleStatusChange);
    return () => removeOnlineStatusListener(handleStatusChange);
  }, [syncPending]);

  // Initial pending count
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    ...status,
    syncPending,
    refreshPendingCount,
  };
}

// Hook for getting pending entries list
export function usePendingEntries() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const pending = await getPendingEntries();
      setEntries(pending);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load pending entries"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, isLoading, error, refresh };
}
