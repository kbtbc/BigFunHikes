import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrailMap } from "@/components/TrailMap";
import { Stats } from "@/components/Stats";
import { JournalEntry } from "@/components/JournalEntry";
import { useEntries, useStats } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent, transformApiStatsToComponent } from "@/lib/transformEntries";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: entriesData, isLoading: entriesLoading, error: entriesError } = useEntries(1, 1, {
    enabled: true, // Public access - no authentication required
  });
  const { data: statsData, isLoading: statsLoading, error: statsError } = useStats({
    enabled: true, // Public access - no authentication required
  });

  const latestEntry = entriesData?.entries[0]
    ? transformApiEntryToComponent(entriesData.entries[0])
    : null;
  const allEntries = entriesData?.entries.map(transformApiEntryToComponent) || [];
  const stats = statsData ? transformApiStatsToComponent(statsData) : null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/gemini-generated-image-620sd5620sd5620s.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background"></div>
        </div>

        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 text-shadow">
              BigFun Hikes!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 text-shadow-sm">
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
          ) : stats ? (
            <Stats
              totalMiles={stats.totalMiles}
              milesCompleted={stats.milesCompleted}
              daysOnTrail={stats.daysOnTrail}
              averageDailyMiles={stats.averageDailyMiles}
              totalElevationGain={stats.totalElevationGain}
            />
          ) : null}
        </div>
      </section>

      {/* Latest Entry Section - moved above The Journey */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Latest Entry</h2>
              <p className="text-muted-foreground">
                The most recent update from the trail
              </p>
            </div>
            <Link to="/timeline">
              <Button variant="outline">
                View All Entries
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
                <Link to={`/entry/${latestEntry.id}`}>
                  <Button size="lg">
                    Read Full Entry
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
            <TrailMap entries={allEntries} height="500px" />
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
