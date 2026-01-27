/**
 * Running Player - Activity Player focused on running metrics
 *
 * Sporty, energetic color scheme inspired by Nike/Strava running apps
 * Features: pace chart, heart rate zones, cadence, calories
 * Color Palette: Electric orange (#ff6b35), Neon green (#00d084), Deep charcoal (#1a1a2e)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Heart,
  Footprints,
  Flame,
  TrendingUp,
  Timer,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
  type ActivityDataPoint,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { RunningMap, type RunningMapRef, type CameraMode, type MapStyle } from "./RunningMap";

interface RunningPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "pace" | "hr" | "elevation";

// Heart Rate Zone definitions (based on max HR percentage)
interface HRZone {
  name: string;
  min: number;
  max: number;
  color: string;
  description: string;
}

const HR_ZONES: HRZone[] = [
  { name: "Zone 1", min: 50, max: 60, color: "#94a3b8", description: "Recovery" },
  { name: "Zone 2", min: 60, max: 70, color: "#22c55e", description: "Easy" },
  { name: "Zone 3", min: 70, max: 80, color: "#eab308", description: "Aerobic" },
  { name: "Zone 4", min: 80, max: 90, color: "#f97316", description: "Threshold" },
  { name: "Zone 5", min: 90, max: 100, color: "#ef4444", description: "Max" },
];

// Calculate pace from speed (m/s) to min/mile
function speedToPace(speedMs: number): number {
  if (speedMs <= 0) return 0;
  const mph = msToMph(speedMs);
  if (mph <= 0) return 0;
  return 60 / mph; // minutes per mile
}

function formatPace(minPerMile: number): string {
  if (minPerMile <= 0 || !isFinite(minPerMile) || minPerMile > 60) return "--:--";
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Get HR zone based on current HR and estimated max HR
function getHRZone(hr: number, maxHr: number): number {
  const percentage = (hr / maxHr) * 100;
  for (let i = HR_ZONES.length - 1; i >= 0; i--) {
    if (percentage >= HR_ZONES[i].min) return i + 1;
  }
  return 1;
}

export function RunningPlayer({ data }: RunningPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("pace");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<RunningMapRef>(null);

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

  // Estimate max HR (common formula: 220 - age, default to 190 if unknown)
  const estimatedMaxHr = useMemo(() => {
    if (!activityData?.summary.maxHr) return 190;
    // If we have actual max HR from data, use a bit higher as true max
    return Math.max(activityData.summary.maxHr + 5, 190);
  }, [activityData]);

  // Prepare pace chart data
  const paceChartData = useMemo(() => {
    if (!activityData) return [];
    const sampleRate = Math.max(1, Math.floor(activityData.dataPoints.length / 100));
    return activityData.dataPoints
      .filter((_, i) => i % sampleRate === 0)
      .map((point, idx) => ({
        index: idx * sampleRate,
        time: point.timestamp / 1000,
        pace: point.speed ? speedToPace(point.speed) : null,
        hr: point.hr,
      }));
  }, [activityData]);

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

  const handleChartSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

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

  // Calculate running metrics
  const currentPace = currentPoint?.speed ? speedToPace(currentPoint.speed) : 0;
  const avgPace = activityData?.summary.avgSpeed ? speedToPace(activityData.summary.avgSpeed) : 0;
  const currentHrZone = currentPoint?.hr ? getHRZone(currentPoint.hr, estimatedMaxHr) : 0;

  // Temperature from data
  const temperature = data.temperature?.avgCelsius;
  const tempFahrenheit = temperature !== undefined
    ? Math.round(temperature * 9/5 + 32)
    : undefined;

  if (!activityData) {
    return (
      <Card className="running-player-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="running-player space-y-4">
      {/* Map */}
      <Card className="running-player-card overflow-hidden">
        <div className="relative" style={{ height: "450px" }}>
          <RunningMap
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

      {/* Running Stats Panel */}
      <Card className="running-player-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Current Pace */}
          <div className="running-stat-card">
            <div className="flex items-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-[#ff6b35]" />
              <span className="running-stat-label">Current Pace</span>
            </div>
            <span className="running-stat-value text-[#ff6b35]">
              {formatPace(currentPace)}
            </span>
            <span className="text-xs text-white/40">/mi</span>
          </div>

          {/* Avg Pace */}
          <div className="running-stat-card">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-[#00d084]" />
              <span className="running-stat-label">Avg Pace</span>
            </div>
            <span className="running-stat-value text-[#00d084]">
              {formatPace(avgPace)}
            </span>
            <span className="text-xs text-white/40">/mi</span>
          </div>

          {/* Heart Rate */}
          {activityData.hasHeartRate && currentPoint?.hr && (
            <div className="running-stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Heart className="h-3 w-3 text-red-500" />
                <span className="running-stat-label">Heart Rate</span>
              </div>
              <span className="running-stat-value text-red-400">
                {currentPoint.hr}
              </span>
              <span className="text-xs text-white/40">bpm</span>
            </div>
          )}

          {/* Cadence */}
          {activityData.hasCadence && currentPoint?.cadence && (
            <div className="running-stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Footprints className="h-3 w-3 text-purple-400" />
                <span className="running-stat-label">Cadence</span>
              </div>
              <span className="running-stat-value text-purple-400">
                {currentPoint.cadence}
              </span>
              <span className="text-xs text-white/40">spm</span>
            </div>
          )}

          {/* Distance */}
          <div className="running-stat-card">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-blue-400" />
              <span className="running-stat-label">Distance</span>
            </div>
            <span className="running-stat-value text-blue-400">
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}
            </span>
            <span className="text-xs text-white/40">mi</span>
          </div>

          {/* Elevation Gain */}
          <div className="running-stat-card">
            <div className="flex items-center gap-1 mb-1">
              <Mountain className="h-3 w-3 text-emerald-400" />
              <span className="running-stat-label">Elev Gain</span>
            </div>
            <span className="running-stat-value text-emerald-400">
              {Math.round(metersToFeet(activityData.summary.elevationGain))}
            </span>
            <span className="text-xs text-white/40">ft</span>
          </div>

          {/* Elapsed Time */}
          <div className="running-stat-card">
            <div className="flex items-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-amber-400" />
              <span className="running-stat-label">Time</span>
            </div>
            <span className="running-stat-value text-amber-400">
              {formatDuration(currentTime)}
            </span>
          </div>

          {/* Calories */}
          {activityData.summary.calories && (
            <div className="running-stat-card">
              <div className="flex items-center gap-1 mb-1">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="running-stat-label">Calories</span>
              </div>
              <span className="running-stat-value text-orange-400">
                {Math.round((currentTime / activityData.summary.duration) * activityData.summary.calories)}
              </span>
              <span className="text-xs text-white/40">kcal</span>
            </div>
          )}
        </div>
      </Card>

      {/* Heart Rate Zone Indicator */}
      {activityData.hasHeartRate && (
        <Card className="running-player-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white">Heart Rate Zone</span>
            {currentPoint?.hr && (
              <span className="ml-auto text-sm font-mono text-white/60">
                {currentPoint.hr} bpm
              </span>
            )}
          </div>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {HR_ZONES.map((zone, idx) => {
              const isActive = currentHrZone === idx + 1;
              return (
                <div
                  key={zone.name}
                  className="flex-1 relative transition-all duration-300"
                  style={{
                    backgroundColor: zone.color,
                    opacity: isActive ? 1 : 0.3,
                    transform: isActive ? "scaleY(1.1)" : "scaleY(1)",
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                    {isActive && (
                      <span className="text-[8px] font-medium">{zone.description}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/40">
            <span>50%</span>
            <span>60%</span>
            <span>70%</span>
            <span>80%</span>
            <span>90%</span>
            <span>100%</span>
          </div>
        </Card>
      )}

      {/* Pace Chart */}
      <Card className="running-player-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-[#ff6b35]" />
          <span className="text-sm font-semibold text-white">Pace (min/mi)</span>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart
            data={paceChartData}
            onClick={(data) => {
              if (data?.activePayload?.[0]?.payload?.index !== undefined) {
                handleChartSeek(data.activePayload[0].payload.index);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <defs>
              <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} reversed />
            <Area
              type="monotone"
              dataKey="pace"
              stroke="#ff6b35"
              fill="url(#paceGradient)"
              strokeWidth={2}
              connectNulls
            />
            <ReferenceLine
              x={currentTime}
              stroke="#00d084"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Controls Card */}
      <Card className="running-player-card p-4 space-y-4">
        {/* Progress Scrubber */}
        <div className="px-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="running-slider"
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
              className="running-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="running-play-btn h-12 w-12"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
              className="running-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-white/60" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="w-28 h-8 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pace">Pace</SelectItem>
                  {activityData.hasHeartRate && (
                    <SelectItem value="hr">Heart Rate</SelectItem>
                  )}
                  <SelectItem value="elevation">Elevation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Camera Mode */}
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-white/60" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-white">
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
              <Mountain className="h-4 w-4 text-white/60" />
              <Label htmlFor="terrain-toggle" className="text-sm text-white/80">3D</Label>
              <Switch
                id="terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
              />
            </div>

            {/* Satellite Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="satellite-toggle" className="text-sm text-white/80">Satellite</Label>
              <Switch
                id="satellite-toggle"
                checked={mapStyle === "satellite"}
                onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "outdoors")}
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-white/60" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="w-20 h-8 bg-white/5 border-white/10 text-white">
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

      {/* Styles for Running theme */}
      <style>{`
        .running-player-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .running-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .running-stat-label {
          display: block;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .running-stat-value {
          font-family: ui-monospace, monospace;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .running-control-btn {
          color: rgba(255, 255, 255, 0.7);
        }
        .running-control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .running-play-btn {
          background: linear-gradient(135deg, #ff6b35 0%, #00d084 100%);
          color: white;
          border-radius: 9999px;
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
          transition: all 0.2s;
        }
        .running-play-btn:hover {
          background: linear-gradient(135deg, #ff5722 0%, #00b371 100%);
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.6);
          transform: scale(1.05);
        }
        .running-slider [data-orientation="horizontal"] {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
        }
        .running-slider [data-orientation="horizontal"] > span {
          background: linear-gradient(90deg, #ff6b35, #00d084);
        }
        .running-slider [role="slider"] {
          background: white;
          border: 2px solid #ff6b35;
          width: 16px;
          height: 16px;
        }
      `}</style>
    </div>
  );
}
