/**
 * Cockpit Player - Aviation HUD Style Activity Display
 *
 * Design philosophy: Aircraft instrument panel aesthetic with circular gauges,
 * digital readouts, and HUD-style overlays
 * Color Palette: Dark gray/black (#1a1a1a) + Amber (#f59e0b) + Cyan accents (#06b6d4)
 *
 * Inspired by: Glass cockpit displays, flight instruments, military HUD
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
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
import { CockpitMap, type CockpitMapRef, type CameraMode, type ColorMode } from "./CockpitMap";

interface CockpitPlayerProps {
  data: SuuntoParseResult;
}

// Circular gauge component for cockpit-style instrumentation
function CircularGauge({
  value,
  max,
  label,
  unit,
  color = "#f59e0b",
  size = 120,
  showTicks = true,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
  size?: number;
  showTicks?: boolean;
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // Start at 7 o'clock position
  const sweepAngle = 270; // Sweep 270 degrees
  const progress = Math.min(value / max, 1);
  const progressLength = (progress * sweepAngle / 360) * circumference;
  const backgroundLength = (sweepAngle / 360) * circumference;

  // Generate tick marks
  const ticks: React.ReactNode[] = [];
  if (showTicks) {
    const numTicks = 9;
    for (let i = 0; i <= numTicks; i++) {
      const angle = startAngle + (sweepAngle * i) / numTicks;
      const radian = (angle * Math.PI) / 180;
      const innerRadius = radius - 8;
      const outerRadius = radius - 2;
      const x1 = size / 2 + innerRadius * Math.cos(radian);
      const y1 = size / 2 + innerRadius * Math.sin(radian);
      const x2 = size / 2 + outerRadius * Math.cos(radian);
      const y2 = size / 2 + outerRadius * Math.sin(radian);
      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#4a4a4a"
          strokeWidth={i % 3 === 0 ? 2 : 1}
        />
      );
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Tick marks */}
        <g className="transform rotate-90" style={{ transformOrigin: 'center' }}>
          {ticks}
        </g>
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={6}
          strokeDasharray={`${backgroundLength} ${circumference}`}
          strokeDashoffset={-((360 - sweepAngle) / 2 / 360) * circumference}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${progressLength} ${circumference}`}
          strokeDashoffset={-((360 - sweepAngle) / 2 / 360) * circumference}
          strokeLinecap="round"
          className="transition-all duration-200"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      {/* Center display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-mono font-bold tabular-nums"
          style={{ color, textShadow: `0 0 10px ${color}40` }}
        >
          {Math.round(value).toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{unit}</span>
        <span className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">{label}</span>
      </div>
    </div>
  );
}

// Altitude tape / vertical gauge for elevation
function AltitudeTape({
  elevation,
  minElevation,
  maxElevation,
}: {
  elevation: number;
  minElevation: number;
  maxElevation: number;
}) {
  const range = maxElevation - minElevation || 1;
  const position = ((elevation - minElevation) / range) * 100;

  return (
    <div className="h-full w-16 relative bg-[#1a1a1a] border border-[#2a2a2a] rounded">
      {/* Scale markings */}
      <div className="absolute inset-x-0 top-2 bottom-2 flex flex-col justify-between px-1">
        <span className="text-[9px] text-gray-600 font-mono">
          {Math.round(metersToFeet(maxElevation)).toLocaleString()}
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          {Math.round(metersToFeet((maxElevation + minElevation) / 2)).toLocaleString()}
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          {Math.round(metersToFeet(minElevation)).toLocaleString()}
        </span>
      </div>
      {/* Current altitude indicator */}
      <div
        className="absolute right-0 w-full h-6 flex items-center justify-end pr-1 transition-all duration-200"
        style={{ bottom: `calc(${position}% - 12px)` }}
      >
        <div className="bg-[#06b6d4] text-black text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm shadow-lg"
          style={{ boxShadow: '0 0 8px #06b6d4' }}>
          {Math.round(metersToFeet(elevation)).toLocaleString()}
        </div>
      </div>
      {/* Gradient line */}
      <div className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-gradient-to-t from-green-600 via-yellow-500 to-cyan-400 opacity-30" />
    </div>
  );
}

// Heading indicator compass rose
function HeadingIndicator({ bearing }: { bearing: number }) {
  return (
    <div className="relative w-16 h-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-transparent" />
      <div
        className="flex items-center justify-center gap-4 text-[10px] font-mono text-amber-500 transition-transform duration-300"
        style={{ transform: `translateX(${-bearing / 2}px)` }}
      >
        {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'].map((dir, i) => (
          <span key={i} className={i === 4 ? 'text-cyan-400' : ''}>{dir}</span>
        ))}
      </div>
      {/* Center marker */}
      <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-cyan-400 -translate-x-1/2" />
    </div>
  );
}

export function CockpitPlayer({ data }: CockpitPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<CockpitMapRef>(null);

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

  // Calculate bearing from movement direction
  const calculateBearing = (): number => {
    if (!activityData || currentIndex < 1) return 0;
    const prev = activityData.dataPoints[currentIndex - 1];
    const curr = activityData.dataPoints[currentIndex];
    const dLon = (curr.lon - prev.lon) * Math.PI / 180;
    const lat1 = prev.lat * Math.PI / 180;
    const lat2 = curr.lat * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Calculate min/max elevation for tape
  const elevations = activityData?.dataPoints
    .map(p => p.elevation)
    .filter((e): e is number => e !== undefined) || [];
  const minElevation = elevations.length ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length ? Math.max(...elevations) : 1000;

  if (!activityData) {
    return (
      <div className="cockpit-player bg-[#1a1a1a] rounded-lg p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const bearing = calculateBearing();

  return (
    <div className="cockpit-player">
      {/* Main Container - Dark cockpit aesthetic */}
      <div className="bg-[#0d0d0d] rounded-lg border border-[#2a2a2a] overflow-hidden shadow-2xl">
        {/* HUD Header Bar */}
        <div className="bg-gradient-to-r from-[#1a1a1a] via-[#0d0d0d] to-[#1a1a1a] px-4 py-2 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                {isPlaying ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
            <HeadingIndicator bearing={bearing} />
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-amber-500 tabular-nums">
              {formatDuration(currentTime)}
            </div>
            <div className="text-[9px] text-gray-600 uppercase">Mission Time</div>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="flex">
          {/* Left Instrument Panel */}
          <div className="w-36 bg-[#0a0a0a] border-r border-[#2a2a2a] p-3 flex flex-col items-center gap-4">
            {/* Speed Gauge */}
            <CircularGauge
              value={currentPoint?.speed ? msToMph(currentPoint.speed) : 0}
              max={15}
              label="Speed"
              unit="MPH"
              color="#f59e0b"
              size={110}
            />
            {/* Heart Rate Gauge (if available) */}
            {activityData.hasHeartRate && currentPoint?.hr !== undefined ? (
              <CircularGauge
                value={currentPoint.hr}
                max={200}
                label="Heart Rate"
                unit="BPM"
                color="#ef4444"
                size={110}
              />
            ) : (
              <div className="w-[110px] h-[110px] rounded-full border border-[#2a2a2a] flex items-center justify-center">
                <span className="text-[10px] text-gray-600 uppercase">No HR Data</span>
              </div>
            )}
          </div>

          {/* Center - Navigation Display (Map) */}
          <div className="flex-1 relative">
            <div className="relative" style={{ height: "340px" }}>
              <CockpitMap
                ref={mapRef}
                dataPoints={activityData.dataPoints}
                currentIndex={currentIndex}
                bounds={activityData.bounds}
                colorMode={colorMode}
                cameraMode={cameraMode}
                hasHeartRate={activityData.hasHeartRate}
              />

              {/* HUD Overlay Elements */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top HUD bar */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 border border-amber-500/30">
                    <div className="text-[10px] text-gray-500 uppercase">Distance</div>
                    <div className="text-lg font-mono text-amber-500 tabular-nums" style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>
                      {currentPoint?.distance
                        ? (currentPoint.distance * 0.000621371).toFixed(2)
                        : "0.00"} MI
                    </div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 border border-cyan-500/30">
                    <div className="text-[10px] text-gray-500 uppercase">Heading</div>
                    <div className="text-lg font-mono text-cyan-400 tabular-nums" style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.5)' }}>
                      {Math.round(bearing).toString().padStart(3, '0')}°
                    </div>
                  </div>
                </div>

                {/* Crosshairs overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-8 h-0.5 bg-amber-500" />
                  <div className="absolute w-0.5 h-8 bg-amber-500" />
                </div>

                {/* Bottom coordinates */}
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 border border-[#2a2a2a]">
                  <div className="text-[9px] font-mono text-cyan-400">
                    {currentPoint?.lat.toFixed(5)}° N, {currentPoint?.lon.toFixed(5)}° W
                  </div>
                </div>
              </div>

              {/* Map controls */}
              <div className="absolute bottom-2 right-2 flex flex-col gap-1 pointer-events-auto">
                <button
                  onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                  className="px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-[10px] font-mono text-amber-500 hover:text-amber-400 border border-amber-500/30 transition-colors uppercase"
                >
                  {cameraMode === "follow" ? "Overview" : "Follow"}
                </button>
                <button
                  onClick={() => {
                    const modes: ColorMode[] = ["speed", "elevation"];
                    if (activityData.hasHeartRate) modes.splice(1, 0, "hr");
                    const idx = modes.indexOf(colorMode);
                    setColorMode(modes[(idx + 1) % modes.length]);
                  }}
                  className="px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-[10px] font-mono text-amber-500 hover:text-amber-400 border border-amber-500/30 transition-colors uppercase"
                >
                  {colorMode === "hr" ? "HR" : colorMode}
                </button>
              </div>
            </div>
          </div>

          {/* Right Instrument Panel - Altitude Tape */}
          <div className="w-20 bg-[#0a0a0a] border-l border-[#2a2a2a] p-2 flex flex-col items-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">Alt</div>
            <AltitudeTape
              elevation={currentPoint?.elevation ?? 0}
              minElevation={minElevation}
              maxElevation={maxElevation}
            />
            <div className="mt-2 text-center">
              <div className="text-xs font-mono text-cyan-400 tabular-nums">
                {Math.round(metersToFeet(currentPoint?.elevation ?? 0)).toLocaleString()}
              </div>
              <div className="text-[8px] text-gray-600">FT MSL</div>
            </div>
          </div>
        </div>

        {/* Bottom Instrument Panel */}
        <div className="bg-[#0a0a0a] border-t border-[#2a2a2a] px-4 py-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono text-gray-500 tabular-nums w-14">{formatDuration(currentTime)}</span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cockpit-slider"
              />
            </div>
            <span className="text-xs font-mono text-gray-500 tabular-nums w-14 text-right">{formatDuration(activityData.summary.duration)}</span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[9px] text-gray-600 uppercase">Avg Speed</div>
                <div className="text-sm font-mono text-amber-500">{msToMph(activityData.summary.avgSpeed).toFixed(1)} mph</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-gray-600 uppercase">Elev Gain</div>
                <div className="text-sm font-mono text-cyan-400">{Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()} ft</div>
              </div>
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSkipBack}
                disabled={currentIndex === 0}
                className="p-2 text-gray-500 hover:text-amber-500 disabled:opacity-30 transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black flex items-center justify-center transition-all shadow-lg"
                style={{ boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>

              <button
                onClick={handleSkipForward}
                disabled={currentIndex >= activityData.dataPoints.length - 1}
                className="p-2 text-gray-500 hover:text-amber-500 disabled:opacity-30 transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              {/* Speed selector */}
              <div className="relative ml-2">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-amber-500 hover:text-amber-400 border border-amber-500/30 rounded transition-colors"
                >
                  {playbackSpeed}x
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1a] rounded border border-[#2a2a2a] py-1 min-w-[60px] shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-150">
                    {[0.5, 1, 2, 4].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                        }}
                        className={`w-full px-3 py-1 text-xs font-mono text-left hover:bg-[#2a2a2a] transition-colors ${
                          playbackSpeed === speed ? "text-amber-500" : "text-gray-400"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[9px] text-gray-600 uppercase">Total Dist</div>
                <div className="text-sm font-mono text-amber-500">{(activityData.summary.distance * 0.000621371).toFixed(2)} mi</div>
              </div>
              {activityData.summary.avgHr && (
                <div className="text-center">
                  <div className="text-[9px] text-gray-600 uppercase">Avg HR</div>
                  <div className="text-sm font-mono text-red-500">{activityData.summary.avgHr} bpm</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .cockpit-slider [data-slot="track"] {
          height: 4px;
          background: #2a2a2a;
          border-radius: 2px;
        }
        .cockpit-slider [data-slot="range"] {
          background: linear-gradient(90deg, #f59e0b, #06b6d4);
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
        }
        .cockpit-slider [data-slot="thumb"] {
          width: 14px;
          height: 14px;
          background: #f59e0b;
          border: 2px solid #0d0d0d;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
          transition: transform 0.15s ease;
        }
        .cockpit-slider [data-slot="thumb"]:hover {
          transform: scale(1.15);
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.8);
        }
        .cockpit-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.6);
        }
      `}</style>
    </div>
  );
}
