/**
 * Running Player - Health-focused running activity display
 *
 * Design: Clean, athletic, focused on running metrics
 * Features: Pace, heart rate zones, cadence, elevation
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
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { RunningMap, type RunningMapRef, type CameraMode, type MapStyle } from "./RunningMap";

interface RunningPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "pace" | "hr" | "elevation";

const HR_ZONES = [
  { name: "1", min: 50, max: 60, color: "#6b7280", label: "Recovery" },
  { name: "2", min: 60, max: 70, color: "#22c55e", label: "Easy" },
  { name: "3", min: 70, max: 80, color: "#eab308", label: "Aerobic" },
  { name: "4", min: 80, max: 90, color: "#f97316", label: "Threshold" },
  { name: "5", min: 90, max: 100, color: "#ef4444", label: "Max" },
];

function speedToPace(speedMs: number): number {
  if (speedMs <= 0) return 0;
  const mph = msToMph(speedMs);
  if (mph <= 0) return 0;
  return 60 / mph;
}

function formatPace(minPerMile: number): string {
  if (minPerMile <= 0 || !isFinite(minPerMile) || minPerMile > 60) return "--:--";
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

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

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<RunningMapRef>(null);

  useEffect(() => {
    try {
      const parsed = parseActivityData({ type: "suunto", data });
      const resampled = resampleDataPoints(parsed.dataPoints, 5000);
      setActivityData({ ...parsed, dataPoints: resampled });
    } catch (e) {
      console.error("Failed to parse activity data:", e);
    }
  }, [data]);

  const estimatedMaxHr = useMemo(() => {
    if (!activityData?.summary.maxHr) return 190;
    return Math.max(activityData.summary.maxHr + 5, 190);
  }, [activityData]);

  const paceChartData = useMemo(() => {
    if (!activityData) return [];
    const sampleRate = Math.max(1, Math.floor(activityData.dataPoints.length / 100));
    return activityData.dataPoints
      .filter((_, i) => i % sampleRate === 0)
      .map((point, idx) => ({
        index: idx * sampleRate,
        time: point.timestamp / 1000,
        pace: point.speed ? speedToPace(point.speed) : null,
      }));
  }, [activityData]);

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

  const handleChartSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData ? (currentIndex / (activityData.dataPoints.length - 1)) * 100 : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  const currentPace = currentPoint?.speed ? speedToPace(currentPoint.speed) : 0;
  const avgPace = activityData?.summary.avgSpeed ? speedToPace(activityData.summary.avgSpeed) : 0;
  const currentHrZone = currentPoint?.hr ? getHRZone(currentPoint.hr, estimatedMaxHr) : 0;
  const currentDistance = currentPoint?.distance ? currentPoint.distance * 0.000621371 : 0;

  const tempFahrenheit = data.temperature?.avgCelsius !== undefined
    ? Math.round(data.temperature.avgCelsius * 9/5 + 32)
    : undefined;

  if (!activityData) {
    return (
      <Card className="running-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      </Card>
    );
  }

  const hrZoneInfo = currentHrZone > 0 ? HR_ZONES[currentHrZone - 1] : null;

  return (
    <div className="running-player space-y-4">
      {/* Map */}
      <Card className="running-card overflow-hidden">
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
            highlightedSegment={null}
          />
        </div>
      </Card>

      {/* Controls Card */}
      <Card className="running-card p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
          <div className="running-stat">
            <span className="running-stat-label">
              <Timer className="w-3 h-3" /> Pace
            </span>
            <span className="running-stat-value text-orange-500">{formatPace(currentPace)}/mi</span>
          </div>

          <div className="running-stat">
            <span className="running-stat-label">
              <TrendingUp className="w-3 h-3" /> Avg Pace
            </span>
            <span className="running-stat-value">{formatPace(avgPace)}/mi</span>
          </div>

          <div className="running-stat">
            <span className="running-stat-label">
              <Activity className="w-3 h-3" /> Distance
            </span>
            <span className="running-stat-value">{currentDistance.toFixed(2)} mi</span>
          </div>

          <div className="running-stat">
            <span className="running-stat-label">
              <Timer className="w-3 h-3" /> Time
            </span>
            <span className="running-stat-value">{formatDuration(currentTime)}</span>
          </div>

          {activityData.hasHeartRate && currentPoint?.hr && (
            <div className="running-stat">
              <span className="running-stat-label">
                <Heart className="w-3 h-3" /> Heart Rate
              </span>
              <span className="running-stat-value" style={{ color: hrZoneInfo?.color }}>
                {currentPoint.hr} bpm
              </span>
            </div>
          )}

          <div className="running-stat">
            <span className="running-stat-label">
              <Mountain className="w-3 h-3" /> Elev Gain
            </span>
            <span className="running-stat-value">{Math.round(metersToFeet(activityData.summary.elevationGain))} ft</span>
          </div>
        </div>

        {/* Heart Rate Zone Bar */}
        {activityData.hasHeartRate && currentPoint?.hr && (
          <div className="running-hr-zones">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4" style={{ color: hrZoneInfo?.color }} />
              <span className="text-xs font-medium text-muted-foreground">HR Zone</span>
              <span className="text-xs ml-auto" style={{ color: hrZoneInfo?.color }}>
                {hrZoneInfo?.label}
              </span>
            </div>
            <div className="flex gap-1 h-6 rounded overflow-hidden">
              {HR_ZONES.map((zone, idx) => (
                <div
                  key={zone.name}
                  className="flex-1 flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    backgroundColor: currentHrZone === idx + 1 ? zone.color : "rgba(255,255,255,0.1)",
                    color: currentHrZone === idx + 1 ? "white" : "rgba(255,255,255,0.3)",
                    transform: currentHrZone === idx + 1 ? "scaleY(1.15)" : "scaleY(1)",
                  }}
                >
                  {zone.name}
                </div>
              ))}
            </div>
          </div>
        )}

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
            <Button variant="ghost" size="icon" onClick={handleSkipBack} disabled={currentIndex === 0} className="running-btn">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={handlePlayPause} className="running-play-btn h-10 w-10">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSkipForward} disabled={currentIndex >= activityData.dataPoints.length - 1} className="running-btn">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Select value={colorMode} onValueChange={(val) => setColorMode(val as ColorMode)}>
                <SelectTrigger className="w-28 h-8 running-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pace">Pace</SelectItem>
                  {activityData.hasHeartRate && <SelectItem value="hr">Heart Rate</SelectItem>}
                  <SelectItem value="elevation">Elevation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <Select value={cameraMode} onValueChange={(val) => setCameraMode(val as CameraMode)}>
                <SelectTrigger className="w-32 h-8 running-select">
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
                <SelectTrigger className="w-20 h-8 running-select">
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

      {/* Pace Chart */}
      <Card className="running-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Pace Profile</span>
          <span className="text-xs text-muted-foreground ml-auto">Click to seek</span>
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
              <linearGradient id="runPaceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} reversed />
            <Area type="monotone" dataKey="pace" stroke="#f97316" fill="url(#runPaceGrad)" strokeWidth={2} connectNulls />
            <ReferenceLine x={currentTime} stroke="#22c55e" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <style>{`
        .running-card {
          background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f5f5f7;
        }
        .running-stat {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          padding: 0.75rem;
          text-align: center;
        }
        .running-stat-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }
        .running-stat-value {
          font-family: ui-monospace, monospace;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .running-btn {
          color: rgba(255, 255, 255, 0.7);
        }
        .running-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .running-play-btn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border-radius: 9999px;
        }
        .running-play-btn:hover {
          background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
        }
        .running-select {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .running-hr-zones {
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
