/**
 * Cycling Player - Activity Player focused on cycling metrics
 *
 * Features:
 * - Full 3D terrain map with mapbox-dem (exaggeration ~2.0)
 * - Satellite/outdoors toggle and camera modes (follow, overview, firstPerson)
 * - Cycling-specific metrics: speed, power zones, cadence, gradient
 * - Wahoo/Garmin inspired color scheme
 * - Prominent speed/elevation profile chart
 * - Power/effort zone indicator and gradient display
 *
 * Color Palette:
 * - Primary: #0066cc (Wahoo blue)
 * - Accent: #ff6b35 (Orange for speed/power)
 * - Background: #1a1a2e (Dark charcoal)
 * - Stats: #f8f9fa (Light text on dark)
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
  Video,
  Eye,
  Navigation,
  TrendingUp,
  Timer,
  Zap,
  Heart,
  Route,
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

// Power/Effort zones based on heart rate percentage
type PowerZone = "recovery" | "endurance" | "tempo" | "threshold" | "vo2max" | "anaerobic";

function getPowerZone(hr: number | undefined, maxHr: number = 190): { zone: PowerZone; percentage: number; color: string; label: string } {
  if (!hr) return { zone: "recovery", percentage: 0, color: "#6b7280", label: "---" };

  const percentage = (hr / maxHr) * 100;

  if (percentage < 60) return { zone: "recovery", percentage, color: "#22c55e", label: "Z1 Recovery" };
  if (percentage < 70) return { zone: "endurance", percentage, color: "#3b82f6", label: "Z2 Endurance" };
  if (percentage < 80) return { zone: "tempo", percentage, color: "#eab308", label: "Z3 Tempo" };
  if (percentage < 90) return { zone: "threshold", percentage, color: "#f97316", label: "Z4 Threshold" };
  if (percentage < 95) return { zone: "vo2max", percentage, color: "#ef4444", label: "Z5 VO2max" };
  return { zone: "anaerobic", percentage: Math.min(percentage, 100), color: "#dc2626", label: "Z6 Anaerobic" };
}

function getGradientLabel(grade: number | undefined): { label: string; color: string } {
  if (grade === undefined) return { label: "---", color: "#6b7280" };

  if (grade > 10) return { label: "Steep Climb", color: "#dc2626" };
  if (grade > 5) return { label: "Climb", color: "#f97316" };
  if (grade > 2) return { label: "False Flat", color: "#eab308" };
  if (grade > -2) return { label: "Flat", color: "#22c55e" };
  if (grade > -5) return { label: "Descent", color: "#3b82f6" };
  return { label: "Steep Descent", color: "#6366f1" };
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
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<CyclingMapRef>(null);

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
  const handleChartClick = useCallback((chartData: { activePayload?: Array<{ payload: { index: number } }> }) => {
    if (chartData.activePayload?.[0]?.payload) {
      setCurrentIndex(chartData.activePayload[0].payload.index);
      lastUpdateRef.current = 0;
    }
  }, []);

  // Build chart data
  const chartData = useMemo(() => {
    if (!activityData) return [];

    const sampleRate = Math.max(1, Math.floor(activityData.dataPoints.length / 200));
    const result: Array<{
      index: number;
      time: number;
      timeLabel: string;
      elevation: number;
      speed: number;
      gradient: number;
    }> = [];

    for (let i = 0; i < activityData.dataPoints.length; i += sampleRate) {
      const point = activityData.dataPoints[i];
      result.push({
        index: i,
        time: point.timestamp / 1000,
        timeLabel: formatDuration(point.timestamp / 1000),
        elevation: point.elevation !== undefined ? metersToFeet(point.elevation) : 0,
        speed: point.speed !== undefined ? msToMph(point.speed) : 0,
        gradient: point.grade ?? 0,
      });
    }

    return result;
  }, [activityData]);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Calculate current stats
  const currentSpeed = currentPoint?.speed !== undefined ? msToMph(currentPoint.speed) : 0;
  const currentGrade = currentPoint?.grade ?? 0;
  const currentElevation = currentPoint?.elevation !== undefined ? metersToFeet(currentPoint.elevation) : 0;
  const currentDistance = currentPoint?.distance !== undefined ? currentPoint.distance * 0.000621371 : 0;

  // Calculate averages and max from all points up to current
  const statsUpToCurrent = useMemo(() => {
    if (!activityData) return { avgSpeed: 0, maxSpeed: 0, elevationGain: 0 };

    const pointsToNow = activityData.dataPoints.slice(0, currentIndex + 1);
    const speeds = pointsToNow.map(p => p.speed).filter((s): s is number => s !== undefined);

    let elevationGain = 0;
    for (let i = 1; i < pointsToNow.length; i++) {
      const prev = pointsToNow[i - 1].elevation;
      const curr = pointsToNow[i].elevation;
      if (prev !== undefined && curr !== undefined && curr > prev) {
        elevationGain += curr - prev;
      }
    }

    return {
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      elevationGain: metersToFeet(elevationGain),
    };
  }, [activityData, currentIndex]);

  // Power zone based on HR
  const powerZone = getPowerZone(currentPoint?.hr, data.heartRate?.maxBpm || 190);
  const gradientInfo = getGradientLabel(currentGrade);

  // Temperature from data
  const temperature = data.temperature?.avgCelsius;
  const tempFahrenheit = temperature !== undefined
    ? Math.round(temperature * 9/5 + 32)
    : undefined;

  if (!activityData) {
    return (
      <Card className="cycling-player-card p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc]" />
        </div>
      </Card>
    );
  }

  const currentChartTime = chartData.find((d) => d.time >= currentTime)?.timeLabel;

  return (
    <div className="cycling-player space-y-4">
      {/* Map */}
      <Card className="cycling-player-card overflow-hidden">
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
            highlightedSegment={highlightedSegment}
          />
        </div>
      </Card>

      {/* Cycling Stats Dashboard */}
      <Card className="cycling-player-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Current Speed - Large */}
          <div className="cycling-stat-card cycling-stat-primary col-span-1">
            <div className="flex items-center gap-1 text-[#ff6b35] mb-1">
              <Gauge className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Speed</span>
            </div>
            <div className="cycling-stat-value text-2xl">{currentSpeed.toFixed(1)}</div>
            <div className="text-xs text-gray-400">mph</div>
          </div>

          {/* Gradient */}
          <div className="cycling-stat-card">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Grade</span>
            </div>
            <div className="cycling-stat-value" style={{ color: gradientInfo.color }}>
              {currentGrade >= 0 ? "+" : ""}{currentGrade.toFixed(1)}%
            </div>
            <div className="text-xs" style={{ color: gradientInfo.color }}>{gradientInfo.label}</div>
          </div>

          {/* Elevation */}
          <div className="cycling-stat-card">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <Mountain className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Elev</span>
            </div>
            <div className="cycling-stat-value">{Math.round(currentElevation)}</div>
            <div className="text-xs text-gray-400">ft</div>
          </div>

          {/* Distance */}
          <div className="cycling-stat-card">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <Route className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Dist</span>
            </div>
            <div className="cycling-stat-value">{currentDistance.toFixed(2)}</div>
            <div className="text-xs text-gray-400">mi</div>
          </div>

          {/* Time */}
          <div className="cycling-stat-card">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
              <Timer className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Time</span>
            </div>
            <div className="cycling-stat-value text-sm">{formatDuration(currentTime)}</div>
            <div className="text-xs text-gray-400">/ {formatDuration(activityData.summary.duration)}</div>
          </div>

          {/* Heart Rate with Zone */}
          {currentPoint?.hr !== undefined && (
            <div className="cycling-stat-card">
              <div className="flex items-center gap-1 text-gray-400 mb-1">
                <Heart className="w-4 h-4" style={{ color: powerZone.color }} />
                <span className="text-xs uppercase tracking-wider">HR</span>
              </div>
              <div className="cycling-stat-value" style={{ color: powerZone.color }}>
                {currentPoint.hr}
              </div>
              <div className="text-xs" style={{ color: powerZone.color }}>{powerZone.label}</div>
            </div>
          )}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-700">
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Avg Speed</span>
            <div className="text-[#0066cc] font-mono font-bold">
              {msToMph(statsUpToCurrent.avgSpeed).toFixed(1)} mph
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Max Speed</span>
            <div className="text-[#ff6b35] font-mono font-bold">
              {msToMph(statsUpToCurrent.maxSpeed).toFixed(1)} mph
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Elev Gain</span>
            <div className="text-green-500 font-mono font-bold">
              +{Math.round(statsUpToCurrent.elevationGain)} ft
            </div>
          </div>
        </div>

        {/* Power Zone Bar */}
        {currentPoint?.hr !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#ff6b35]" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Effort Zone</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: "10%" }} />
              <div className="h-full bg-blue-500" style={{ width: "10%" }} />
              <div className="h-full bg-yellow-500" style={{ width: "10%" }} />
              <div className="h-full bg-orange-500" style={{ width: "10%" }} />
              <div className="h-full bg-red-500" style={{ width: "5%" }} />
              <div className="h-full bg-red-700" style={{ width: "5%" }} />
              <div className="h-full bg-gray-700 flex-1" />
            </div>
            <div
              className="h-4 w-1 bg-white rounded-full -mt-3.5 relative transition-all duration-200"
              style={{ marginLeft: `${Math.min(powerZone.percentage / 100 * 50, 49)}%` }}
            />
          </div>
        )}
      </Card>

      {/* Controls Card */}
      <Card className="cycling-player-card p-4 space-y-4">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="cycling-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="cycling-play-btn h-10 w-10"
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
              className="cycling-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="w-28 h-8 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="speed">Speed</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
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
                <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
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
                <SelectTrigger className="w-20 h-8 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
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

      {/* Elevation/Speed Profile Chart */}
      <Card className="cycling-player-card p-4">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0066cc]" />
          Elevation & Speed Profile
        </h4>
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart
            data={chartData}
            onClick={handleChartClick}
            style={{ cursor: "pointer" }}
          >
            <defs>
              <linearGradient id="cyclingElevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0066cc" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#0066cc" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" hide />
            <YAxis yAxisId="elevation" hide domain={["dataMin - 50", "dataMax + 50"]} />
            <YAxis yAxisId="speed" hide orientation="right" domain={[0, "dataMax + 5"]} />
            <Area
              yAxisId="elevation"
              type="monotone"
              dataKey="elevation"
              stroke="#0066cc"
              fill="url(#cyclingElevationGradient)"
              strokeWidth={2}
            />
            <Line
              yAxisId="speed"
              type="monotone"
              dataKey="speed"
              stroke="#ff6b35"
              strokeWidth={2}
              dot={false}
            />
            {currentChartTime && (
              <ReferenceLine
                x={currentChartTime}
                stroke="#ffffff"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#0066cc] rounded-sm" />
            <span>Elevation (ft)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[#ff6b35] rounded-sm" />
            <span>Speed (mph)</span>
          </div>
        </div>
      </Card>

      {/* Styles for Cycling theme */}
      <style>{`
        .cycling-player-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #2a2a4a;
          color: #f8f9fa;
        }
        .cycling-stat-card {
          background: rgba(0, 102, 204, 0.1);
          border-radius: 0.5rem;
          padding: 0.75rem;
          border: 1px solid rgba(0, 102, 204, 0.2);
        }
        .cycling-stat-primary {
          background: rgba(255, 107, 53, 0.1);
          border-color: rgba(255, 107, 53, 0.3);
        }
        .cycling-stat-value {
          font-family: ui-monospace, monospace;
          font-weight: 700;
          color: #f8f9fa;
        }
        .cycling-control-btn {
          color: #f8f9fa;
        }
        .cycling-control-btn:hover {
          background: rgba(0, 102, 204, 0.2);
        }
        .cycling-play-btn {
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          color: white;
          border-radius: 9999px;
        }
        .cycling-play-btn:hover {
          background: linear-gradient(135deg, #e55a2b 0%, #e08319 100%);
        }
        .cycling-slider [data-orientation="horizontal"] {
          background: #2a2a4a;
        }
        .cycling-slider [role="slider"] {
          background: #ff6b35;
          border-color: #ff6b35;
        }
      `}</style>
    </div>
  );
}
