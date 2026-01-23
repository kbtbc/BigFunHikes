import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { JournalEntry } from "@/components/JournalEntry";
import { TrailMap } from "@/components/TrailMap";
import { useEntry, useDeleteEntry } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent } from "@/lib/transformEntries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AlertCircle, ArrowLeft, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: apiEntry, isLoading: entryLoading, error: entryError } = useEntry(id || "", {
    enabled: !!id,
  });
  const deleteMutation = useDeleteEntry();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const entry = apiEntry ? transformApiEntryToComponent(apiEntry) : null;

  // Scroll to top when entry loads (after create/edit navigation)
  useEffect(() => {
    if (entry) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [id, entry]);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Entry deleted",
        description: "The journal entry has been deleted successfully.",
      });
      navigate("/timeline");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Handle loading state
  if (authLoading || entryLoading) {
    return (
      <div className="min-h-screen py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-32 mb-6" />
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (entryError) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 text-center">
          <Alert variant="destructive" className="max-w-md mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {entryError?.message || "Failed to load entry. Please try again later."}
            </AlertDescription>
          </Alert>
          <Link to="/timeline">
            <Button size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Timeline
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle not found state
  if (!entry) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Entry Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The journal entry you're looking for doesn't exist.
          </p>
          <Link to="/timeline">
            <Button size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Timeline
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Format the creation timestamp with both date and time
  const formattedDateTime = entry?.createdAt
    ? format(new Date(entry.createdAt), "MMMM d, yyyy 'at' h:mm a")
    : entry
    ? format(new Date(entry.date), "MMMM d, yyyy")
    : "";

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Date and time heading */}
        <div className="mb-6">
          <h2 className="text-sm italic text-muted-foreground">{formattedDateTime}</h2>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          {/* Admin Actions */}
          {isAuthenticated && (
            <div className="mb-6 flex gap-2 justify-end">
              <Link to={`/entry/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Entry
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Entry
              </Button>
            </div>
          )}

          <JournalEntry entry={entry} showFullContent={true} />

          {/* Map section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-4">Today's Route</h3>
            <TrailMap entries={[entry]} selectedEntry={entry} height="400px" />
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t flex justify-between items-center">
            <Link to="/timeline">
              <Button size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Timeline
              </Button>
            </Link>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the journal
                entry "{entry?.title}" and all associated photos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
