import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Calendar, Dumbbell } from "lucide-react";
import { type JournalEntry } from "@/data/journalEntries";

interface TimelineProps {
  entries: JournalEntry[];
  className?: string;
}

export function Timeline({ entries, className = "" }: TimelineProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Timeline line with gradient - centered at left-[33px] (32px + 1px for center of 2px line) */}
      <div className="absolute left-[33px] top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary via-primary/50 to-transparent hidden md:block"></div>

      {/* Timeline entries */}
      <div className="space-y-12">
        {entries.map((entry, index) => (
          <TimelineEntryCard key={entry.id} entry={entry} index={index} />
        ))}
      </div>
    </div>
  );
}

interface TimelineEntryCardProps {
  entry: JournalEntry;
  index: number;
}

function TimelineEntryCard({ entry, index }: TimelineEntryCardProps) {
  const formattedDate = format(new Date(entry.date), "MMMM d, yyyy");
  const isTraining = entry.entryType === "training";

  // Get preview text - skip markdown headers and get first real paragraph
  const getPreview = () => {
    const lines = entry.content.split("\n").filter((line) => line.trim());
    const nonHeaderLine = lines.find((line) => !line.startsWith("#"));
    return nonHeaderLine || lines[0] || "";
  };

  return (
    <div
      id={`entry-${entry.id}`}
      className="relative animate-in fade-in slide-in-from-bottom-4 scroll-mt-24"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Timeline dot with enhanced styling - centered at same point as line (left-[33px]) */}
      <div className={`absolute left-[33px] top-6 w-7 h-7 -translate-x-1/2 rounded-full border-4 border-background shadow-lg z-10 hidden md:flex items-center justify-center ${
        isTraining ? "bg-amber-500 shadow-amber-500/50" : "bg-primary shadow-primary/50"
      }`}>
        {isTraining ? (
          <Dumbbell className="w-3 h-3 text-white" />
        ) : (
          <div className="w-3 h-3 rounded-full bg-background" />
        )}
      </div>

      {/* Content */}
      <Link to={`/entry/${entry.id}`} className="block md:ml-20">
        <Card className={`border-2 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden bg-card ${
          isTraining ? "hover:border-amber-500" : "hover:border-primary"
        }`}>
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Thumbnail with overlay */}
              {entry.photos && entry.photos.length > 0 ? (
                <div className="relative w-full md:w-64 overflow-hidden">
                  <img
                    src={entry.photos[0].url}
                    alt={entry.title}
                    className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Day badge */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant="secondary"
                      className={`font-outfit font-bold border-0 px-3 py-1 shadow-lg ${
                        isTraining
                          ? "bg-amber-500 text-white"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isTraining ? (
                        <span className="flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5" />
                          Training
                        </span>
                      ) : (
                        `Day ${entry.day}`
                      )}
                    </Badge>
                  </div>

                  {/* Date badge */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-1.5 text-white text-sm font-medium drop-shadow-lg">
                      <Calendar className="h-4 w-4" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`relative w-full md:w-64 h-56 flex items-center justify-center ${
                  isTraining
                    ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                    : "bg-gradient-to-br from-primary/20 to-secondary/20"
                }`}>
                  <div className="text-center p-4">
                    <Badge
                      variant="secondary"
                      className={`font-outfit font-bold mb-2 ${
                        isTraining ? "bg-amber-500 text-white" : ""
                      }`}
                    >
                      {isTraining ? (
                        <span className="flex items-center gap-1.5">
                          <Dumbbell className="h-3.5 w-3.5" />
                          Training
                        </span>
                      ) : (
                        `Day ${entry.day}`
                      )}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 p-6 md:p-8">
                <h3 className={`text-2xl font-bold mb-3 transition-colors font-outfit ${
                  isTraining ? "group-hover:text-amber-600" : "group-hover:text-primary"
                }`}>
                  {entry.title}
                </h3>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className={`h-4 w-4 ${isTraining ? "text-amber-500" : "text-primary"}`} />
                    <span className="font-semibold">{entry.miles} mi</span>
                  </div>
                  {entry.elevationGain > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <span className="font-semibold">{entry.elevationGain.toLocaleString()} ft</span>
                    </div>
                  )}
                  {!isTraining && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span>Total: {entry.totalMiles.toFixed(1)} mi</span>
                    </div>
                  )}
                </div>

                {/* Preview text */}
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {getPreview()}
                </p>

                {/* Photos indicator */}
                {entry.photos && entry.photos.length > 1 && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {entry.photos.slice(0, 3).map((photo, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-muted"
                        >
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      +{entry.photos.length - 1} more photo{entry.photos.length > 2 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
