/**
 * Offline Status Indicator
 * Shows connection status and pending sync items
 */

import { useState } from "react";
import { WifiOff, Cloud, CloudOff, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOfflineStatus } from "@/hooks/use-offline";
import { useToast } from "@/hooks/use-toast";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineStatus();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSync = async () => {
    try {
      const result = await syncPending();
      if (result) {
        if (result.success) {
          toast({
            title: "Sync complete",
            description: `${result.syncedCount} ${result.syncedCount === 1 ? "entry" : "entries"} synced successfully.`,
          });
        } else {
          toast({
            title: "Sync partially complete",
            description: `${result.syncedCount} synced, ${result.failedCount} failed.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not sync entries. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't show anything if online with no pending entries
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative gap-2 ${
            !isOnline
              ? "text-amber-600 hover:text-amber-700"
              : pendingCount > 0
                ? "text-blue-600 hover:text-blue-700"
                : ""
          }`}
        >
          {!isOnline ? (
            <WifiOff className="h-4 w-4" />
          ) : isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : pendingCount > 0 ? (
            <CloudOff className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )}

          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-600">Offline</span>
              </>
            )}
          </div>

          {/* Offline Message */}
          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              You're offline. Entries will be saved locally and synced when you're back online.
            </p>
          )}

          {/* Pending Entries */}
          {pendingCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {pendingCount} {pendingCount === 1 ? "entry" : "entries"} pending
                </span>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="h-7 text-xs"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Cloud className="h-3 w-3 mr-1" />
                        Sync Now
                      </>
                    )}
                  </Button>
                )}
              </div>

              {!isOnline && (
                <p className="text-xs text-muted-foreground">
                  Will auto-sync when connection is restored.
                </p>
              )}
            </div>
          )}

          {/* All Synced Message */}
          {isOnline && pendingCount === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              All entries synced
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
