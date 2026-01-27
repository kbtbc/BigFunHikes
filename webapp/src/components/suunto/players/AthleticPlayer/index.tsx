/**
 * Athletic Player - ESPN Sports Broadcast Style
 *
 * Features:
 * - Sports broadcast aesthetic like watching a live ESPN event
 * - Scoreboard-style stats display with large numbers
 * - Live ticker/crawl at bottom showing metrics
 * - Bold red (#dc2626) + white + dark charcoal (#1f2937) color palette
 * - "LIVE" indicator with pulsing dot
 * - Split times displayed like race results
 * - Full 3D terrain with satellite view
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
  Timer,
  TrendingUp,
  Heart,
  Activity,
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
import { getActivityTypeName } from "@/lib/suunto-parser";
import { AthleticMap, type AthleticMapRef, type CameraMode, type MapStyle } from "./AthleticMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface AthleticPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

export function AthleticPlayer({ data }: AthleticPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<AthleticMapRef>(null);

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

  // Calculate split times (every mile)
  const currentDistance = currentPoint?.distance ? currentPoint.distance * 0.000621371 : 0;
  const currentMile = Math.floor(currentDistance);

  if (!activityData) {
    return (
      <Card className="athletic-player-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dc2626]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="athletic-player space-y-4">
      {/* Top Scoreboard Bar */}
      <div className="athletic-scoreboard">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Event Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dc2626] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#dc2626]"></span>
              </span>
              <span className="font-bold text-[#dc2626] text-sm tracking-wider">LIVE</span>
            </div>
            <div className="h-4 w-px bg-gray-600"></div>
            <span className="text-gray-300 text-sm font-semibold">REPLAY STUDIO</span>
          </div>

          {/* Center - Activity Type */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#dc2626]" />
            <span className="font-bold text-white text-sm uppercase tracking-wide">
              {getActivityTypeName(data.activityType)}
            </span>
          </div>

          {/* Right - Time Display */}
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4 text-gray-400" />
            <span className="font-mono font-bold text-white text-lg">
              {formatDuration(currentTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map - Takes 3 columns on large screens */}
        <Card className="athletic-player-card overflow-hidden lg:col-span-3">
          <div className="relative" style={{ height: "450px" }}>
            <AthleticMap
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

        {/* Stats Panel - Scoreboard Style */}
        <div className="space-y-3">
          {/* Main Stats */}
          <Card className="athletic-stats-panel p-4">
            <div className="text-center mb-3">
              <span className="text-gray-400 text-xs font-semibold tracking-wider">DISTANCE</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-mono font-bold text-white text-4xl">
                  {currentDistance.toFixed(2)}
                </span>
                <span className="text-gray-400 text-lg font-semibold">MI</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Speed */}
              <div className="athletic-stat-box">
                <div className="flex items-center gap-1 justify-center mb-1">
                  <Gauge className="h-3 w-3 text-[#dc2626]" />
                  <span className="text-gray-400 text-[10px] font-semibold tracking-wider">SPEED</span>
                </div>
                <span className="font-mono font-bold text-white text-xl">
                  {currentPoint?.speed !== undefined ? msToMph(currentPoint.speed).toFixed(1) : "0.0"}
                </span>
                <span className="text-gray-500 text-[10px]">MPH</span>
              </div>

              {/* Elevation */}
              <div className="athletic-stat-box">
                <div className="flex items-center gap-1 justify-center mb-1">
                  <TrendingUp className="h-3 w-3 text-[#dc2626]" />
                  <span className="text-gray-400 text-[10px] font-semibold tracking-wider">ELEV</span>
                </div>
                <span className="font-mono font-bold text-white text-xl">
                  {currentPoint?.elevation !== undefined ? Math.round(metersToFeet(currentPoint.elevation)) : "0"}
                </span>
                <span className="text-gray-500 text-[10px]">FT</span>
              </div>
            </div>

            {/* Heart Rate - Prominent if available */}
            {currentPoint?.hr !== undefined && (
              <div className="mt-3 athletic-hr-box">
                <div className="flex items-center gap-2 justify-center">
                  <Heart className="h-5 w-5 text-[#dc2626] animate-pulse" />
                  <span className="font-mono font-bold text-white text-3xl">{currentPoint.hr}</span>
                  <span className="text-gray-400 text-sm">BPM</span>
                </div>
              </div>
            )}
          </Card>

          {/* Split Times - Race Result Style */}
          <Card className="athletic-stats-panel p-3">
            <div className="text-center mb-2">
              <span className="text-gray-400 text-xs font-semibold tracking-wider">MILE SPLITS</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Array.from({ length: Math.max(1, currentMile + 1) }, (_, i) => {
                const mileNum = i + 1;
                const isCurrentMile = mileNum === currentMile + 1;
                return (
                  <div
                    key={mileNum}
                    className={`flex items-center justify-between px-2 py-1 rounded ${
                      isCurrentMile ? "bg-[#dc2626]/20 border border-[#dc2626]/40" : "bg-gray-800/50"
                    }`}
                  >
                    <span className={`text-xs font-bold ${isCurrentMile ? "text-[#dc2626]" : "text-gray-400"}`}>
                      MI {mileNum}
                    </span>
                    <span className={`font-mono text-xs ${isCurrentMile ? "text-white" : "text-gray-500"}`}>
                      {isCurrentMile ? "IN PROGRESS" : "--:--"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Live Ticker / Crawl */}
      <div className="athletic-ticker overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-2 flex items-center gap-8">
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">DISTANCE:</span>
            <span className="text-white">{currentDistance.toFixed(2)} mi</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">SPEED:</span>
            <span className="text-white">{currentPoint?.speed !== undefined ? msToMph(currentPoint.speed).toFixed(1) : "0.0"} mph</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">ELEVATION:</span>
            <span className="text-white">{currentPoint?.elevation !== undefined ? Math.round(metersToFeet(currentPoint.elevation)) : "0"} ft</span>
          </span>
          {currentPoint?.hr !== undefined && (
            <>
              <span className="text-gray-600">|</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-[#dc2626] font-bold">HEART RATE:</span>
                <span className="text-white">{currentPoint.hr} bpm</span>
              </span>
            </>
          )}
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">TOTAL TIME:</span>
            <span className="text-white">{formatDuration(activityData.summary.duration)}</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">TOTAL DISTANCE:</span>
            <span className="text-white">{(activityData.summary.distance * 0.000621371).toFixed(2)} mi</span>
          </span>
          {/* Repeat for seamless loop */}
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">DISTANCE:</span>
            <span className="text-white">{currentDistance.toFixed(2)} mi</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="inline-flex items-center gap-2">
            <span className="text-[#dc2626] font-bold">SPEED:</span>
            <span className="text-white">{currentPoint?.speed !== undefined ? msToMph(currentPoint.speed).toFixed(1) : "0.0"} mph</span>
          </span>
        </div>
      </div>

      {/* Controls Card */}
      <Card className="athletic-player-card p-4 space-y-4">
        {/* Progress Scrubber */}
        <div className="px-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="athletic-slider"
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
              className="athletic-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="athletic-play-btn h-12 w-12"
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
              className="athletic-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-400" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="athletic-select w-28 h-8">
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
              <Video className="h-4 w-4 text-gray-400" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="athletic-select w-32 h-8">
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
              <Mountain className="h-4 w-4 text-gray-400" />
              <Label htmlFor="terrain-toggle" className="text-sm text-gray-300">3D</Label>
              <Switch
                id="terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
              />
            </div>

            {/* Satellite Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="satellite-toggle" className="text-sm text-gray-300">Satellite</Label>
              <Switch
                id="satellite-toggle"
                checked={mapStyle === "satellite"}
                onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "outdoors")}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gray-400" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="athletic-select w-20 h-8">
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
      <Card className="athletic-player-card p-4">
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

      {/* Athletic Theme Styles */}
      <style>{`
        .athletic-player-card {
          background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
          border: 1px solid #374151;
        }
        .athletic-scoreboard {
          background: linear-gradient(90deg, #111827 0%, #1f2937 50%, #111827 100%);
          border: 1px solid #374151;
          border-radius: 0.5rem;
        }
        .athletic-stats-panel {
          background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
          border: 1px solid #374151;
        }
        .athletic-stat-box {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 0.375rem;
          padding: 0.5rem;
          text-align: center;
        }
        .athletic-hr-box {
          background: linear-gradient(90deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.2) 50%, rgba(220, 38, 38, 0.1) 100%);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 0.5rem;
          padding: 0.75rem;
        }
        .athletic-ticker {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .athletic-control-btn {
          color: #9ca3af;
          border: 1px solid #374151;
          background: #1f2937;
        }
        .athletic-control-btn:hover {
          background: #374151;
          color: white;
        }
        .athletic-play-btn {
          background: #dc2626;
          color: white;
          border-radius: 9999px;
          border: 3px solid white;
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
        }
        .athletic-play-btn:hover {
          background: #b91c1c;
        }
        .athletic-select {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
        }
        .athletic-slider [data-radix-slider-track] {
          background: #374151;
        }
        .athletic-slider [data-radix-slider-range] {
          background: #dc2626;
        }
        .athletic-slider [data-radix-slider-thumb] {
          background: white;
          border: 2px solid #dc2626;
        }
      `}</style>
    </div>
  );
}
