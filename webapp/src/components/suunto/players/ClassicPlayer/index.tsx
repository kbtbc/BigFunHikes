/**
 * Classic Player - Activity Player with fresh color scheme
 *
 * This is the first of 4 player styles for the Replay Studio.
 * Color Palette: Deep navy (#1a365d) + Coral accent (#f56565) + Cream (#faf5f0)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { ClassicMap } from "./ClassicMap";

interface ClassicPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

export function ClassicPlayer({ data }: ClassicPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

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

  if (!activityData) {
    return (
      <Card className="classic-player-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-classic-primary" />
        </div>
      </Card>
    );
  }

  return (
    <div className="classic-player space-y-4">
      {/* Map */}
      <Card className="classic-player-card overflow-hidden">
        <div className="relative" style={{ height: "450px" }}>
          <ClassicMap
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            bounds={activityData.bounds}
            colorMode={colorMode}
            terrain3D={terrain3D}
            hasHeartRate={activityData.hasHeartRate}
            temperature={tempFahrenheit}
          />
        </div>
      </Card>

      {/* Controls Card */}
      <Card className="classic-player-card p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="classic-stat-card">
            <span className="classic-stat-label">Time</span>
            <span className="classic-stat-value">
              {formatDuration(currentTime)} / {formatDuration(activityData.summary.duration)}
            </span>
          </div>

          <div className="classic-stat-card">
            <span className="classic-stat-label">Distance</span>
            <span className="classic-stat-value">
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}{" "}
              mi
            </span>
          </div>

          {currentPoint?.elevation !== undefined && (
            <div className="classic-stat-card">
              <span className="classic-stat-label">Elevation</span>
              <span className="classic-stat-value">
                {Math.round(metersToFeet(currentPoint.elevation))} ft
              </span>
            </div>
          )}

          {currentPoint?.speed !== undefined && (
            <div className="classic-stat-card">
              <span className="classic-stat-label">Speed</span>
              <span className="classic-stat-value">
                {msToMph(currentPoint.speed).toFixed(1)} mph
              </span>
            </div>
          )}

          {currentPoint?.hr !== undefined && (
            <div className="classic-stat-card">
              <span className="classic-stat-label">Heart Rate</span>
              <span className="classic-stat-value text-coral-500">
                {currentPoint.hr} bpm
              </span>
            </div>
          )}
        </div>

        {/* Progress Scrubber */}
        <div className="px-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="classic-slider"
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
              className="classic-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="classic-play-btn h-10 w-10"
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
              className="classic-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
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

            {/* 3D Toggle */}
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="terrain-toggle" className="text-sm">3D</Label>
              <Switch
                id="terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="w-20 h-8">
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

      {/* Styles for Classic theme */}
      <style>{`
        .classic-player-card {
          background: linear-gradient(135deg, #faf5f0 0%, #f5ebe0 100%);
          border: 1px solid #e8dfd3;
        }
        .classic-stat-card {
          background: white;
          border-radius: 0.5rem;
          padding: 0.5rem;
          text-align: center;
          border: 1px solid #e8dfd3;
        }
        .classic-stat-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
        }
        .classic-stat-value {
          font-family: ui-monospace, monospace;
          font-weight: 600;
          color: #1a365d;
        }
        .classic-control-btn {
          color: #1a365d;
        }
        .classic-control-btn:hover {
          background: rgba(26, 54, 93, 0.1);
        }
        .classic-play-btn {
          background: linear-gradient(135deg, #f56565 0%, #ed8936 100%);
          color: white;
          border-radius: 9999px;
        }
        .classic-play-btn:hover {
          background: linear-gradient(135deg, #e53e3e 0%, #dd6b20 100%);
        }
        .text-coral-500 {
          color: #f56565;
        }
        .border-classic-primary {
          border-color: #1a365d;
        }
      `}</style>
    </div>
  );
}
