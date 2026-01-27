/**
 * Cycling Player - Health-focused cycling activity display
 *
 * Design: Technical, data-dense, cycling computer aesthetic
 * Features: Speed, gradient, heart rate, elevation profile
 * Full 3D terrain with all map controls
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
  TrendingUp,
  Timer,
  Heart,
  Route,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { CyclingMap, type CyclingMapRef, type CameraMode, type MapStyle, type ColorMode } from "./CyclingMap";

interface CyclingPlayerProps {
  data: SuuntoParseResult;
}

function getGradientInfo(grade: number): { icon: React.ReactNode; color: string; label: string } {
  if (grade > 8) return { icon: <ChevronUp className="w-4 h-4" />, color: "#ef4444", label: "Steep Climb" };
  if (grade > 4) return { icon: <ChevronUp className="w-4 h-4" />, color: "#f97316", label: "Climb" };
  if (grade > 1) return { icon: <ChevronUp className="w-4 h-4" />, color: "#eab308", label: "Uphill" };
  if (grade > -1) return { icon: <Minus className="w-4 h-4" />, color: "#22c55e", label: "Flat" };
  if (grade > -4) return { icon: <ChevronDown className="w-4 h-4" />, color: "#3b82f6", label: "Downhill" };
  return { icon: <ChevronDown className="w-4 h-4" />, color: "#8b5cf6", label: "Steep Descent" };
}

export function CyclingPlayer({ data }: CyclingPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<CyclingMapRef>(null);

  useEffect(() => {
    try {
      const parsed = parseActivityData({ type: "suunto", data });
      const resampled = resampleDataPoints(parsed.dataPoints, 5000);
      setActivityData({ ...parsed, dataPoints: resampled });
    } catch (e) {
      console.error("Failed to parse activity data:", e);
    }
  }, [data]);

  useEffect(() => {
    if (!isPlaying || !activityData) return;

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playbackSpeed, activityData]);

  const handlePlayPause = useCallback(() => {
    if (!activityData) return;
    if (currentIndex >= activityData.dataPoints.length - 1) setCurrentIndex(0);
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
    setCurrentIndex((prev) => Math.max(0, prev - 6));
    lastUpdateRef.current = 0;
  }, [activityData]);

  const handleSkipForward = useCallback(() => {
    if (!activityData) return;
    setCurrentIndex((prev) => Math.min(activityData.dataPoints.length - 1, prev + 6));
    lastUpdateRef.current = 0;
  }, [activityData]);

  const chartData = useMemo(() => {
    if (!activityData) return [];
    const sampleRate = Math.max(1, Math.floor(activityData.dataPoints.length / 150));
    return activityData.dataPoints
      .filter((_, i) => i % sampleRate === 0)
      .map((point, idx) => ({
        index: idx * sampleRate,
        time: point.timestamp / 1000,
        timeLabel: formatDuration(point.timestamp / 1000),
        elevation: point.elevation !== undefined ? metersToFeet(point.elevation) : 0,
        speed: point.speed !== undefined ? msToMph(point.speed) : 0,
      }));
  }, [activityData]);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData ? (currentIndex / (activityData.dataPoints.length - 1)) * 100 : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  const currentSpeed = currentPoint?.speed !== undefined ? msToMph(currentPoint.speed) : 0;
  const currentGrade = currentPoint?.grade ?? 0;
  const currentElevation = currentPoint?.elevation !== undefined ? metersToFeet(currentPoint.elevation) : 0;
  const currentDistance = currentPoint?.distance !== undefined ? currentPoint.distance * 0.000621371 : 0;

  const statsUpToCurrent = useMemo(() => {
    if (!activityData) return { avgSpeed: 0, maxSpeed: 0, elevationGain: 0 };
    const pointsToNow = activityData.dataPoints.slice(0, currentIndex + 1);
    const speeds = pointsToNow.map(p => p.speed).filter((s): s is number => s !== undefined);
    let elevationGain = 0;
    for (let i = 1; i < pointsToNow.length; i++) {
      const prev = pointsToNow[i - 1].elevation;
      const curr = pointsToNow[i].elevation;
      if (prev !== undefined && curr !== undefined && curr > prev) elevationGain += curr - prev;
    }
    return {
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      elevationGain: metersToFeet(elevationGain),
    };
  }, [activityData, currentIndex]);

  const tempFahrenheit = data.temperature?.avgCelsius !== undefined
    ? Math.round(data.temperature.avgCelsius * 9/5 + 32)
    : undefined;

  const gradientInfo = getGradientInfo(currentGrade);

  if (!activityData) {
    return (
      <Card className="cycling-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </div>
      </Card>
    );
  }

  const currentChartTime = chartData.find((d) => d.index >= currentIndex)?.timeLabel;

  return (
    <div className="cycling-player space-y-4">
      {/* Map */}
      <Card className="cycling-card overflow-hidden">
        <div className="relative" style={{ height: "450px" }}>
          <CyclingMap
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
            highlightedSegment={null}
          />
        </div>
      </Card>

      {/* Controls Card */}
      <Card className="cycling-card p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div className="cycling-stat cycling-stat-primary">
            <span className="cycling-stat-label">
              <Gauge className="w-3 h-3" /> Speed
            </span>
            <span className="cycling-stat-value text-cyan-400">{currentSpeed.toFixed(1)} mph</span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              {gradientInfo.icon} Grade
            </span>
            <span className="cycling-stat-value" style={{ color: gradientInfo.color }}>
              {currentGrade >= 0 ? "+" : ""}{currentGrade.toFixed(1)}%
            </span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              <TrendingUp className="w-3 h-3" /> Avg
            </span>
            <span className="cycling-stat-value">{msToMph(statsUpToCurrent.avgSpeed).toFixed(1)} mph</span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              <Gauge className="w-3 h-3" /> Max
            </span>
            <span className="cycling-stat-value text-orange-400">{msToMph(statsUpToCurrent.maxSpeed).toFixed(1)} mph</span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              <Route className="w-3 h-3" /> Distance
            </span>
            <span className="cycling-stat-value">{currentDistance.toFixed(2)} mi</span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              <Mountain className="w-3 h-3" /> Elev Gain
            </span>
            <span className="cycling-stat-value text-green-400">+{Math.round(statsUpToCurrent.elevationGain)} ft</span>
          </div>

          <div className="cycling-stat">
            <span className="cycling-stat-label">
              <Timer className="w-3 h-3" /> Time
            </span>
            <span className="cycling-stat-value">{formatDuration(currentTime)}</span>
          </div>
        </div>

        {/* Heart Rate if available */}
        {activityData.hasHeartRate && currentPoint?.hr && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-mono font-bold text-red-400">{currentPoint.hr}</span>
            <span className="text-sm text-red-400/70">BPM</span>
          </div>
        )}

        {/* Progress Scrubber */}
        <div className="px-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cycling-slider"
          />
        </div>

        {/* Control Buttons & Options */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSkipBack} disabled={currentIndex === 0} className="cycling-btn">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={handlePlayPause} className="cycling-play-btn h-10 w-10">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSkipForward} disabled={currentIndex >= activityData.dataPoints.length - 1} className="cycling-btn">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Select value={colorMode} onValueChange={(val) => setColorMode(val as ColorMode)}>
                <SelectTrigger className="w-28 h-8 cycling-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speed">Speed</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  {activityData.hasHeartRate && <SelectItem value="hr">Heart Rate</SelectItem>}
                  <SelectItem value="elevation">Elevation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <Select value={cameraMode} onValueChange={(val) => setCameraMode(val as CameraMode)}>
                <SelectTrigger className="w-32 h-8 cycling-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow"><Navigation className="h-3 w-3 inline mr-1" />Follow</SelectItem>
                  <SelectItem value="overview"><Eye className="h-3 w-3 inline mr-1" />Overview</SelectItem>
                  <SelectItem value="firstPerson"><Video className="h-3 w-3 inline mr-1" />First Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">3D</Label>
              <Switch checked={terrain3D} onCheckedChange={setTerrain3D} />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Satellite</Label>
              <Switch checked={mapStyle === "satellite"} onCheckedChange={(c) => setMapStyle(c ? "satellite" : "outdoors")} />
            </div>

            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <Select value={playbackSpeed.toString()} onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}>
                <SelectTrigger className="w-20 h-8 cycling-select">
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

      {/* Elevation & Speed Chart */}
      <Card className="cycling-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-medium">Elevation & Speed Profile</span>
          <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-500 rounded-sm" /> Elevation</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 bg-orange-500 rounded-sm" /> Speed</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="cycleElevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" hide />
            <YAxis yAxisId="elevation" hide domain={["dataMin - 50", "dataMax + 50"]} />
            <YAxis yAxisId="speed" hide orientation="right" domain={[0, "dataMax + 5"]} />
            <Area yAxisId="elevation" type="monotone" dataKey="elevation" stroke="#06b6d4" fill="url(#cycleElevGrad)" strokeWidth={2} />
            <Line yAxisId="speed" type="monotone" dataKey="speed" stroke="#f97316" strokeWidth={1.5} dot={false} opacity={0.8} />
            {currentChartTime && (
              <ReferenceLine yAxisId="elevation" x={currentChartTime} stroke="#ffffff" strokeWidth={2} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <style>{`
        .cycling-card {
          background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
          border: 1px solid rgba(6, 182, 212, 0.15);
          color: #e6edf3;
        }
        .cycling-stat {
          background: rgba(6, 182, 212, 0.05);
          border-radius: 0.5rem;
          padding: 0.75rem;
          text-align: center;
          border: 1px solid rgba(6, 182, 212, 0.1);
        }
        .cycling-stat-primary {
          background: rgba(6, 182, 212, 0.1);
          border-color: rgba(6, 182, 212, 0.2);
        }
        .cycling-stat-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }
        .cycling-stat-value {
          font-family: ui-monospace, monospace;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .cycling-btn {
          color: rgba(255, 255, 255, 0.7);
        }
        .cycling-btn:hover {
          background: rgba(6, 182, 212, 0.1);
          color: white;
        }
        .cycling-play-btn {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
          border-radius: 9999px;
        }
        .cycling-play-btn:hover {
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
        }
        .cycling-select {
          background: rgba(6, 182, 212, 0.05);
          border-color: rgba(6, 182, 212, 0.15);
        }
      `}</style>
    </div>
  );
}
