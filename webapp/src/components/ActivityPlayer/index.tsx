/**
 * ActivityPlayer - Main component for Relive-style activity playback
 * Combines animated map, synchronized charts, and playback controls
 *
 * Phase 1 Enhancements:
 * - 3D Terrain Mode with Mapbox terrain extrusion
 * - Camera Modes: Follow, Overview, First-Person
 * - Photo timestamps for timed display during playback
 * - Segment highlighting from chart selection
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";
import { ActivityMap, type ColorMode, type CameraMode, type MapStyle, type ActivityMapRef } from "./ActivityMap";
import { ActivityCharts } from "./ActivityCharts";
import { MapOverlayControls } from "./MapOverlayControls";
import { PhotoReveal } from "./PhotoReveal";
import { VideoReveal, type ActivityVideo } from "./VideoReveal";
import {
  parseActivityData,
  hasActivityData,
  resampleDataPoints,
  type ActivityData,
  type ActivityPhoto,
} from "@/lib/activity-data-parser";

interface Photo {
  id: string;
  url: string;
  caption?: string | null;
  timestamp?: string | null; // Photo creation timestamp
  latitude?: number | null;
  longitude?: number | null;
}

interface Video {
  id: string;
  url: string;
  thumbnailUrl: string;
  duration: number; // seconds
  caption?: string | null;
  timestamp?: string | null; // Video creation timestamp
  latitude?: number | null;
  longitude?: number | null;
}

// Union type for unified media items in the timeline
type MediaType = "photo" | "video";

interface ActivityMedia {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string; // Videos have thumbnails, photos use their url
  caption?: string | null;
  timestamp?: number; // ms since activity start
  lat?: number;
  lon?: number;
  duration?: number; // Only for videos
}

interface ActivityPlayerProps {
  suuntoData?: string | null;
  gpxData?: string | null;
  photos?: Photo[];
  videos?: Video[];
  entryDate?: string;
  onPhotoClick?: (photoId: string) => void;
}

export function ActivityPlayer({
  suuntoData,
  gpxData,
  photos = [],
  videos = [],
  entryDate,
  onPhotoClick,
}: ActivityPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(4);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");

  // Phase 1 Enhancement states
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);
  const [showStats, setShowStats] = useState(true);

  // Photo reveal state
  const [revealingPhoto, setRevealingPhoto] = useState<ActivityPhoto | null>(null);
  const [isManualPhotoReveal, setIsManualPhotoReveal] = useState(false);
  const shownPhotoIds = useRef<Set<string>>(new Set());
  const lastSeekIndex = useRef<number>(0);

  // Video reveal state
  const [revealingVideo, setRevealingVideo] = useState<ActivityVideo | null>(null);
  const [isManualVideoReveal, setIsManualVideoReveal] = useState(false);
  const shownVideoIds = useRef<Set<string>>(new Set());

  // Refs to store mapped media for seek handler access
  const activityPhotosRef = useRef<ActivityPhoto[]>([]);
  const activityVideosRef = useRef<ActivityVideo[]>([]);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<ActivityMapRef>(null);

  // Check if we have playable data
  const hasData = useMemo(() => {
    const result = hasActivityData({ suuntoData, gpxData });
    console.log("[ActivityPlayer] hasActivityData check:", {
      suuntoData: suuntoData ? `${suuntoData.substring(0, 100)}...` : null,
      gpxData: gpxData ? `${gpxData.substring(0, 100)}...` : null,
      result
    });
    return result;
  }, [suuntoData, gpxData]);

  // Parse activity data when expanded
  useEffect(() => {
    if (!isExpanded || activityData) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = parseActivityData({
        type: "auto",
        suuntoData: suuntoData || undefined,
        gpxData: gpxData || undefined,
      });

      // Resample to 5-second intervals for smooth playback
      const resampled = resampleDataPoints(data.dataPoints, 5000);
      setActivityData({ ...data, dataPoints: resampled });
    } catch (e) {
      console.error("Failed to parse activity data:", e);
      setError(e instanceof Error ? e.message : "Failed to load activity data");
    } finally {
      setIsLoading(false);
    }
  }, [isExpanded, suuntoData, gpxData, activityData]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !activityData || revealingPhoto || revealingVideo) return;

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      // Update based on playback speed (base rate: ~20 points per second at 1x)
      const updateInterval = 50 / playbackSpeed; // ms between updates

      if (elapsed >= updateInterval) {
        lastUpdateRef.current = timestamp;

        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= activityData.dataPoints.length) {
            setIsPlaying(false);
            return activityData.dataPoints.length - 1;
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, activityData, revealingPhoto]);

  // Handlers
  const handlePlayPause = useCallback(() => {
    if (!activityData) return;

    if (currentIndex >= activityData.dataPoints.length - 1) {
      setCurrentIndex(0);
    }

    lastUpdateRef.current = 0;
    setIsPlaying((prev) => !prev);
  }, [activityData, currentIndex]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleSeek = useCallback((index: number) => {
    // If seeking backwards, only reset media that's ahead of the new position
    if (index < lastSeekIndex.current && activityData) {
      const newTimestamp = activityData.dataPoints[index]?.timestamp ?? 0;

      // Remove photos that are ahead of the new position so they can re-trigger
      for (const photo of activityPhotosRef.current) {
        if (photo.timestamp !== undefined && photo.timestamp > newTimestamp) {
          shownPhotoIds.current.delete(photo.id);
        }
      }

      // Remove videos that are ahead of the new position so they can re-trigger
      for (const video of activityVideosRef.current) {
        if (video.timestamp !== undefined && video.timestamp > newTimestamp) {
          shownVideoIds.current.delete(video.id);
        }
      }
    }
    lastSeekIndex.current = index;
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, [activityData]);

  const handleSkipBack = useCallback(() => {
    if (!activityData) return;
    // Skip back ~30 seconds worth of points
    const skipAmount = Math.floor(30000 / 5000); // 6 points at 5s intervals
    setCurrentIndex((prev) => Math.max(0, prev - skipAmount));
    lastUpdateRef.current = 0;
  }, [activityData]);

  const handleSkipForward = useCallback(() => {
    if (!activityData) return;
    // Skip forward ~30 seconds worth of points
    const skipAmount = Math.floor(30000 / 5000);
    setCurrentIndex((prev) =>
      Math.min(activityData.dataPoints.length - 1, prev + skipAmount)
    );
    lastUpdateRef.current = 0;
  }, [activityData]);

  // Handle segment highlighting from chart
  const handleHighlightSegment = useCallback((segment: { start: number; end: number } | null) => {
    setHighlightedSegment(segment);

    // Fly to the segment on the map
    if (segment && mapRef.current) {
      mapRef.current.flyToSegment(segment.start, segment.end);
    }
  }, []);

  // Map photos to activity timeline with GPS matching
  const activityPhotos: ActivityPhoto[] = useMemo(() => {
    if (!activityData || !photos.length) {
      console.log("[ActivityPlayer] No photos to map:", { hasActivityData: !!activityData, photosCount: photos.length });
      return [];
    }

    const activityStartTime = activityData.dataPoints[0]?.timestamp || 0;
    const activityEndTime = activityData.dataPoints[activityData.dataPoints.length - 1]?.timestamp || 0;

    console.log("[ActivityPlayer] Mapping photos:", {
      photosCount: photos.length,
      activityStartTime,
      activityEndTime,
      photos: photos.map(p => ({ id: p.id, lat: p.latitude, lon: p.longitude, timestamp: p.timestamp }))
    });

    const mapped = photos.map((photo) => {
      let photoTimestamp: number | undefined;
      let photoLat: number | undefined;
      let photoLon: number | undefined;

      // If photo has GPS coordinates, snap to closest point on the route
      if (photo.latitude != null && photo.longitude != null) {
        // Find closest data point by GPS distance
        let closestDist = Infinity;
        let closestPoint: typeof activityData.dataPoints[0] | null = null;

        for (const point of activityData.dataPoints) {
          // Use Haversine-like distance (simplified for small distances)
          const latDiff = point.lat - photo.latitude;
          const lonDiff = point.lon - photo.longitude;
          // Approximate meters: 1 degree lat ~= 111km, 1 degree lon ~= 85km at mid-latitudes
          const dist = Math.sqrt(
            Math.pow(latDiff * 111000, 2) + Math.pow(lonDiff * 85000, 2)
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestPoint = point;
          }
        }

        // Snap photo to the closest point on the route (within 500 meters)
        if (closestPoint && closestDist < 500) {
          photoLat = closestPoint.lat;
          photoLon = closestPoint.lon;
          photoTimestamp = closestPoint.timestamp;

          console.log("[ActivityPlayer] Photo snapped to route:", {
            id: photo.id,
            originalLat: photo.latitude,
            originalLon: photo.longitude,
            snappedLat: photoLat,
            snappedLon: photoLon,
            distanceMeters: Math.round(closestDist),
            timestamp: photoTimestamp
          });
        } else {
          // Photo is too far from route, use original coordinates but still find timestamp
          photoLat = photo.latitude;
          photoLon = photo.longitude;
          if (closestPoint) {
            photoTimestamp = closestPoint.timestamp;
          }

          console.log("[ActivityPlayer] Photo too far from route, using original GPS:", {
            id: photo.id,
            lat: photoLat,
            lon: photoLon,
            distanceMeters: closestDist ? Math.round(closestDist) : "N/A"
          });
        }
      }

      // If photo has a timestamp, try to match it to activity timeline
      if (!photoTimestamp && photo.timestamp && entryDate) {
        try {
          const photoTime = new Date(photo.timestamp).getTime();
          const entryTime = new Date(entryDate).getTime();

          // Calculate relative time from entry date
          const relativeTime = photoTime - entryTime;

          // If within activity duration, use it
          if (relativeTime >= 0 && relativeTime <= activityEndTime) {
            photoTimestamp = relativeTime;

            // Find position at this timestamp
            const matchingPoint = activityData.dataPoints.find(
              (p) => p.timestamp >= relativeTime
            );
            if (matchingPoint) {
              photoLat = matchingPoint.lat;
              photoLon = matchingPoint.lon;
            }
          }
        } catch {
          // Invalid timestamp, skip
        }
      }

      return {
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        timestamp: photoTimestamp,
        lat: photoLat,
        lon: photoLon,
      };
    });

    console.log("[ActivityPlayer] Mapped activity photos:", mapped.filter(p => p.lat && p.lon));
    return mapped;
  }, [activityData, photos, entryDate]);

  // Map videos to activity timeline with GPS matching
  const activityVideos: ActivityVideo[] = useMemo(() => {
    if (!activityData || !videos.length) {
      console.log("[ActivityPlayer] No videos to map:", { hasActivityData: !!activityData, videosCount: videos.length });
      return [];
    }

    const activityStartTime = activityData.dataPoints[0]?.timestamp || 0;
    const activityEndTime = activityData.dataPoints[activityData.dataPoints.length - 1]?.timestamp || 0;

    console.log("[ActivityPlayer] Mapping videos:", {
      videosCount: videos.length,
      activityStartTime,
      activityEndTime,
      videos: videos.map(v => ({ id: v.id, lat: v.latitude, lon: v.longitude, timestamp: v.timestamp }))
    });

    const mapped = videos.map((video) => {
      let videoTimestamp: number | undefined;
      let videoLat: number | undefined;
      let videoLon: number | undefined;

      // If video has GPS coordinates, snap to closest point on the route
      if (video.latitude != null && video.longitude != null) {
        // Find closest data point by GPS distance
        let closestDist = Infinity;
        let closestPoint: typeof activityData.dataPoints[0] | null = null;

        for (const point of activityData.dataPoints) {
          // Use Haversine-like distance (simplified for small distances)
          const latDiff = point.lat - video.latitude;
          const lonDiff = point.lon - video.longitude;
          // Approximate meters: 1 degree lat ~= 111km, 1 degree lon ~= 85km at mid-latitudes
          const dist = Math.sqrt(
            Math.pow(latDiff * 111000, 2) + Math.pow(lonDiff * 85000, 2)
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestPoint = point;
          }
        }

        // Snap video to the closest point on the route (within 500 meters)
        if (closestPoint && closestDist < 500) {
          videoLat = closestPoint.lat;
          videoLon = closestPoint.lon;
          videoTimestamp = closestPoint.timestamp;

          console.log("[ActivityPlayer] Video snapped to route:", {
            id: video.id,
            originalLat: video.latitude,
            originalLon: video.longitude,
            snappedLat: videoLat,
            snappedLon: videoLon,
            distanceMeters: Math.round(closestDist),
            timestamp: videoTimestamp
          });
        } else {
          // Video is too far from route, use original coordinates but still find timestamp
          videoLat = video.latitude;
          videoLon = video.longitude;
          if (closestPoint) {
            videoTimestamp = closestPoint.timestamp;
          }

          console.log("[ActivityPlayer] Video too far from route, using original GPS:", {
            id: video.id,
            lat: videoLat,
            lon: videoLon,
            distanceMeters: closestDist ? Math.round(closestDist) : "N/A"
          });
        }
      }

      // If video has a timestamp, try to match it to activity timeline
      if (!videoTimestamp && video.timestamp && entryDate) {
        try {
          const videoTime = new Date(video.timestamp).getTime();
          const entryTime = new Date(entryDate).getTime();

          // Calculate relative time from entry date
          const relativeTime = videoTime - entryTime;

          // If within activity duration, use it
          if (relativeTime >= 0 && relativeTime <= activityEndTime) {
            videoTimestamp = relativeTime;

            // Find position at this timestamp
            const matchingPoint = activityData.dataPoints.find(
              (p) => p.timestamp >= relativeTime
            );
            if (matchingPoint) {
              videoLat = matchingPoint.lat;
              videoLon = matchingPoint.lon;
            }
          }
        } catch {
          // Invalid timestamp, skip
        }
      }

      return {
        id: video.id,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        caption: video.caption,
        timestamp: videoTimestamp,
        lat: videoLat,
        lon: videoLon,
      };
    });

    console.log("[ActivityPlayer] Mapped activity videos:", mapped.filter(v => v.lat && v.lon));
    return mapped;
  }, [activityData, videos, entryDate]);

  // Keep refs in sync with memoized values for seek handler
  useEffect(() => {
    activityPhotosRef.current = activityPhotos;
  }, [activityPhotos]);

  useEffect(() => {
    activityVideosRef.current = activityVideos;
  }, [activityVideos]);

  // Detect photo crossings during playback
  useEffect(() => {
    if (!isPlaying || !activityData || revealingPhoto || revealingVideo) return;

    const currentTimestamp = activityData.dataPoints[currentIndex]?.timestamp ?? 0;

    // Find photos that should be revealed at current timestamp
    for (const photo of activityPhotos) {
      if (
        photo.timestamp !== undefined &&
        photo.timestamp <= currentTimestamp &&
        !shownPhotoIds.current.has(photo.id)
      ) {
        // Mark as shown and trigger reveal
        shownPhotoIds.current.add(photo.id);
        setRevealingPhoto(photo);
        break; // Only show one photo at a time
      }
    }
  }, [currentIndex, isPlaying, activityData, activityPhotos, revealingPhoto, revealingVideo]);

  // Detect video crossings during playback
  useEffect(() => {
    if (!isPlaying || !activityData || revealingPhoto || revealingVideo) return;

    const currentTimestamp = activityData.dataPoints[currentIndex]?.timestamp ?? 0;

    // Find videos that should be revealed at current timestamp
    for (const video of activityVideos) {
      if (
        video.timestamp !== undefined &&
        video.timestamp <= currentTimestamp &&
        !shownVideoIds.current.has(video.id)
      ) {
        // Mark as shown and trigger reveal
        shownVideoIds.current.add(video.id);
        setRevealingVideo(video);
        break; // Only show one video at a time
      }
    }
  }, [currentIndex, isPlaying, activityData, activityVideos, revealingPhoto, revealingVideo]);

  // Handle photo reveal completion - resume playback
  const handlePhotoRevealComplete = useCallback(() => {
    setRevealingPhoto(null);
    setIsManualPhotoReveal(false);
    // Playback will auto-resume since isPlaying is still true and revealingPhoto becomes null
  }, []);

  // Handle photo marker click - show photo reveal popup
  const handlePhotoMarkerClick = useCallback((photo: ActivityPhoto) => {
    // If paused, use manual dismiss mode
    setIsManualPhotoReveal(!isPlaying);
    setRevealingPhoto(photo);
  }, [isPlaying]);

  // Handle video reveal completion - resume playback
  const handleVideoRevealComplete = useCallback(() => {
    setRevealingVideo(null);
    setIsManualVideoReveal(false);
    // Playback will auto-resume since isPlaying is still true and revealingVideo becomes null
  }, []);

  // Handle video marker click - show video reveal popup
  const handleVideoMarkerClick = useCallback((video: ActivityVideo) => {
    // If paused, use manual dismiss mode
    setIsManualVideoReveal(!isPlaying);
    setRevealingVideo(video);
  }, [isPlaying]);

  // Reset shown photos and videos when playback restarts from beginning
  useEffect(() => {
    if (currentIndex === 0) {
      shownPhotoIds.current.clear();
      shownVideoIds.current.clear();
    }
  }, [currentIndex]);

  if (!hasData) {
    return null;
  }

  const currentPoint = activityData?.dataPoints[currentIndex] || null;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold font-outfit">Activity Player</h3>
                <p className="text-sm text-muted-foreground">
                  Relive your hike with animated playback
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activityData && (
                <Badge variant="secondary" className="hidden sm:flex">
                  {activityData.source === "suunto" ? "Suunto" : "GPX"}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-destructive">
                <p>{error}</p>
              </div>
            )}

            {activityData && !isLoading && (
              <>
                {/* Map with Overlay Controls */}
                <div className="relative rounded-lg overflow-hidden border" style={{ height: "450px" }}>
                  <ActivityMap
                    ref={mapRef}
                    dataPoints={activityData.dataPoints}
                    currentIndex={currentIndex}
                    bounds={activityData.bounds}
                    colorMode={colorMode}
                    cameraMode={cameraMode}
                    mapStyle={mapStyle}
                    terrain3D={terrain3D}
                    hasHeartRate={activityData.hasHeartRate}
                    photos={activityPhotos}
                    videos={activityVideos}
                    highlightedSegment={highlightedSegment}
                    onPhotoClick={handlePhotoMarkerClick}
                    onVideoClick={handleVideoMarkerClick}
                  />

                  {/* Overlay Controls */}
                  <MapOverlayControls
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    currentIndex={currentIndex}
                    totalPoints={activityData.dataPoints.length}
                    currentPoint={currentPoint}
                    summary={activityData.summary}
                    onPlayPause={handlePlayPause}
                    onSpeedChange={handleSpeedChange}
                    onSeek={handleSeek}
                    colorMode={colorMode}
                    onColorModeChange={setColorMode}
                    cameraMode={cameraMode}
                    onCameraModeChange={setCameraMode}
                    terrain3D={terrain3D}
                    onTerrain3DChange={setTerrain3D}
                    mapStyle={mapStyle}
                    onMapStyleChange={setMapStyle}
                    hasHeartRate={activityData.hasHeartRate}
                    showStats={showStats}
                    onToggleStats={() => setShowStats(!showStats)}
                  />

                  {/* Photo Reveal Animation */}
                  <PhotoReveal
                    photo={revealingPhoto}
                    onComplete={handlePhotoRevealComplete}
                    displayDuration={3000}
                    manualDismiss={isManualPhotoReveal}
                  />

                  {/* Video Reveal Animation */}
                  <VideoReveal
                    video={revealingVideo}
                    onComplete={handleVideoRevealComplete}
                    manualDismiss={isManualVideoReveal}
                  />
                </div>

                {/* Charts */}
                <ActivityCharts
                  dataPoints={activityData.dataPoints}
                  currentIndex={currentIndex}
                  hasHeartRate={activityData.hasHeartRate}
                  hasCadence={activityData.hasCadence}
                  hasSpeed={activityData.hasSpeed}
                  onSeek={handleSeek}
                  onHighlightSegment={handleHighlightSegment}
                  duration={activityData.summary.duration}
                />

              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export { hasActivityData };
