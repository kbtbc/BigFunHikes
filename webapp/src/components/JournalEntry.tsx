import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { type JournalEntry as JournalEntryType } from "@/data/journalEntries";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

interface JournalEntryProps {
  entry: JournalEntryType;
  showFullContent?: boolean;
  className?: string;
}

export function JournalEntry({
  entry,
  showFullContent = false,
  className = "",
}: JournalEntryProps) {
  const formattedDate = format(new Date(entry.date), "MMMM d, yyyy");
  const previewContent = entry.content.split("\n").slice(0, 3).join("\n");

  // Carousel setup for multiple photos
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const hasMultiplePhotos = entry.photos.length > 1;

  return (
    <Card className={`border-2 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      <CardContent className="p-0">
        {/* Header - at the top */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="font-outfit">
              Day {entry.day}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{entry.title}</h2>
        </div>

        {/* Content - below header */}
        <div className="px-6 pb-6">
          <div className="prose prose-sm md:prose-base max-w-none prose-headings:font-outfit prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary prose-blockquote:text-muted-foreground prose-code:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {showFullContent ? entry.content : previewContent}
            </ReactMarkdown>
            {!showFullContent ? (
              <p className="text-muted-foreground italic mt-4">
                <Link to={`/entry/${entry.id}`} className="text-primary hover:underline font-bold">
                  Read the full entry...
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        {/* Photos carousel - below content */}
        {entry.photos.length > 0 ? (
          <div className="relative">
            {/* Main carousel */}
            <div className="overflow-hidden" ref={showFullContent && hasMultiplePhotos ? emblaRef : undefined}>
              <div className={showFullContent && hasMultiplePhotos ? "flex" : ""}>
                {(showFullContent ? entry.photos : [entry.photos[0]]).map((photo, index) => (
                  <div
                    key={index}
                    className={showFullContent && hasMultiplePhotos ? "flex-[0_0_100%] min-w-0" : ""}
                  >
                    <div className={`relative w-full overflow-hidden flex items-center justify-center ${showFullContent && hasMultiplePhotos ? "h-[400px] md:h-[500px] bg-black/5" : ""}`}>
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className={`${showFullContent && hasMultiplePhotos ? "h-full w-auto max-w-full object-contain" : "w-full h-auto object-contain"}`}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm text-shadow text-center">
                          {photo.caption}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation arrows for full content with multiple photos */}
            {showFullContent && hasMultiplePhotos && (
              <>
                <button
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                  {scrollSnaps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollTo(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === selectedIndex
                          ? "bg-white"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Go to photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Photo count indicator for preview mode */}
            {!showFullContent && hasMultiplePhotos && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {entry.photos.length} photos
              </div>
            )}
          </div>
        ) : null}

        {/* Thumbnail strip for full content with multiple photos */}
        {showFullContent && hasMultiplePhotos && (
          <div className="flex gap-2 p-3 bg-muted/50 overflow-x-auto">
            {entry.photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`flex-shrink-0 rounded-md overflow-hidden transition-all ${
                  index === selectedIndex
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-16 h-12 object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Stats - at the bottom */}
        <div className="p-6 pt-4 border-t">
          <div className="flex flex-wrap gap-4">
            <Stat icon={<MapPin />} label="Distance" value={`${entry.miles} mi`} />
            <Stat icon={<TrendingUp />} label="Elevation" value={`${entry.elevationGain} ft`} />
            <Stat
              icon={<MapPin />}
              label="Total Miles"
              value={`${entry.totalMiles} mi`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Stat({ icon, label, value }: StatProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
