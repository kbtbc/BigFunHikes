import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrailMap } from "@/components/TrailMap";
import { EnhancedStats } from "@/components/EnhancedStats";
import { JournalEntry } from "@/components/JournalEntry";
import { useEntries, useStats } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent } from "@/lib/transformEntries";
import { ArrowRight, AlertCircle, Youtube, Dumbbell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: entriesData, isLoading: entriesLoading, error: entriesError } = useEntries(1, 20, {
    enabled: true, // Public access - no authentication required
  });
  const { data: statsData, isLoading: statsLoading, error: statsError } = useStats({
    enabled: true, // Public access - no authentication required
  });

  const allEntries = entriesData?.entries.map(transformApiEntryToComponent) || [];

  // Find the most recent training entry, or fall back to the latest entry
  const latestTrainingEntry = allEntries.find(e => e.entryType === 'training');
  const latestEntry = latestTrainingEntry || allEntries[0] || null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/r4hf8ay49q0jd8fdqh8igqsrfzhf5mc-vvnffmed-uq.webp')",
            // Previous: "url('/gemini-generated-image-620sd5620sd5620s.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background"></div>
        </div>

        <div className="relative flex items-center justify-center text-center px-4 py-8 md:py-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 text-shadow">
              BigFun Hikes!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-6 text-shadow-sm">
              Follow my journey along the Appalachian Trail
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/timeline">
                <Button size="lg" className="font-semibold">
                  Read the Journal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 max-w-md mx-auto">
              <Alert className="bg-amber-50/95 dark:bg-amber-950/95 border-amber-200 dark:border-amber-800 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                  <strong>Under Construction</strong> - Hitting the trail mid-Feb!<br />(some sample data used)
                </AlertDescription>
              </Alert>
            </div>

            {/* YouTube Intro Video */}
            <div className="mt-6 max-w-sm mx-auto">
              <div className="rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/kgKnqN4yDGU"
                    title="BigFun Hikes Intro"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
              <a
                href="https://www.youtube.com/@BigFunHikes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-white/80 hover:text-white transition-colors text-sm"
              >
                <Youtube className="h-4 w-4" />
                Subscribe on YouTube
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {authLoading || statsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ) : statsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load statistics. Please try again later.
              </AlertDescription>
            </Alert>
          ) : statsData ? (
            <EnhancedStats stats={statsData} />
          ) : null}
        </div>
      </section>

      {/* Latest Entry Section - moved above The Journey */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              {latestEntry?.entryType === "training" && (
                <Dumbbell className="h-8 w-8 text-amber-500" />
              )}
              {latestEntry?.entryType === "training" ? "Latest Training" : "Latest Entry"}
            </h2>
            <p className="text-muted-foreground">
              {latestEntry?.entryType === "training"
                ? "The most recent training hike"
                : "The most recent update from the trail"}
            </p>
          </div>
          {entriesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : entriesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load entries. Please try again later.
              </AlertDescription>
            </Alert>
          ) : latestEntry ? (
            <>
              <div className="max-w-[66%] mx-auto">
                <JournalEntry entry={latestEntry} />
              </div>
              <div className="mt-6 text-center">
                <Link to="/timeline">
                  <Button size="lg">
                    View All Entries
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No journal entries yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Map Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">The Journey</h2>
          <p className="text-muted-foreground mb-8">
            Tracking my progress along the 2,190-mile Appalachian Trail
          </p>
          {entriesLoading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : entriesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load entries. Please try again later.
              </AlertDescription>
            </Alert>
          ) : (
            <TrailMap
              height="500px"
              showFullTrail={true}
              latestEntryMarker={
                latestEntry && latestEntry.coordinates.start[0] !== 34.6266
                  ? {
                      lat: latestEntry.coordinates.start[0],
                      lng: latestEntry.coordinates.start[1],
                      title: latestEntry.title,
                      day: latestEntry.day,
                      id: latestEntry.id,
                    }
                  : null
              }
            />
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Follow the Adventure
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join me on this incredible journey as I hike the entire Appalachian Trail,
            one step at a time.
          </p>
          <Link to="/timeline">
            <Button
              size="lg"
              variant="secondary"
              className="font-semibold"
            >
              Explore the Timeline
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              BigFun Hikes - Following the 2200 mi Appalachian Trail
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
