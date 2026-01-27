/**
 * Expedition Player - National Geographic Explorer Style
 *
 * Adventure documentary aesthetic with aged parchment/leather textures,
 * expedition log format, and brass compass decorations.
 *
 * Color Palette:
 * - Aged tan (#d4a574)
 * - Deep brown (#4a3728)
 * - Gold (#b8860b)
 * - Parchment (#f5e6d3)
 * - Dark leather (#2d1f14)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mountain,
  Gauge,
  Palette,
  Video,
  Eye,
  Navigation,
  Compass,
} from "lucide-react";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { ExpeditionMap, type ExpeditionMapRef, type CameraMode, type MapStyle } from "./ExpeditionMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface ExpeditionPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

export function ExpeditionPlayer({ data }: ExpeditionPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("elevation");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("outdoors");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<ExpeditionMapRef>(null);

  // Parse activity data on mount
  useEffect(() => {
    try {
      const parsed = parseActivityData({
        type: "suunto",
        data: data,
      });
      const resampled = resampleDataPoints(parsed.dataPoints, 5000);
      setActivityData({ ...parsed, dataPoints: resampled });
    } catch (e) {
      console.error("Failed to parse activity data:", e);
    }
  }, [data]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !activityData) return;

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;
      const updateInterval = 50 / playbackSpeed;

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

  const handlePlayPause = useCallback(() => {
    if (!activityData) return;

    if (currentIndex >= activityData.dataPoints.length - 1) {
      setCurrentIndex(0);
    }

    lastUpdateRef.current = 0;
    setIsPlaying((prev) => !prev);
  }, [activityData, currentIndex]);

  const handleSeek = useCallback((value: number[]) => {
    if (!activityData) return;
    const index = Math.round((value[0] / 100) * (activityData.dataPoints.length - 1));
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, [activityData]);

  const handleSkipBack = useCallback(() => {
    if (!activityData) return;
    const skipAmount = Math.floor(30000 / 5000);
    setCurrentIndex((prev) => Math.max(0, prev - skipAmount));
    lastUpdateRef.current = 0;
  }, [activityData]);

  const handleSkipForward = useCallback(() => {
    if (!activityData) return;
    const skipAmount = Math.floor(30000 / 5000);
    setCurrentIndex((prev) =>
      Math.min(activityData.dataPoints.length - 1, prev + skipAmount)
    );
    lastUpdateRef.current = 0;
  }, [activityData]);

  // Handle direct seek from charts
  const handleChartSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

  // Handle segment highlighting from chart
  const handleHighlightSegment = useCallback((segment: { start: number; end: number } | null) => {
    setHighlightedSegment(segment);

    if (segment && mapRef.current) {
      mapRef.current.flyToSegment(segment.start, segment.end);
    }
  }, []);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Temperature from data
  const temperature = data.temperature?.avgCelsius;
  const tempFahrenheit = temperature !== undefined
    ? Math.round(temperature * 9/5 + 32)
    : undefined;

  // Calculate expedition day (simulated based on duration)
  const expeditionDay = Math.max(1, Math.ceil(currentTime / 86400) || 1);

  // Activity name for expedition title (derive from activity type or use default)
  const getActivityName = (type: number): string => {
    const typeNames: Record<number, string> = {
      1: "Trail Run",
      2: "Hiking Expedition",
      3: "Mountain Trek",
      4: "Cycling Journey",
      5: "Swimming",
      82: "Trail Running",
    };
    return typeNames[type] || "Wilderness Expedition";
  };
  const activityName = getActivityName(data.activityType);

  if (!activityData) {
    return (
      <Card className="expedition-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b8860b]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="expedition-player space-y-4">
      {/* Expedition Header */}
      <Card className="expedition-card overflow-hidden">
        <div className="expedition-header p-4 border-b border-[#b8860b]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Brass Compass Decoration */}
              <div className="expedition-compass">
                <Compass className="h-8 w-8 text-[#b8860b]" />
              </div>
              <div>
                <div className="text-xs text-[#b8860b] uppercase tracking-widest font-semibold">
                  Expedition Log
                </div>
                <h1 className="text-xl font-bold text-[#4a3728] font-serif">
                  {activityName}
                </h1>
              </div>
            </div>
            <div className="text-right">
              <div className="expedition-day-badge">
                Day {expeditionDay}
              </div>
              <div className="text-xs text-[#4a3728]/70 mt-1 font-mono">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: "450px" }}>
          <ExpeditionMap
            ref={mapRef}
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            bounds={activityData.bounds}
            colorMode={colorMode}
            cameraMode={cameraMode}
            mapStyle={mapStyle}
            terrain3D={terrain3D}
            hasHeartRate={activityData.hasHeartRate}
            temperature={tempFahrenheit}
            highlightedSegment={highlightedSegment}
          />

          {/* Expedition overlay decorations */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#4a3728]/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#4a3728]/20 to-transparent pointer-events-none" />
        </div>
      </Card>

      {/* Expedition Log Stats */}
      <Card className="expedition-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-[#b8860b] text-xs uppercase tracking-widest font-semibold mb-3">
          <div className="h-px flex-1 bg-[#b8860b]/30" />
          <span>Field Observations</span>
          <div className="h-px flex-1 bg-[#b8860b]/30" />
        </div>

        {/* Stats in expedition log format */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="expedition-stat">
            <div className="expedition-stat-label">Journey Time</div>
            <div className="expedition-stat-value">
              {formatDuration(currentTime)}
            </div>
            <div className="expedition-stat-sub">
              of {formatDuration(activityData.summary.duration)}
            </div>
          </div>

          <div className="expedition-stat">
            <div className="expedition-stat-label">Distance Traveled</div>
            <div className="expedition-stat-value">
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}
              <span className="text-sm ml-1">mi</span>
            </div>
            <div className="expedition-stat-sub">
              Total: {(activityData.summary.distance * 0.000621371).toFixed(2)} mi
            </div>
          </div>

          {currentPoint?.elevation !== undefined && (
            <div className="expedition-stat">
              <div className="expedition-stat-label">Altitude</div>
              <div className="expedition-stat-value">
                {Math.round(metersToFeet(currentPoint.elevation))}
                <span className="text-sm ml-1">ft</span>
              </div>
              <div className="expedition-stat-sub">
                Gain: {Math.round(metersToFeet(activityData.summary.elevationGain))} ft
              </div>
            </div>
          )}

          {currentPoint?.speed !== undefined && (
            <div className="expedition-stat">
              <div className="expedition-stat-label">Pace</div>
              <div className="expedition-stat-value">
                {msToMph(currentPoint.speed).toFixed(1)}
                <span className="text-sm ml-1">mph</span>
              </div>
              <div className="expedition-stat-sub">
                Avg: {msToMph(activityData.summary.avgSpeed).toFixed(1)} mph
              </div>
            </div>
          )}

          {currentPoint?.hr !== undefined && (
            <div className="expedition-stat">
              <div className="expedition-stat-label">Vitals (HR)</div>
              <div className="expedition-stat-value text-red-800">
                {currentPoint.hr}
                <span className="text-sm ml-1">bpm</span>
              </div>
              <div className="expedition-stat-sub">
                Avg: {activityData.summary.avgHr || "--"} bpm
              </div>
            </div>
          )}
        </div>

        {/* Progress Scrubber */}
        <div className="px-1 py-2">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="expedition-slider"
          />
        </div>

        {/* Control Buttons & Options */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="expedition-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="expedition-play-btn h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
              className="expedition-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#b8860b]" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="w-28 h-8 expedition-select">
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
              <Video className="h-4 w-4 text-[#b8860b]" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="w-32 h-8 expedition-select">
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

            {/* 3D Toggle */}
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-[#b8860b]" />
              <Label htmlFor="terrain-toggle" className="text-sm text-[#4a3728]">3D</Label>
              <Switch
                id="terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
              />
            </div>

            {/* Satellite Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="satellite-toggle" className="text-sm text-[#4a3728]">Satellite</Label>
              <Switch
                id="satellite-toggle"
                checked={mapStyle === "satellite"}
                onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "outdoors")}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#b8860b]" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="w-20 h-8 expedition-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <Card className="expedition-card p-4">
        <div className="flex items-center gap-2 text-[#b8860b] text-xs uppercase tracking-widest font-semibold mb-3">
          <div className="h-px flex-1 bg-[#b8860b]/30" />
          <span>Expedition Analysis</span>
          <div className="h-px flex-1 bg-[#b8860b]/30" />
        </div>
        <ActivityCharts
          dataPoints={activityData.dataPoints}
          currentIndex={currentIndex}
          hasHeartRate={activityData.hasHeartRate}
          hasCadence={activityData.hasCadence}
          hasSpeed={activityData.hasSpeed}
          onSeek={handleChartSeek}
          onHighlightSegment={handleHighlightSegment}
          duration={activityData.summary.duration}
        />
      </Card>

      {/* Expedition Theme Styles */}
      <style>{`
        .expedition-card {
          background: linear-gradient(135deg, #f5e6d3 0%, #ebe0d0 50%, #e5d5c0 100%);
          border: 2px solid #b8860b;
          box-shadow:
            0 4px 6px rgba(74, 55, 40, 0.1),
            inset 0 0 20px rgba(184, 134, 11, 0.05);
          position: relative;
        }
        .expedition-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }
        .expedition-header {
          background: linear-gradient(135deg, #e5d5c0 0%, #d4c4af 100%);
        }
        .expedition-compass {
          width: 48px;
          height: 48px;
          background: radial-gradient(circle at 30% 30%, #d4a574 0%, #b8860b 40%, #8b6914 100%);
          border: 3px solid #4a3728;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 8px rgba(74, 55, 40, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.2);
        }
        .expedition-day-badge {
          background: linear-gradient(135deg, #4a3728 0%, #2d1f14 100%);
          color: #d4a574;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-family: ui-serif, Georgia, serif;
          font-weight: bold;
          font-size: 0.875rem;
          border: 1px solid #b8860b;
        }
        .expedition-stat {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid #b8860b/40;
          border-radius: 0.5rem;
          padding: 0.75rem;
          text-align: center;
          position: relative;
        }
        .expedition-stat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #b8860b, transparent);
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .expedition-stat-label {
          font-size: 0.65rem;
          color: #4a3728;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }
        .expedition-stat-value {
          font-family: ui-serif, Georgia, serif;
          font-size: 1.25rem;
          font-weight: bold;
          color: #4a3728;
          line-height: 1.2;
        }
        .expedition-stat-sub {
          font-size: 0.7rem;
          color: #4a3728/70;
          font-family: ui-monospace, monospace;
        }
        .expedition-control-btn {
          color: #4a3728;
          border: 1px solid #b8860b/30;
        }
        .expedition-control-btn:hover {
          background: rgba(184, 134, 11, 0.1);
          border-color: #b8860b;
        }
        .expedition-play-btn {
          background: linear-gradient(135deg, #b8860b 0%, #8b6914 100%);
          color: #f5e6d3;
          border-radius: 9999px;
          border: 2px solid #4a3728;
          box-shadow: 0 2px 8px rgba(74, 55, 40, 0.3);
        }
        .expedition-play-btn:hover {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
        }
        .expedition-select {
          background: rgba(255, 255, 255, 0.6);
          border-color: #b8860b/50;
          color: #4a3728;
        }
        .expedition-slider [data-radix-collection-item] {
          background: linear-gradient(135deg, #b8860b 0%, #8b6914 100%);
        }
      `}</style>
    </div>
  );
}
