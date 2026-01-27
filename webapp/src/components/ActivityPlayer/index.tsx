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
import { PlaybackControls } from "./PlaybackControls";
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

interface ActivityPlayerProps {
  suuntoData?: string | null;
  gpxData?: string | null;
  photos?: Photo[];
  entryDate?: string;
  onPhotoClick?: (photoId: string) => void;
}

export function ActivityPlayer({
  suuntoData,
  gpxData,
  photos = [],
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");

  // Phase 1 Enhancement states
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

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
    if (!isPlaying || !activityData) return;

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
  }, [isPlaying, playbackSpeed, activityData]);

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
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

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
      photos: photos.map(p => ({ id: p.id, lat: p.latitude, lon: p.longitude }))
    });

    const mapped = photos.map((photo) => {
      let photoTimestamp: number | undefined;
      let photoLat: number | undefined;
      let photoLon: number | undefined;

      // If photo has GPS coordinates, use them directly
      if (photo.latitude != null && photo.longitude != null) {
        photoLat = photo.latitude;
        photoLon = photo.longitude;

        // Find closest data point by GPS
        let closestDist = Infinity;
        let closestPoint: typeof activityData.dataPoints[0] | null = null;

        for (const point of activityData.dataPoints) {
          const dist = Math.sqrt(
            Math.pow(point.lat - photoLat, 2) + Math.pow(point.lon - photoLon, 2)
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestPoint = point;
          }
        }

        if (closestPoint) {
          photoTimestamp = closestPoint.timestamp;
        }

        console.log("[ActivityPlayer] Photo with GPS:", {
          id: photo.id,
          photoLat,
          photoLon,
          closestDist,
          photoTimestamp
        });
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
                {/* Map */}
                <div className="rounded-lg overflow-hidden border" style={{ height: "350px" }}>
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
                    highlightedSegment={highlightedSegment}
                    onPhotoClick={(photo) => onPhotoClick?.(photo.id)}
                    temperature={currentPoint?.temperature}
                  />
                </div>

                {/* Playback Controls with integrated options */}
                <PlaybackControls
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  currentIndex={currentIndex}
                  totalPoints={activityData.dataPoints.length}
                  currentPoint={currentPoint}
                  summary={activityData.summary}
                  onPlayPause={handlePlayPause}
                  onSpeedChange={handleSpeedChange}
                  onSeek={handleSeek}
                  onSkipBack={handleSkipBack}
                  onSkipForward={handleSkipForward}
                  colorMode={colorMode}
                  onColorModeChange={setColorMode}
                  cameraMode={cameraMode}
                  onCameraModeChange={setCameraMode}
                  terrain3D={terrain3D}
                  onTerrain3DChange={setTerrain3D}
                  mapStyle={mapStyle}
                  onMapStyleChange={setMapStyle}
                  hasHeartRate={activityData.hasHeartRate}
                />

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
