/**
 * Cycling Player - Pro Cycling Computer Aesthetic
 *
 * Design Direction: Wahoo ELEMNT / Garmin Edge inspired
 * A technical, data-dense interface with precision engineering feel
 *
 * Aesthetic: Clean lines, structured grids, performance metrics
 * Color Palette:
 * - Primary: #00a8ff (Wahoo cyan)
 * - Accent: #ff5722 (Power/effort orange)
 * - Background: #0d1117 (Deep tech black)
 * - Grid lines: rgba(0, 168, 255, 0.1)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Heart,
  Route,
  ChevronUp,
  ChevronDown,
  Minus,
  Zap,
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

function getGradientIcon(grade: number) {
  if (grade > 2) return <ChevronUp className="w-5 h-5" />;
  if (grade < -2) return <ChevronDown className="w-5 h-5" />;
  return <Minus className="w-5 h-5" />;
}

function getGradientColor(grade: number): string {
  if (grade > 8) return "#ef4444";
  if (grade > 4) return "#f97316";
  if (grade > 0) return "#eab308";
  if (grade > -4) return "#22c55e";
  return "#3b82f6";
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

  if (!activityData) {
    return (
      <div className="cycling-player-wrapper">
        <div className="flex items-center justify-center h-96">
          <div className="cycling-loader" />
        </div>
        <style>{cyclingStyles}</style>
      </div>
    );
  }

  const currentChartTime = chartData.find((d) => d.index >= currentIndex)?.timeLabel;

  return (
    <div className="cycling-player-wrapper">
      {/* Main Display Grid */}
      <div className="cycling-main-grid">
        {/* Left Column - Primary Stats */}
        <div className="cycling-stats-column">
          {/* Speed - Hero Stat */}
          <div className="cycling-hero-stat">
            <div className="cycling-hero-label">
              <Gauge className="w-4 h-4" />
              <span>SPEED</span>
            </div>
            <div className="cycling-hero-value">
              {currentSpeed.toFixed(1)}
            </div>
            <div className="cycling-hero-unit">MPH</div>
          </div>

          {/* Grade Indicator */}
          <div className="cycling-grade-display" style={{ borderColor: getGradientColor(currentGrade) }}>
            <div className="cycling-grade-icon" style={{ color: getGradientColor(currentGrade) }}>
              {getGradientIcon(currentGrade)}
            </div>
            <div className="cycling-grade-value" style={{ color: getGradientColor(currentGrade) }}>
              {currentGrade >= 0 ? "+" : ""}{currentGrade.toFixed(1)}%
            </div>
            <div className="cycling-grade-label">GRADE</div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="cycling-stats-grid">
            <div className="cycling-stat-cell">
              <span className="cycling-stat-label">AVG</span>
              <span className="cycling-stat-value">{msToMph(statsUpToCurrent.avgSpeed).toFixed(1)}</span>
              <span className="cycling-stat-unit">mph</span>
            </div>
            <div className="cycling-stat-cell">
              <span className="cycling-stat-label">MAX</span>
              <span className="cycling-stat-value cycling-stat-accent">{msToMph(statsUpToCurrent.maxSpeed).toFixed(1)}</span>
              <span className="cycling-stat-unit">mph</span>
            </div>
            <div className="cycling-stat-cell">
              <span className="cycling-stat-label">ELEV</span>
              <span className="cycling-stat-value">{Math.round(currentElevation)}</span>
              <span className="cycling-stat-unit">ft</span>
            </div>
            <div className="cycling-stat-cell">
              <span className="cycling-stat-label">GAIN</span>
              <span className="cycling-stat-value cycling-stat-green">+{Math.round(statsUpToCurrent.elevationGain)}</span>
              <span className="cycling-stat-unit">ft</span>
            </div>
          </div>

          {/* Distance & Time */}
          <div className="cycling-distance-time">
            <div className="cycling-dt-item">
              <Route className="w-4 h-4 text-[#00a8ff]" />
              <span className="cycling-dt-value">{currentDistance.toFixed(2)}</span>
              <span className="cycling-dt-unit">mi</span>
            </div>
            <div className="cycling-dt-divider" />
            <div className="cycling-dt-item">
              <Timer className="w-4 h-4 text-[#00a8ff]" />
              <span className="cycling-dt-value">{formatDuration(currentTime)}</span>
            </div>
          </div>

          {/* Heart Rate if available */}
          {currentPoint?.hr && (
            <div className="cycling-hr-display">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="cycling-hr-value">{currentPoint.hr}</span>
              <span className="cycling-hr-unit">BPM</span>
            </div>
          )}
        </div>

        {/* Right Column - Map */}
        <div className="cycling-map-column">
          <div className="cycling-map-container">
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

          {/* Map Controls */}
          <div className="cycling-map-controls">
            <Select value={colorMode} onValueChange={(val) => setColorMode(val as ColorMode)}>
              <SelectTrigger className="cycling-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="cycling-select-content">
                <SelectItem value="speed">Speed</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                {activityData.hasHeartRate && <SelectItem value="hr">Heart Rate</SelectItem>}
                <SelectItem value="elevation">Elevation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cameraMode} onValueChange={(val) => setCameraMode(val as CameraMode)}>
              <SelectTrigger className="cycling-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="cycling-select-content">
                <SelectItem value="follow"><Navigation className="w-3 h-3 inline mr-1" />Follow</SelectItem>
                <SelectItem value="overview"><Eye className="w-3 h-3 inline mr-1" />Overview</SelectItem>
                <SelectItem value="firstPerson"><Video className="w-3 h-3 inline mr-1" />POV</SelectItem>
              </SelectContent>
            </Select>

            <div className="cycling-toggle">
              <Mountain className="w-4 h-4" />
              <Label className="text-xs">3D</Label>
              <Switch checked={terrain3D} onCheckedChange={setTerrain3D} />
            </div>

            <div className="cycling-toggle">
              <Label className="text-xs">SAT</Label>
              <Switch checked={mapStyle === "satellite"} onCheckedChange={(c) => setMapStyle(c ? "satellite" : "outdoors")} />
            </div>
          </div>
        </div>
      </div>

      {/* Elevation Profile Chart */}
      <div className="cycling-chart-container">
        <div className="cycling-chart-header">
          <TrendingUp className="w-4 h-4 text-[#00a8ff]" />
          <span>ELEVATION PROFILE</span>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="cyclingElevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00a8ff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00a8ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" hide />
            <YAxis yAxisId="elevation" hide domain={["dataMin - 50", "dataMax + 50"]} />
            <YAxis yAxisId="speed" hide orientation="right" domain={[0, "dataMax + 5"]} />
            <Area yAxisId="elevation" type="monotone" dataKey="elevation" stroke="#00a8ff" fill="url(#cyclingElevGrad)" strokeWidth={2} />
            <Line yAxisId="speed" type="monotone" dataKey="speed" stroke="#ff5722" strokeWidth={1.5} dot={false} opacity={0.7} />
            {currentChartTime && (
              <ReferenceLine yAxisId="elevation" x={currentChartTime} stroke="#ffffff" strokeWidth={2} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="cycling-chart-legend">
          <span><span className="cycling-legend-dot cyan" /> Elevation</span>
          <span><span className="cycling-legend-dot orange" /> Speed</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="cycling-playback">
        <div className="cycling-progress-bar">
          <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="cycling-slider" />
        </div>
        <div className="cycling-controls">
          <Button variant="ghost" size="icon" onClick={handleSkipBack} disabled={currentIndex === 0} className="cycling-btn">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button onClick={handlePlayPause} className="cycling-play-btn">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSkipForward} disabled={currentIndex >= activityData.dataPoints.length - 1} className="cycling-btn">
            <SkipForward className="w-5 h-5" />
          </Button>
          <div className="cycling-speed-select">
            <Zap className="w-4 h-4" />
            <Select value={playbackSpeed.toString()} onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}>
              <SelectTrigger className="cycling-select-mini">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="cycling-select-content">
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <style>{cyclingStyles}</style>
    </div>
  );
}

const cyclingStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Rajdhani:wght@500;600;700&display=swap');

  .cycling-player-wrapper {
    --cycling-bg: #0d1117;
    --cycling-surface: #161b22;
    --cycling-border: rgba(0, 168, 255, 0.15);
    --cycling-cyan: #00a8ff;
    --cycling-orange: #ff5722;
    --cycling-text: #e6edf3;
    --cycling-muted: #7d8590;

    background: var(--cycling-bg);
    border-radius: 12px;
    overflow: hidden;
    font-family: 'Rajdhani', sans-serif;
    color: var(--cycling-text);
  }

  .cycling-main-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1px;
    background: var(--cycling-border);
  }

  .cycling-stats-column {
    background: var(--cycling-bg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .cycling-hero-stat {
    background: linear-gradient(135deg, rgba(0, 168, 255, 0.1) 0%, rgba(0, 168, 255, 0.02) 100%);
    border: 1px solid var(--cycling-border);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .cycling-hero-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--cycling-cyan);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }

  .cycling-hero-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    color: var(--cycling-text);
  }

  .cycling-hero-unit {
    font-size: 14px;
    color: var(--cycling-muted);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .cycling-grade-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--cycling-surface);
    border-radius: 8px;
    border-left: 3px solid;
  }

  .cycling-grade-icon {
    display: flex;
    align-items: center;
  }

  .cycling-grade-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 24px;
    font-weight: 700;
    flex: 1;
  }

  .cycling-grade-label {
    font-size: 10px;
    color: var(--cycling-muted);
    letter-spacing: 0.1em;
  }

  .cycling-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .cycling-stat-cell {
    background: var(--cycling-surface);
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .cycling-stat-label {
    font-size: 9px;
    color: var(--cycling-muted);
    letter-spacing: 0.1em;
  }

  .cycling-stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: var(--cycling-text);
  }

  .cycling-stat-accent { color: var(--cycling-orange); }
  .cycling-stat-green { color: #22c55e; }

  .cycling-stat-unit {
    font-size: 10px;
    color: var(--cycling-muted);
  }

  .cycling-distance-time {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 12px;
    background: var(--cycling-surface);
    border-radius: 8px;
  }

  .cycling-dt-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cycling-dt-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 600;
  }

  .cycling-dt-unit {
    font-size: 12px;
    color: var(--cycling-muted);
  }

  .cycling-dt-divider {
    width: 1px;
    height: 20px;
    background: var(--cycling-border);
  }

  .cycling-hr-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 6px;
  }

  .cycling-hr-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: #ef4444;
  }

  .cycling-hr-unit {
    font-size: 11px;
    color: var(--cycling-muted);
  }

  .cycling-map-column {
    background: var(--cycling-bg);
    display: flex;
    flex-direction: column;
  }

  .cycling-map-container {
    flex: 1;
    min-height: 400px;
    position: relative;
  }

  .cycling-map-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--cycling-surface);
    border-top: 1px solid var(--cycling-border);
  }

  .cycling-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--cycling-muted);
  }

  .cycling-chart-container {
    padding: 16px;
    background: var(--cycling-surface);
    border-top: 1px solid var(--cycling-border);
  }

  .cycling-chart-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--cycling-muted);
    margin-bottom: 12px;
  }

  .cycling-chart-legend {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--cycling-muted);
  }

  .cycling-legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 4px;
  }

  .cycling-legend-dot.cyan { background: var(--cycling-cyan); }
  .cycling-legend-dot.orange { background: var(--cycling-orange); }

  .cycling-playback {
    padding: 16px;
    background: var(--cycling-bg);
    border-top: 1px solid var(--cycling-border);
  }

  .cycling-progress-bar {
    margin-bottom: 12px;
  }

  .cycling-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .cycling-btn {
    color: var(--cycling-muted);
    transition: color 0.2s;
  }

  .cycling-btn:hover { color: var(--cycling-text); }
  .cycling-btn:disabled { opacity: 0.3; }

  .cycling-play-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--cycling-cyan) 0%, #0077b6 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .cycling-play-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(0, 168, 255, 0.4);
  }

  .cycling-speed-select {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--cycling-muted);
    margin-left: 16px;
  }

  .cycling-select {
    height: 32px;
    background: var(--cycling-surface);
    border: 1px solid var(--cycling-border);
    color: var(--cycling-text);
    font-size: 12px;
    min-width: 90px;
  }

  .cycling-select-mini {
    height: 28px;
    width: 60px;
    background: var(--cycling-surface);
    border: 1px solid var(--cycling-border);
    color: var(--cycling-text);
    font-size: 11px;
  }

  .cycling-select-content {
    background: var(--cycling-surface);
    border: 1px solid var(--cycling-border);
    color: var(--cycling-text);
  }

  .cycling-slider [data-orientation="horizontal"] {
    height: 4px;
    background: var(--cycling-surface);
  }

  .cycling-slider [data-orientation="horizontal"] > span {
    background: var(--cycling-cyan);
  }

  .cycling-slider [role="slider"] {
    width: 14px;
    height: 14px;
    background: var(--cycling-cyan);
    border: 2px solid var(--cycling-bg);
  }

  .cycling-loader {
    width: 40px;
    height: 40px;
    border: 3px solid var(--cycling-border);
    border-top-color: var(--cycling-cyan);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .cycling-main-grid {
      grid-template-columns: 1fr;
    }

    .cycling-stats-column {
      order: 2;
    }

    .cycling-map-column {
      order: 1;
    }

    .cycling-hero-value {
      font-size: 36px;
    }
  }
`;
