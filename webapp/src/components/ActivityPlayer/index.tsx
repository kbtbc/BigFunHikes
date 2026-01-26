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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Palette,
  Mountain,
  Video,
  Eye,
  Navigation,
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
}

export function ActivityPlayer({
  suuntoData,
  gpxData,
  photos = [],
  entryDate,
}: ActivityPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");

  // Phase 1 Enhancement states
  const [terrain3D, setTerrain3D] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("outdoors");
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
    if (!activityData || !photos.length) return [];

    const activityStartTime = activityData.dataPoints[0]?.timestamp || 0;
    const activityEndTime = activityData.dataPoints[activityData.dataPoints.length - 1]?.timestamp || 0;

    return photos.map((photo) => {
      let photoTimestamp: number | undefined;
      let photoLat: number | undefined;
      let photoLon: number | undefined;

      // If photo has GPS coordinates, use them directly
      if (photo.latitude && photo.longitude) {
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
                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Color Mode */}
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={colorMode}
                      onValueChange={(val) => setColorMode(val as ColorMode)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="speed">Speed</SelectItem>
                        {activityData.hasHeartRate && (
                          <SelectItem value="hr">Heart Rate</SelectItem>
                        )}
                        <SelectItem value="elevation">Elevation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Camera Mode */}
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={cameraMode}
                      onValueChange={(val) => setCameraMode(val as CameraMode)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow">
                          <div className="flex items-center gap-2">
                            <Navigation className="h-3 w-3" />
                            Follow
                          </div>
                        </SelectItem>
                        <SelectItem value="overview">
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            Overview
                          </div>
                        </SelectItem>
                        <SelectItem value="firstPerson">
                          <div className="flex items-center gap-2">
                            <Video className="h-3 w-3" />
                            First Person
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3D Terrain Toggle */}
                  <div className="flex items-center gap-2">
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="terrain-toggle" className="text-sm">3D</Label>
                    <Switch
                      id="terrain-toggle"
                      checked={terrain3D}
                      onCheckedChange={setTerrain3D}
                    />
                  </div>

                  {/* Satellite Toggle */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="satellite-toggle" className="text-sm">Satellite</Label>
                    <Switch
                      id="satellite-toggle"
                      checked={mapStyle === "satellite"}
                      onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "outdoors")}
                    />
                  </div>
                </div>

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
                  />
                </div>

                {/* Playback Controls */}
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
