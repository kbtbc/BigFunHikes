import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { MapPin, TrendingUp, Calendar, ChevronLeft, ChevronRight, Dumbbell, Play, X } from "lucide-react";
import { type JournalEntry as JournalEntryType } from "@/data/journalEntries";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";

// Media item type for unified carousel
interface MediaItem {
  type: "photo" | "video";
  url: string;
  thumbnailUrl?: string;
  caption: string;
  duration?: number;
}

interface JournalEntryProps {
  entry: JournalEntryType;
  showFullContent?: boolean;
  className?: string;
}

export interface JournalEntryRef {
  scrollToPhoto: (photoIndex: number) => void;
}

export const JournalEntry = forwardRef<JournalEntryRef, JournalEntryProps>(function JournalEntry({
  entry,
  showFullContent = false,
  className = "",
}, ref) {
  const formattedDate = format(new Date(entry.date), "MMMM d, yyyy");
  const previewContent = entry.content.split("\n").slice(0, 3).join("\n");
  const isTraining = entry.entryType === "training";

  // Video modal state
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // Combine photos and videos into unified media array
  const mediaItems: MediaItem[] = [
    ...entry.photos.map((photo) => ({
      type: "photo" as const,
      url: photo.url,
      caption: photo.caption,
    })),
    ...(entry.videos || []).map((video) => ({
      type: "video" as const,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      caption: video.caption,
      duration: video.duration,
    })),
  ];

  // Carousel setup for multiple media items
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  // Expose scrollToPhoto method for external control (e.g., from Activity Player)
  useImperativeHandle(ref, () => ({
    scrollToPhoto: (photoIndex: number) => {
      if (photoIndex >= 0 && photoIndex < mediaItems.length && emblaApi) {
        emblaApi.scrollTo(photoIndex);
        // Scroll the carousel into view
        const carouselElement = document.querySelector('[data-photo-carousel]');
        carouselElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  }), [emblaApi, mediaItems.length]);

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

  const hasMultipleMedia = mediaItems.length > 1;

  // Format video duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Media count text for preview mode
  const getMediaCountText = () => {
    const photoCount = entry.photos.length;
    const videoCount = entry.videos?.length || 0;
    const parts: string[] = [];
    if (photoCount > 0) parts.push(`${photoCount} photo${photoCount > 1 ? "s" : ""}`);
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
    return parts.join(", ");
  };

  return (
    <Card className={`border-2 shadow-lg hover:shadow-xl transition-shadow ${isTraining ? "hover:border-amber-500" : "hover:border-primary"} ${className}`}>
      <CardContent className="p-0">
        {/* Header - at the top */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="secondary"
              className={`font-outfit ${isTraining ? "bg-amber-500 text-white" : ""}`}
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
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{entry.title}</h2>
        </div>

        {/* Content - below header */}
        <div className="px-6 pb-6">
          <div className={`prose prose-sm md:prose-base max-w-none prose-headings:font-outfit prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary prose-blockquote:text-muted-foreground prose-code:text-foreground prose-li:text-foreground ${showFullContent ? 'journal-full-content' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
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

        {/* Media carousel - below content */}
        {mediaItems.length > 0 ? (
          <div className="relative" data-photo-carousel>
            {/* Main carousel */}
            <div className="overflow-hidden" ref={showFullContent && hasMultipleMedia ? emblaRef : undefined}>
              <div className={showFullContent && hasMultipleMedia ? "flex" : ""}>
                {(showFullContent ? mediaItems : [mediaItems[0]]).map((media, index) => (
                  <div
                    key={index}
                    className={showFullContent && hasMultipleMedia ? "flex-[0_0_100%] min-w-0" : ""}
                  >
                    <div className={`relative w-full overflow-hidden flex items-center justify-center ${showFullContent && hasMultipleMedia ? "h-[400px] md:h-[500px] bg-black/5" : ""}`}>
                      {media.type === "photo" ? (
                        <LazyImage
                          src={media.url}
                          alt={media.caption}
                          className={`${showFullContent && hasMultipleMedia ? "h-full w-auto max-w-full object-contain" : "w-full h-auto object-contain"}`}
                          fallbackClassName={`${showFullContent && hasMultipleMedia ? "h-full w-full" : "w-full h-48"}`}
                        />
                      ) : (
                        <button
                          onClick={() => setPlayingVideoUrl(media.url)}
                          className="relative w-full h-full"
                        >
                          <LazyImage
                            src={media.thumbnailUrl || ""}
                            alt={media.caption}
                            className={`${showFullContent && hasMultipleMedia ? "h-full w-auto max-w-full object-contain" : "w-full h-auto object-contain"}`}
                            fallbackClassName={`${showFullContent && hasMultipleMedia ? "h-full w-full" : "w-full h-48"}`}
                          />
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 rounded-full p-4 hover:bg-black/80 transition-colors">
                              <Play className="h-10 w-10 text-white fill-white" />
                            </div>
                          </div>
                          {/* Duration badge */}
                          {media.duration !== undefined && (
                            <div className="absolute bottom-12 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(media.duration)}
                            </div>
                          )}
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm text-shadow text-center">
                          {media.caption}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation arrows for full content with multiple media */}
            {showFullContent && hasMultipleMedia && (
              <>
                <button
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Next media"
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
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Media count indicator for preview mode */}
            {!showFullContent && hasMultipleMedia && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {getMediaCountText()}
              </div>
            )}
          </div>
        ) : null}

        {/* Thumbnail strip for full content with multiple media */}
        {showFullContent && hasMultipleMedia && (
          <div className="flex gap-2 p-3 bg-muted/50 overflow-x-auto">
            {mediaItems.map((media, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`relative flex-shrink-0 rounded-md overflow-hidden transition-all ${
                  index === selectedIndex
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <LazyImage
                  src={media.type === "photo" ? media.url : (media.thumbnailUrl || "")}
                  alt={media.caption}
                  className="w-16 h-12 object-cover"
                  fallbackClassName="w-16 h-12"
                />
                {/* Play icon overlay for video thumbnails */}
                {media.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-1">
                      <Play className="h-4 w-4 text-white fill-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Video player modal */}
        {playingVideoUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setPlayingVideoUrl(null)}
          >
            <button
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              aria-label="Close video"
            >
              <X className="h-8 w-8" />
            </button>
            <video
              src={playingVideoUrl}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
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
});

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
