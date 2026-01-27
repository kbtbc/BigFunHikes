/**
 * Noir Player - Film Noir / High Contrast Cinematic style
 *
 * Black and white aesthetic with dramatic shadows and blood red accent.
 * Color Palette: Pure black (#000000), white (#ffffff), dark gray (#1a1a1a), blood red (#8b0000)
 * Typography: Playfair Display (serif) for elegant, cinematic feel
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
import { NoirMap, type NoirMapRef, type CameraMode, type MapStyle } from "./NoirMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface NoirPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

export function NoirPlayer({ data }: NoirPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<NoirMapRef>(null);

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

  // Handle direct seek from charts (takes index directly)
  const handleChartSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

  // Handle segment highlighting from chart
  const handleHighlightSegment = useCallback((segment: { start: number; end: number } | null) => {
    setHighlightedSegment(segment);

    // Fly to the segment on the map
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

  if (!activityData) {
    return (
      <Card className="noir-player-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </Card>
    );
  }

  return (
    <div className="noir-player space-y-4">
      {/* Load Playfair Display font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Map */}
      <Card className="noir-player-card overflow-hidden">
        <div className="relative" style={{ height: "450px" }}>
          <NoirMap
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
        </div>
      </Card>

      {/* Controls Card */}
      <Card className="noir-player-card p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="noir-stat-card">
            <span className="noir-stat-label">Time</span>
            <span className="noir-stat-value">
              {formatDuration(currentTime)} / {formatDuration(activityData.summary.duration)}
            </span>
          </div>

          <div className="noir-stat-card">
            <span className="noir-stat-label">Distance</span>
            <span className="noir-stat-value">
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}{" "}
              mi
            </span>
          </div>

          {currentPoint?.elevation !== undefined && (
            <div className="noir-stat-card">
              <span className="noir-stat-label">Elevation</span>
              <span className="noir-stat-value">
                {Math.round(metersToFeet(currentPoint.elevation))} ft
              </span>
            </div>
          )}

          {currentPoint?.speed !== undefined && (
            <div className="noir-stat-card">
              <span className="noir-stat-label">Speed</span>
              <span className="noir-stat-value">
                {msToMph(currentPoint.speed).toFixed(1)} mph
              </span>
            </div>
          )}

          {currentPoint?.hr !== undefined && (
            <div className="noir-stat-card">
              <span className="noir-stat-label">Heart Rate</span>
              <span className="noir-stat-value noir-hr-value">
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
            className="noir-slider"
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
              className="noir-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="noir-play-btn h-10 w-10"
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
              className="noir-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="noir-select w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="noir-select-content">
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
              <Video className="h-4 w-4 text-gray-500" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="noir-select w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="noir-select-content">
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
              <Mountain className="h-4 w-4 text-gray-500" />
              <Label htmlFor="noir-terrain-toggle" className="text-sm text-gray-400">3D</Label>
              <Switch
                id="noir-terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
                className="noir-switch"
              />
            </div>

            {/* Satellite Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="noir-satellite-toggle" className="text-sm text-gray-400">Satellite</Label>
              <Switch
                id="noir-satellite-toggle"
                checked={mapStyle === "satellite"}
                onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "dark")}
                className="noir-switch"
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gray-500" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="noir-select w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="noir-select-content">
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
      <Card className="noir-player-card p-4 noir-charts-container">
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

      {/* Styles for Noir theme */}
      <style>{`
        .noir-player {
          --noir-black: #000000;
          --noir-white: #ffffff;
          --noir-gray: #1a1a1a;
          --noir-gray-light: #2a2a2a;
          --noir-gray-mid: #404040;
          --noir-blood-red: #8b0000;
        }

        .noir-player-card {
          background: linear-gradient(145deg, var(--noir-gray) 0%, var(--noir-black) 100%);
          border: 1px solid var(--noir-gray-light);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .noir-stat-card {
          background: var(--noir-gray-light);
          border-radius: 0.25rem;
          padding: 0.5rem;
          text-align: center;
          border: 1px solid var(--noir-gray-mid);
        }

        .noir-stat-label {
          display: block;
          font-size: 0.7rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'Playfair Display', Georgia, serif;
        }

        .noir-stat-value {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: var(--noir-white);
          font-size: 0.9rem;
        }

        .noir-hr-value {
          color: var(--noir-blood-red) !important;
          text-shadow: 0 0 10px rgba(139, 0, 0, 0.5);
        }

        .noir-control-btn {
          color: var(--noir-white);
          background: transparent;
        }

        .noir-control-btn:hover {
          background: var(--noir-gray-light);
        }

        .noir-control-btn:disabled {
          color: var(--noir-gray-mid);
        }

        .noir-play-btn {
          background: var(--noir-white);
          color: var(--noir-black);
          border-radius: 9999px;
          transition: all 0.2s ease;
        }

        .noir-play-btn:hover {
          background: #e0e0e0;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        .noir-select {
          background: var(--noir-gray-light);
          border-color: var(--noir-gray-mid);
          color: var(--noir-white);
        }

        .noir-select-content {
          background: var(--noir-gray);
          border-color: var(--noir-gray-mid);
        }

        .noir-slider [data-radix-slider-track] {
          background: var(--noir-gray-mid);
        }

        .noir-slider [data-radix-slider-range] {
          background: linear-gradient(90deg, #666 0%, var(--noir-white) 100%);
        }

        .noir-slider [data-radix-slider-thumb] {
          background: var(--noir-white);
          border: 2px solid var(--noir-blood-red);
          box-shadow: 0 0 10px rgba(139, 0, 0, 0.5);
        }

        .noir-switch[data-state="checked"] {
          background: var(--noir-blood-red);
        }

        .noir-charts-container {
          filter: grayscale(40%) contrast(1.1);
        }

        /* Film grain animation */
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1%, -1%); }
          20% { transform: translate(1%, 1%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-1%, 0); }
          60% { transform: translate(1%, 0); }
          70% { transform: translate(0, 1%); }
          80% { transform: translate(0, -1%); }
          90% { transform: translate(1%, 1%); }
        }
      `}</style>
    </div>
  );
}
