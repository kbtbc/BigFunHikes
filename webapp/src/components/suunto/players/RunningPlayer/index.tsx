/**
 * Running Player - Nike Run Club Inspired Aesthetic
 *
 * Design Direction: Bold, kinetic energy, high contrast
 * Motivational running app feel with dynamic stats
 *
 * Aesthetic: Dark with vibrant neon accents, motion-focused
 * Color Palette:
 * - Primary: #ff3366 (Electric pink/red - energy)
 * - Secondary: #00ff87 (Neon green - success/pace)
 * - Accent: #ffcc00 (Gold - achievement)
 * - Background: #0a0a0a (Pure black)
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
  Heart,
  Flame,
  TrendingUp,
  Timer,
  Activity,
  Zap,
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

// Heart Rate Zone definitions
const HR_ZONES = [
  { name: "1", min: 50, max: 60, color: "#94a3b8", label: "RECOVERY" },
  { name: "2", min: 60, max: 70, color: "#00ff87", label: "EASY" },
  { name: "3", min: 70, max: 80, color: "#ffcc00", label: "AEROBIC" },
  { name: "4", min: 80, max: 90, color: "#ff9500", label: "THRESHOLD" },
  { name: "5", min: 90, max: 100, color: "#ff3366", label: "MAX" },
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
      <div className="running-wrapper">
        <div className="flex items-center justify-center h-96">
          <div className="running-loader" />
        </div>
        <style>{runningStyles}</style>
      </div>
    );
  }

  const hrZoneInfo = currentHrZone > 0 ? HR_ZONES[currentHrZone - 1] : null;

  return (
    <div className="running-wrapper">
      {/* Hero Section - Pace Display */}
      <div className="running-hero">
        <div className="running-hero-bg" />
        <div className="running-hero-content">
          <div className="running-pace-display">
            <div className="running-pace-label">CURRENT PACE</div>
            <div className="running-pace-value">{formatPace(currentPace)}</div>
            <div className="running-pace-unit">/MI</div>
          </div>

          <div className="running-hero-stats">
            <div className="running-hero-stat">
              <Activity className="w-5 h-5 text-[#00ff87]" />
              <span className="running-hero-stat-value">{currentDistance.toFixed(2)}</span>
              <span className="running-hero-stat-unit">mi</span>
            </div>
            <div className="running-hero-divider" />
            <div className="running-hero-stat">
              <Timer className="w-5 h-5 text-[#ffcc00]" />
              <span className="running-hero-stat-value">{formatDuration(currentTime)}</span>
            </div>
            <div className="running-hero-divider" />
            <div className="running-hero-stat">
              <TrendingUp className="w-5 h-5 text-[#ff3366]" />
              <span className="running-hero-stat-value">{formatPace(avgPace)}</span>
              <span className="running-hero-stat-unit">avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="running-map-section">
        <div className="running-map-container">
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

        {/* Map Controls */}
        <div className="running-map-controls">
          <Select value={colorMode} onValueChange={(val) => setColorMode(val as ColorMode)}>
            <SelectTrigger className="running-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="running-select-content">
              <SelectItem value="pace">Pace</SelectItem>
              {activityData.hasHeartRate && <SelectItem value="hr">Heart Rate</SelectItem>}
              <SelectItem value="elevation">Elevation</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cameraMode} onValueChange={(val) => setCameraMode(val as CameraMode)}>
            <SelectTrigger className="running-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="running-select-content">
              <SelectItem value="follow"><Navigation className="w-3 h-3 inline mr-1" />Follow</SelectItem>
              <SelectItem value="overview"><Eye className="w-3 h-3 inline mr-1" />Overview</SelectItem>
              <SelectItem value="firstPerson"><Video className="w-3 h-3 inline mr-1" />POV</SelectItem>
            </SelectContent>
          </Select>

          <div className="running-toggle">
            <Mountain className="w-4 h-4" />
            <Label className="text-xs">3D</Label>
            <Switch checked={terrain3D} onCheckedChange={setTerrain3D} />
          </div>

          <div className="running-toggle">
            <Label className="text-xs">SAT</Label>
            <Switch checked={mapStyle === "satellite"} onCheckedChange={(c) => setMapStyle(c ? "satellite" : "outdoors")} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="running-stats-section">
        {/* Heart Rate Zone */}
        {activityData.hasHeartRate && currentPoint?.hr && (
          <div className="running-hr-card">
            <div className="running-hr-header">
              <Heart className="w-5 h-5" style={{ color: hrZoneInfo?.color }} />
              <span className="running-hr-bpm">{currentPoint.hr}</span>
              <span className="running-hr-unit">BPM</span>
            </div>
            <div className="running-hr-zones">
              {HR_ZONES.map((zone, idx) => (
                <div
                  key={zone.name}
                  className={`running-hr-zone ${currentHrZone === idx + 1 ? "active" : ""}`}
                  style={{
                    backgroundColor: currentHrZone === idx + 1 ? zone.color : "rgba(255,255,255,0.1)",
                  }}
                >
                  <span className="running-hr-zone-num">{zone.name}</span>
                  {currentHrZone === idx + 1 && (
                    <span className="running-hr-zone-label">{zone.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="running-stats-grid">
          <div className="running-stat-card">
            <Mountain className="w-4 h-4 text-[#00ff87]" />
            <span className="running-stat-value">{Math.round(metersToFeet(activityData.summary.elevationGain))}</span>
            <span className="running-stat-label">ELEV GAIN (ft)</span>
          </div>

          {activityData.hasCadence && currentPoint?.cadence && (
            <div className="running-stat-card">
              <Zap className="w-4 h-4 text-[#ffcc00]" />
              <span className="running-stat-value">{currentPoint.cadence}</span>
              <span className="running-stat-label">CADENCE (spm)</span>
            </div>
          )}

          {activityData.summary.calories && (
            <div className="running-stat-card">
              <Flame className="w-4 h-4 text-[#ff3366]" />
              <span className="running-stat-value">
                {Math.round((currentTime / activityData.summary.duration) * activityData.summary.calories)}
              </span>
              <span className="running-stat-label">CALORIES</span>
            </div>
          )}
        </div>
      </div>

      {/* Pace Chart */}
      <div className="running-chart-section">
        <div className="running-chart-header">
          <TrendingUp className="w-4 h-4 text-[#ff3366]" />
          <span>PACE PROFILE</span>
        </div>
        <ResponsiveContainer width="100%" height={80}>
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
              <linearGradient id="runningPaceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3366" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#ff3366" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} reversed />
            <Area
              type="monotone"
              dataKey="pace"
              stroke="#ff3366"
              fill="url(#runningPaceGrad)"
              strokeWidth={2}
              connectNulls
            />
            <ReferenceLine x={currentTime} stroke="#00ff87" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Playback Controls */}
      <div className="running-playback">
        <div className="running-progress">
          <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="running-slider" />
        </div>
        <div className="running-controls">
          <Button variant="ghost" size="icon" onClick={handleSkipBack} disabled={currentIndex === 0} className="running-btn">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button onClick={handlePlayPause} className="running-play-btn">
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSkipForward} disabled={currentIndex >= activityData.dataPoints.length - 1} className="running-btn">
            <SkipForward className="w-5 h-5" />
          </Button>
          <div className="running-speed-select">
            <Gauge className="w-4 h-4" />
            <Select value={playbackSpeed.toString()} onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}>
              <SelectTrigger className="running-select-mini">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="running-select-content">
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <style>{runningStyles}</style>
    </div>
  );
}

const runningStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');

  .running-wrapper {
    --running-bg: #0a0a0a;
    --running-surface: #141414;
    --running-pink: #ff3366;
    --running-green: #00ff87;
    --running-gold: #ffcc00;
    --running-text: #ffffff;
    --running-muted: #666666;

    background: var(--running-bg);
    border-radius: 16px;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    color: var(--running-text);
  }

  .running-hero {
    position: relative;
    padding: 32px 24px;
    overflow: hidden;
  }

  .running-hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 50%, rgba(255, 51, 102, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 50%, rgba(0, 255, 135, 0.1) 0%, transparent 50%);
  }

  .running-hero-content {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .running-pace-display {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 24px;
  }

  .running-pace-label {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: var(--running-pink);
  }

  .running-pace-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 96px;
    line-height: 1;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--running-pink) 0%, var(--running-gold) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .running-pace-unit {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    color: var(--running-muted);
  }

  .running-hero-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .running-hero-stat {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .running-hero-stat-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    color: var(--running-text);
  }

  .running-hero-stat-unit {
    font-size: 12px;
    color: var(--running-muted);
    text-transform: uppercase;
  }

  .running-hero-divider {
    width: 1px;
    height: 32px;
    background: linear-gradient(to bottom, transparent, var(--running-muted), transparent);
  }

  .running-map-section {
    background: var(--running-surface);
  }

  .running-map-container {
    height: 350px;
    position: relative;
  }

  .running-map-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--running-bg);
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .running-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--running-muted);
  }

  .running-stats-section {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .running-hr-card {
    background: var(--running-surface);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 51, 102, 0.2);
  }

  .running-hr-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .running-hr-bpm {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    line-height: 1;
  }

  .running-hr-unit {
    font-size: 12px;
    color: var(--running-muted);
  }

  .running-hr-zones {
    display: flex;
    gap: 4px;
    height: 40px;
  }

  .running-hr-zone {
    flex: 1;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .running-hr-zone.active {
    transform: scaleY(1.1);
    box-shadow: 0 0 20px currentColor;
  }

  .running-hr-zone-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    color: var(--running-text);
  }

  .running-hr-zone-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--running-bg);
  }

  .running-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
  }

  .running-stat-card {
    background: var(--running-surface);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .running-stat-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    line-height: 1;
  }

  .running-stat-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--running-muted);
  }

  .running-chart-section {
    padding: 16px 20px;
    background: var(--running-surface);
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .running-chart-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--running-muted);
    margin-bottom: 12px;
  }

  .running-playback {
    padding: 16px 20px 24px;
    background: var(--running-bg);
  }

  .running-progress {
    margin-bottom: 16px;
  }

  .running-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .running-btn {
    color: var(--running-muted);
    transition: color 0.2s;
  }

  .running-btn:hover { color: var(--running-text); }
  .running-btn:disabled { opacity: 0.3; }

  .running-play-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--running-pink) 0%, #ff1a53 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 0 30px rgba(255, 51, 102, 0.4);
  }

  .running-play-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 0 50px rgba(255, 51, 102, 0.6);
  }

  .running-speed-select {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--running-muted);
    margin-left: 16px;
  }

  .running-select {
    height: 32px;
    background: var(--running-surface);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--running-text);
    font-size: 12px;
    min-width: 90px;
  }

  .running-select-mini {
    height: 28px;
    width: 60px;
    background: var(--running-surface);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--running-text);
    font-size: 11px;
  }

  .running-select-content {
    background: var(--running-surface);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--running-text);
  }

  .running-slider [data-orientation="horizontal"] {
    height: 6px;
    background: var(--running-surface);
    border-radius: 3px;
  }

  .running-slider [data-orientation="horizontal"] > span {
    background: linear-gradient(90deg, var(--running-pink), var(--running-green));
  }

  .running-slider [role="slider"] {
    width: 18px;
    height: 18px;
    background: var(--running-text);
    border: 3px solid var(--running-pink);
    box-shadow: 0 0 10px rgba(255, 51, 102, 0.5);
  }

  .running-loader {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 51, 102, 0.2);
    border-top-color: var(--running-pink);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .running-pace-value {
      font-size: 64px;
    }

    .running-hero-stats {
      flex-wrap: wrap;
      gap: 12px;
    }

    .running-hero-divider {
      display: none;
    }
  }
`;
