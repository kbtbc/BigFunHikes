/**
 * Neon Player - Cyberpunk Gaming HUD Activity Player
 *
 * A synthwave/cyberpunk aesthetic inspired by 80s retro-futurism and modern gaming.
 * Color Palette: Deep purple/black (#0a0014) + Neon pink (#FF00FF) + Cyan (#00FFFF) + Electric blue (#0066FF)
 *
 * Features:
 * - Heavy neon glow effects on all accent elements
 * - Gaming HUD style stat displays
 * - XP/Level progress bar aesthetic
 * - Animated gradients and pulse effects
 * - Perspective grid background
 * - Achievement unlocked style milestones
 * - Holographic shimmer effects
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
  Zap,
  Heart,
  TrendingUp,
  Timer,
  Target,
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
import { NeonMap, type NeonMapRef, type CameraMode } from "./NeonMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface NeonPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

// Milestone thresholds for "achievements"
const MILESTONES = [
  { distance: 1, label: "FIRST MILE", xp: 100 },
  { distance: 2, label: "GETTING WARMED UP", xp: 200 },
  { distance: 3, label: "IN THE ZONE", xp: 350 },
  { distance: 5, label: "HALFWAY HERO", xp: 500 },
  { distance: 7, label: "DISTANCE DEMON", xp: 750 },
  { distance: 10, label: "LEGENDARY", xp: 1000 },
];

export function NeonPlayer({ data }: NeonPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [unlockedMilestones, setUnlockedMilestones] = useState<Set<number>>(new Set());

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<NeonMapRef>(null);

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

  // Check for milestone achievements
  useEffect(() => {
    if (!activityData) return;
    const currentPoint = activityData.dataPoints[currentIndex];
    if (!currentPoint?.distance) return;

    const distanceMiles = currentPoint.distance * 0.000621371;

    for (const milestone of MILESTONES) {
      if (distanceMiles >= milestone.distance && !unlockedMilestones.has(milestone.distance)) {
        setUnlockedMilestones((prev) => new Set([...prev, milestone.distance]));
        setShowAchievement(milestone.label);

        // Hide achievement after 3 seconds
        setTimeout(() => {
          setShowAchievement(null);
        }, 3000);
        break;
      }
    }
  }, [currentIndex, activityData, unlockedMilestones]);

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
      setUnlockedMilestones(new Set());
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

  // Calculate XP based on distance
  const currentDistanceMiles = currentPoint?.distance
    ? currentPoint.distance * 0.000621371
    : 0;
  const currentXP = Math.floor(currentDistanceMiles * 100);

  // Temperature from data
  const temperature = data.temperature?.avgCelsius;
  const tempFahrenheit = temperature !== undefined
    ? Math.round(temperature * 9/5 + 32)
    : undefined;

  if (!activityData) {
    return (
      <div className="neon-player-loading">
        <div className="neon-loading-container">
          <div className="neon-loading-ring" />
          <div className="neon-loading-ring neon-loading-ring-2" />
          <div className="neon-loading-ring neon-loading-ring-3" />
          <span className="neon-loading-text">INITIALIZING</span>
        </div>
        <style>{`
          .neon-player-loading {
            background: linear-gradient(135deg, #0a0014 0%, #1a0033 50%, #0a0014 100%);
            padding: 4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 300px;
          }
          .neon-loading-container {
            position: relative;
            width: 100px;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .neon-loading-ring {
            position: absolute;
            width: 80px;
            height: 80px;
            border: 3px solid transparent;
            border-top-color: #FF00FF;
            border-radius: 50%;
            animation: neon-spin 1s linear infinite;
            box-shadow: 0 0 20px #FF00FF;
          }
          .neon-loading-ring-2 {
            width: 60px;
            height: 60px;
            border-top-color: #00FFFF;
            animation-direction: reverse;
            animation-duration: 0.8s;
            box-shadow: 0 0 20px #00FFFF;
          }
          .neon-loading-ring-3 {
            width: 40px;
            height: 40px;
            border-top-color: #0066FF;
            animation-duration: 0.6s;
            box-shadow: 0 0 20px #0066FF;
          }
          .neon-loading-text {
            position: absolute;
            bottom: -30px;
            color: #00FFFF;
            font-family: 'Orbitron', 'Share Tech Mono', monospace;
            font-size: 12px;
            letter-spacing: 4px;
            text-shadow: 0 0 10px #00FFFF;
            animation: text-flicker 1.5s infinite;
          }
          @keyframes neon-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes text-flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="neon-player">
      {/* Achievement Notification */}
      {showAchievement && (
        <div className="neon-achievement">
          <div className="neon-achievement-inner">
            <div className="neon-achievement-icon">
              <Target className="w-8 h-8" />
            </div>
            <div className="neon-achievement-content">
              <span className="neon-achievement-label">ACHIEVEMENT UNLOCKED</span>
              <span className="neon-achievement-title">{showAchievement}</span>
            </div>
          </div>
        </div>
      )}

      {/* XP/Level Bar */}
      <div className="neon-xp-bar">
        <div className="neon-xp-info">
          <Zap className="w-4 h-4 text-[#FF00FF]" />
          <span className="neon-xp-label">XP</span>
          <span className="neon-xp-value">{currentXP}</span>
        </div>
        <div className="neon-xp-track">
          <div
            className="neon-xp-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="neon-xp-progress">{progress.toFixed(1)}%</div>
      </div>

      {/* Map */}
      <Card className="neon-card overflow-hidden">
        <div className="relative" style={{ height: "450px" }}>
          <NeonMap
            ref={mapRef}
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            bounds={activityData.bounds}
            colorMode={colorMode}
            cameraMode={cameraMode}
            terrain3D={terrain3D}
            hasHeartRate={activityData.hasHeartRate}
            temperature={tempFahrenheit}
            highlightedSegment={highlightedSegment}
          />
        </div>
      </Card>

      {/* Stats HUD */}
      <div className="neon-stats-grid">
        {/* Time */}
        <div className="neon-stat-card">
          <div className="neon-stat-icon">
            <Timer className="w-5 h-5" />
          </div>
          <div className="neon-stat-content">
            <span className="neon-stat-label">TIME</span>
            <span className="neon-stat-value neon-cyan">
              {formatDuration(currentTime)}
            </span>
            <span className="neon-stat-sub">/ {formatDuration(activityData.summary.duration)}</span>
          </div>
        </div>

        {/* Distance */}
        <div className="neon-stat-card">
          <div className="neon-stat-icon neon-pink-glow">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="neon-stat-content">
            <span className="neon-stat-label">DISTANCE</span>
            <span className="neon-stat-value neon-pink">
              {currentDistanceMiles.toFixed(2)}
            </span>
            <span className="neon-stat-sub">MILES</span>
          </div>
        </div>

        {/* Elevation */}
        {currentPoint?.elevation !== undefined && (
          <div className="neon-stat-card">
            <div className="neon-stat-icon neon-blue-glow">
              <Mountain className="w-5 h-5" />
            </div>
            <div className="neon-stat-content">
              <span className="neon-stat-label">ELEVATION</span>
              <span className="neon-stat-value neon-blue">
                {Math.round(metersToFeet(currentPoint.elevation))}
              </span>
              <span className="neon-stat-sub">FEET</span>
            </div>
          </div>
        )}

        {/* Speed */}
        {currentPoint?.speed !== undefined && (
          <div className="neon-stat-card">
            <div className="neon-stat-icon neon-cyan-glow">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="neon-stat-content">
              <span className="neon-stat-label">SPEED</span>
              <span className="neon-stat-value neon-cyan">
                {msToMph(currentPoint.speed).toFixed(1)}
              </span>
              <span className="neon-stat-sub">MPH</span>
            </div>
          </div>
        )}

        {/* Heart Rate */}
        {currentPoint?.hr !== undefined && (
          <div className="neon-stat-card neon-hr-card">
            <div className="neon-stat-icon neon-red-glow">
              <Heart className="w-5 h-5 neon-heartbeat" />
            </div>
            <div className="neon-stat-content">
              <span className="neon-stat-label">HEART RATE</span>
              <span className="neon-stat-value neon-red">
                {currentPoint.hr}
              </span>
              <span className="neon-stat-sub">BPM</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Card */}
      <Card className="neon-card neon-controls-card p-4 space-y-4">
        {/* Progress Scrubber */}
        <div className="px-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="neon-slider"
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
              className="neon-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="neon-play-btn"
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
              className="neon-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Color Mode */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#FF00FF]" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="neon-select w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neon-select-content">
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
              <Video className="h-4 w-4 text-[#00FFFF]" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="neon-select w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neon-select-content">
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
              <Mountain className="h-4 w-4 text-[#0066FF]" />
              <Label htmlFor="neon-terrain-toggle" className="neon-label text-sm">3D</Label>
              <Switch
                id="neon-terrain-toggle"
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
                className="neon-switch"
              />
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#FF00FF]" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="neon-select w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neon-select-content">
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

      {/* Charts with neon styling */}
      <Card className="neon-card neon-charts-card p-4">
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

      {/* Neon Player Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

        .neon-player {
          font-family: 'Share Tech Mono', monospace;
          background: linear-gradient(135deg, #0a0014 0%, #1a0033 50%, #0a0014 100%);
          padding: 1rem;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        /* Grid background */
        .neon-player::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255, 0, 255, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(255, 0, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .neon-player > * {
          position: relative;
          z-index: 1;
        }

        /* XP Bar */
        .neon-xp-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
          padding: 8px 12px;
          background: rgba(10, 0, 20, 0.8);
          border: 1px solid rgba(255, 0, 255, 0.3);
          border-radius: 8px;
        }

        .neon-xp-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .neon-xp-label {
          color: rgba(255, 0, 255, 0.7);
          font-size: 12px;
          letter-spacing: 2px;
        }

        .neon-xp-value {
          color: #FF00FF;
          font-family: 'Orbitron', monospace;
          font-weight: 600;
          font-size: 16px;
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
          min-width: 60px;
        }

        .neon-xp-track {
          flex: 1;
          height: 8px;
          background: rgba(255, 0, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255, 0, 255, 0.3);
        }

        .neon-xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF00FF 0%, #00FFFF 50%, #FF00FF 100%);
          background-size: 200% 100%;
          animation: xp-shimmer 2s linear infinite;
          box-shadow: 0 0 10px #FF00FF;
          transition: width 0.3s ease;
        }

        @keyframes xp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .neon-xp-progress {
          color: #00FFFF;
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
          min-width: 50px;
          text-align: right;
        }

        /* Achievement notification */
        .neon-achievement {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          animation: achievement-slide-in 0.5s ease-out, achievement-slide-out 0.5s ease-in 2.5s forwards;
        }

        @keyframes achievement-slide-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes achievement-slide-out {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-100px);
          }
        }

        .neon-achievement-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: linear-gradient(135deg, rgba(10, 0, 20, 0.95) 0%, rgba(50, 0, 80, 0.95) 100%);
          border: 2px solid #FF00FF;
          border-radius: 12px;
          box-shadow:
            0 0 20px rgba(255, 0, 255, 0.5),
            0 0 40px rgba(255, 0, 255, 0.3),
            inset 0 0 30px rgba(255, 0, 255, 0.1);
        }

        .neon-achievement-icon {
          color: #00FFFF;
          animation: icon-pulse 1s ease-in-out infinite;
        }

        @keyframes icon-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 5px #00FFFF);
          }
          50% {
            filter: drop-shadow(0 0 15px #00FFFF) drop-shadow(0 0 25px #00FFFF);
          }
        }

        .neon-achievement-content {
          display: flex;
          flex-direction: column;
        }

        .neon-achievement-label {
          font-size: 10px;
          color: #FF00FF;
          letter-spacing: 3px;
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
        }

        .neon-achievement-title {
          font-family: 'Orbitron', monospace;
          font-size: 18px;
          font-weight: 700;
          color: #00FFFF;
          text-shadow: 0 0 10px #00FFFF, 0 0 20px #00FFFF;
        }

        /* Cards */
        .neon-card {
          background: linear-gradient(135deg, rgba(10, 0, 20, 0.9) 0%, rgba(30, 0, 50, 0.9) 100%);
          border: 1px solid rgba(255, 0, 255, 0.3);
          box-shadow:
            0 0 20px rgba(255, 0, 255, 0.1),
            inset 0 0 30px rgba(0, 255, 255, 0.05);
          margin-bottom: 1rem;
        }

        /* Stats Grid */
        .neon-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 1rem;
        }

        .neon-stat-card {
          background: rgba(10, 0, 20, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          transition: all 0.3s ease;
        }

        .neon-stat-card:hover {
          border-color: rgba(0, 255, 255, 0.6);
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
        }

        .neon-stat-icon {
          color: #00FFFF;
          padding: 6px;
          background: rgba(0, 255, 255, 0.1);
          border-radius: 6px;
        }

        .neon-pink-glow { color: #FF00FF; background: rgba(255, 0, 255, 0.1); }
        .neon-blue-glow { color: #0066FF; background: rgba(0, 102, 255, 0.1); }
        .neon-cyan-glow { color: #00FFFF; background: rgba(0, 255, 255, 0.1); }
        .neon-red-glow { color: #FF0066; background: rgba(255, 0, 102, 0.1); }

        .neon-stat-content {
          display: flex;
          flex-direction: column;
        }

        .neon-stat-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 2px;
        }

        .neon-stat-value {
          font-family: 'Orbitron', monospace;
          font-size: 20px;
          font-weight: 600;
          line-height: 1.2;
        }

        .neon-cyan { color: #00FFFF; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); }
        .neon-pink { color: #FF00FF; text-shadow: 0 0 10px rgba(255, 0, 255, 0.8); }
        .neon-blue { color: #0066FF; text-shadow: 0 0 10px rgba(0, 102, 255, 0.8); }
        .neon-red { color: #FF0066; text-shadow: 0 0 10px rgba(255, 0, 102, 0.8); }

        .neon-stat-sub {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 1px;
        }

        .neon-hr-card {
          border-color: rgba(255, 0, 102, 0.3);
        }

        .neon-heartbeat {
          animation: heartbeat 1s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1); }
          75% { transform: scale(1.15); }
        }

        /* Controls Card */
        .neon-controls-card {
          border-color: rgba(0, 255, 255, 0.3);
        }

        /* Slider */
        .neon-slider [data-radix-slider-track] {
          background: rgba(255, 0, 255, 0.2);
          height: 6px;
          border-radius: 3px;
        }

        .neon-slider [data-radix-slider-range] {
          background: linear-gradient(90deg, #FF00FF 0%, #00FFFF 100%);
          box-shadow: 0 0 10px #FF00FF;
        }

        .neon-slider [data-radix-slider-thumb] {
          width: 16px;
          height: 16px;
          background: #00FFFF;
          border: 2px solid #FF00FF;
          box-shadow: 0 0 10px #00FFFF, 0 0 20px #FF00FF;
          transition: all 0.2s ease;
        }

        .neon-slider [data-radix-slider-thumb]:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px #00FFFF, 0 0 30px #FF00FF;
        }

        /* Control Buttons */
        .neon-control-btn {
          color: #00FFFF;
          border: 1px solid rgba(0, 255, 255, 0.3);
          background: transparent;
          transition: all 0.2s ease;
        }

        .neon-control-btn:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: #00FFFF;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .neon-control-btn:disabled {
          color: rgba(0, 255, 255, 0.3);
          border-color: rgba(0, 255, 255, 0.1);
        }

        /* Play Button */
        .neon-play-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FF00FF 0%, #CC00CC 100%);
          color: white;
          border: 2px solid #00FFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow:
            0 0 20px rgba(255, 0, 255, 0.5),
            0 0 40px rgba(255, 0, 255, 0.3),
            inset 0 0 20px rgba(255, 255, 255, 0.1);
        }

        .neon-play-btn:hover {
          transform: scale(1.1);
          box-shadow:
            0 0 30px rgba(255, 0, 255, 0.8),
            0 0 60px rgba(255, 0, 255, 0.5),
            inset 0 0 20px rgba(255, 255, 255, 0.2);
        }

        /* Select Dropdowns */
        .neon-select {
          background: rgba(10, 0, 20, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          color: #00FFFF;
          font-family: 'Share Tech Mono', monospace;
        }

        .neon-select:hover {
          border-color: rgba(0, 255, 255, 0.6);
        }

        .neon-select-content {
          background: rgba(10, 0, 20, 0.95);
          border: 1px solid rgba(0, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .neon-select-content [data-radix-select-item] {
          color: #00FFFF;
          font-family: 'Share Tech Mono', monospace;
        }

        .neon-select-content [data-radix-select-item]:focus {
          background: rgba(0, 255, 255, 0.1);
          color: #FF00FF;
        }

        /* Switch */
        .neon-switch[data-state="checked"] {
          background: linear-gradient(90deg, #FF00FF, #00FFFF);
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        }

        .neon-switch[data-state="unchecked"] {
          background: rgba(0, 255, 255, 0.2);
        }

        .neon-label {
          color: #00FFFF;
        }

        /* Charts Card */
        .neon-charts-card {
          border-color: rgba(255, 0, 255, 0.3);
        }

        .neon-charts-card h4 {
          color: #FF00FF !important;
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        }

        /* Override chart colors for neon theme */
        .neon-charts-card .bg-muted\\/30 {
          background: rgba(255, 0, 255, 0.05) !important;
          border: 1px solid rgba(255, 0, 255, 0.2);
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
