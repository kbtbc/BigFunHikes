/**
 * Pending Entries Panel
 * Shows entries that are saved offline and waiting to sync
 */

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CloudOff,
  Loader2,
  Trash2,
  Cloud,
  AlertCircle,
  Clock,
  Mountain,
  Dumbbell,
} from "lucide-react";
import { usePendingEntries, useOfflineStatus } from "@/hooks/use-offline";
import { deletePendingEntry, type PendingEntry } from "@/lib/offline-storage";
import { useToast } from "@/hooks/use-toast";

export function PendingEntriesPanel() {
  const { entries, isLoading, refresh } = usePendingEntries();
  const { isOnline, isSyncing, syncPending } = useOfflineStatus();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await deletePendingEntry(deleteId);
      await refresh();
      toast({
        title: "Entry deleted",
        description: "The offline entry has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncPending();
      await refresh();
      if (result) {
        if (result.success && result.syncedCount > 0) {
          toast({
            title: "Sync complete",
            description: `${result.syncedCount} ${result.syncedCount === 1 ? "entry" : "entries"} synced successfully.`,
          });
        } else if (result.failedCount > 0) {
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Pending Entries</CardTitle>
            <Badge variant="secondary" className="bg-amber-500 text-white">
              {entries.length}
            </Badge>
          </div>
          {isOnline && entries.length > 0 && (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  Sync All
                </>
              )}
            </Button>
          )}
        </div>
        {!isOnline && (
          <p className="text-sm text-muted-foreground mt-1">
            Will auto-sync when you're back online
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <PendingEntryCard
            key={entry.id}
            entry={entry}
            onDelete={() => setDeleteId(entry.id)}
          />
        ))}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offline Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This entry hasn't been synced yet. Deleting it will permanently remove it from your device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface PendingEntryCardProps {
  entry: PendingEntry;
  onDelete: () => void;
}

function PendingEntryCard({ entry, onDelete }: PendingEntryCardProps) {
  const isTraining = entry.data.entryType === "training";
  const createdAt = new Date(entry.createdAt);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isTraining ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
        }`}
      >
        {isTraining ? (
          <Dumbbell className="h-5 w-5" />
        ) : (
          <Mountain className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{entry.data.title}</h4>
          {entry.status === "error" && (
            <Badge variant="destructive" className="text-xs">
              Failed
            </Badge>
          )}
          {entry.status === "syncing" && (
            <Badge variant="secondary" className="text-xs">
              Syncing
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(createdAt, "MMM d, h:mm a")}
          </span>
          {entry.data.milesHiked > 0 && (
            <span>{entry.data.milesHiked} mi</span>
          )}
          {entry.photos.length > 0 && (
            <span>{entry.photos.length} photo{entry.photos.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {entry.status === "error" && entry.errorMessage && (
          <Alert variant="destructive" className="mt-2 py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {entry.errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
