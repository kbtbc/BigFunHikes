/**
 * Blueprint Player - Technical Drawing / Architectural Blueprint Style
 *
 * Design philosophy: Technical drafting aesthetic with measurement annotations
 * Color Palette: Navy blue (#1e3a5f) base + Cyan (#22d3ee) lines + White text
 *
 * Inspired by: Architectural blueprints, engineering drawings, CAD software
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
import { BlueprintMap, type BlueprintMapRef, type CameraMode, type ColorMode } from "./BlueprintMap";

interface BlueprintPlayerProps {
  data: SuuntoParseResult;
}

export function BlueprintPlayer({ data }: BlueprintPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<BlueprintMapRef>(null);

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

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Format pace (min:sec per mile)
  const formatPace = (speedMs: number): string => {
    if (speedMs <= 0) return "--:--";
    const mph = msToMph(speedMs);
    if (mph <= 0) return "--:--";
    const minPerMile = 60 / mph;
    const mins = Math.floor(minPerMile);
    const secs = Math.round((minPerMile - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activityData) {
    return (
      <div className="blueprint-player bg-[#1e3a5f] rounded-lg p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="blueprint-player">
      {/* Main Container - Dark navy blue with grid pattern */}
      <div
        className="rounded-lg overflow-hidden border border-cyan-500/30"
        style={{
          background: `
            linear-gradient(rgba(30, 58, 95, 0.97), rgba(30, 58, 95, 0.97)),
            repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(34, 211, 238, 0.1) 19px, rgba(34, 211, 238, 0.1) 20px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(34, 211, 238, 0.1) 19px, rgba(34, 211, 238, 0.1) 20px)
          `,
        }}
      >
        {/* Title Block - Like a technical drawing title block */}
        <div className="border-b border-cyan-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-cyan-400 text-xs tracking-[0.3em] uppercase font-mono">Activity Blueprint</div>
            <div className="text-cyan-400/50 text-xs font-mono">REV. 01</div>
          </div>
          <div className="text-cyan-400/50 text-xs font-mono">
            SCALE: 1:{Math.round(activityData.summary.distance / 1000)}K
          </div>
        </div>

        {/* Technical Specs Grid - Stats displayed like specifications */}
        <div className="px-6 py-5 border-b border-cyan-500/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Distance with dimension line */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-cyan-400/50" />
                <div className="w-1 h-2 border-l border-cyan-400/50" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-light text-white tracking-tight">
                  {currentPoint?.distance
                    ? (currentPoint.distance * 0.000621371).toFixed(2)
                    : "0.00"}
                </span>
                <span className="text-cyan-400 text-sm font-mono">mi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-2 border-l border-cyan-400/50" />
                <div className="flex-1 h-px bg-cyan-400/50" />
              </div>
              <p className="text-[10px] tracking-[0.2em] text-cyan-400/70 uppercase font-mono mt-1">Distance</p>
            </div>

            {/* Time */}
            <div className="space-y-1">
              <p className="text-[10px] tracking-[0.2em] text-cyan-400/70 uppercase font-mono">Elapsed Time</p>
              <p className="text-3xl font-mono font-light text-white tracking-tight tabular-nums">
                {formatDuration(currentTime)}
              </p>
              <div className="h-px bg-cyan-400/30 w-16" />
            </div>

            {/* Elevation - Side view profile indicator */}
            {currentPoint?.elevation !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] text-cyan-400/70 uppercase font-mono">Elevation</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-mono font-light text-white tracking-tight">
                    {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}
                  </span>
                  <span className="text-cyan-400 text-sm font-mono mb-1">ft</span>
                </div>
                {/* Mini elevation indicator */}
                <div className="flex items-end gap-0.5 h-3">
                  {[0.3, 0.5, 0.7, 0.9, 1, 0.8, 0.6, 0.4].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400/40"
                      style={{ height: `${h * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Speed / Pace */}
            {currentPoint?.speed !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] text-cyan-400/70 uppercase font-mono">Pace</p>
                <p className="text-3xl font-mono font-light text-white tracking-tight tabular-nums">
                  {formatPace(currentPoint.speed)}
                  <span className="text-cyan-400 text-sm font-mono ml-1">/mi</span>
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 border border-cyan-400/50 rotate-45" />
                  <div className="h-px bg-cyan-400/30 flex-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Section - Technical drawing viewport */}
        <div className="p-4">
          <div className="relative rounded border border-cyan-500/30 overflow-hidden" style={{ height: "300px" }}>
            {/* Corner brackets decoration */}
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400/50 z-10" />
            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400/50 z-10" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400/50 z-10" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400/50 z-10" />

            <BlueprintMap
              ref={mapRef}
              dataPoints={activityData.dataPoints}
              currentIndex={currentIndex}
              bounds={activityData.bounds}
              colorMode={colorMode}
              cameraMode={cameraMode}
              hasHeartRate={activityData.hasHeartRate}
            />

            {/* Map overlay controls - technical style */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
              <button
                onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                className="px-3 py-1.5 bg-[#1e3a5f]/90 backdrop-blur-sm border border-cyan-400/50 text-xs font-mono text-cyan-400 hover:bg-cyan-400/20 transition-colors"
              >
                {cameraMode === "follow" ? "OVERVIEW" : "FOLLOW"}
              </button>
              <button
                onClick={() => {
                  const modes: ColorMode[] = ["speed", "elevation"];
                  if (activityData.hasHeartRate) modes.splice(1, 0, "hr");
                  const idx = modes.indexOf(colorMode);
                  setColorMode(modes[(idx + 1) % modes.length]);
                }}
                className="px-3 py-1.5 bg-[#1e3a5f]/90 backdrop-blur-sm border border-cyan-400/50 text-xs font-mono text-cyan-400 hover:bg-cyan-400/20 transition-colors uppercase"
              >
                {colorMode === "hr" ? "HR" : colorMode}
              </button>
            </div>

            {/* Coordinate display */}
            {currentPoint && (
              <div className="absolute top-3 left-3 bg-[#1e3a5f]/90 backdrop-blur-sm border border-cyan-400/30 px-2 py-1 z-10">
                <div className="text-[10px] font-mono text-cyan-400/70">
                  LAT: {currentPoint.lat.toFixed(5)}
                </div>
                <div className="text-[10px] font-mono text-cyan-400/70">
                  LON: {currentPoint.lon.toFixed(5)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar - Technical measurement ruler style */}
        <div className="px-6 pb-4">
          {/* Ruler tick marks */}
          <div className="flex justify-between mb-1 px-1">
            {[0, 25, 50, 75, 100].map((tick) => (
              <div key={tick} className="flex flex-col items-center">
                <div className="w-px h-2 bg-cyan-400/50" />
                <span className="text-[8px] font-mono text-cyan-400/50 mt-0.5">{tick}%</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-cyan-400/70 tabular-nums w-14 font-mono">{formatDuration(currentTime)}</span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="blueprint-slider"
              />
            </div>
            <span className="text-xs text-cyan-400/70 tabular-nums w-14 text-right font-mono">{formatDuration(activityData.summary.duration)}</span>
          </div>
        </div>

        {/* Controls - Technical button style */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-4">
            {/* Skip back */}
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="p-2 text-cyan-400/70 hover:text-cyan-400 disabled:opacity-30 transition-colors border border-cyan-400/30 hover:border-cyan-400/50 disabled:hover:border-cyan-400/30"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Play/Pause - Primary action */}
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center transition-colors hover:bg-cyan-400/20"
              style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)' }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
              className="p-2 text-cyan-400/70 hover:text-cyan-400 disabled:opacity-30 transition-colors border border-cyan-400/30 hover:border-cyan-400/50 disabled:hover:border-cyan-400/30"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            {/* Speed selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-mono text-cyan-400/70 hover:text-cyan-400 transition-colors border border-cyan-400/30 hover:border-cyan-400/50"
              >
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e3a5f] border border-cyan-400/50 py-1 min-w-[60px] z-20">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-sm font-mono text-left hover:bg-cyan-400/20 transition-colors ${
                        playbackSpeed === speed ? "text-cyan-400" : "text-cyan-400/70"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Stats Bar - Technical specification row */}
        {(currentPoint?.hr !== undefined || currentPoint?.speed !== undefined) && (
          <>
            <div className="h-px bg-cyan-400/20" />
            <div className="px-6 py-3 flex items-center justify-center gap-8 text-sm font-mono">
              {currentPoint?.speed !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400/50 text-xs">SPD:</span>
                  <span className="text-cyan-400">{msToMph(currentPoint.speed).toFixed(1)}</span>
                  <span className="text-cyan-400/50 text-xs">MPH</span>
                </div>
              )}
              {currentPoint?.hr !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400/50 text-xs">HR:</span>
                  <span className="text-cyan-400">{currentPoint.hr}</span>
                  <span className="text-cyan-400/50 text-xs">BPM</span>
                </div>
              )}
              {activityData.summary.elevationGain > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400/50 text-xs">GAIN:</span>
                  <span className="text-cyan-400">{Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()}</span>
                  <span className="text-cyan-400/50 text-xs">FT</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer - Drawing number block */}
        <div className="border-t border-cyan-400/20 px-6 py-2 flex items-center justify-between">
          <div className="text-[10px] font-mono text-cyan-400/40">
            DWG NO: {activityData.summary.startTime.slice(0, 10).replace(/-/g, '')}
          </div>
          <div className="text-[10px] font-mono text-cyan-400/40">
            SHEET 1 OF 1
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .blueprint-slider [data-slot="track"] {
          height: 4px;
          background: rgba(34, 211, 238, 0.2);
          border: 1px solid rgba(34, 211, 238, 0.3);
        }
        .blueprint-slider [data-slot="range"] {
          background: rgba(34, 211, 238, 0.8);
        }
        .blueprint-slider [data-slot="thumb"] {
          width: 12px;
          height: 12px;
          background: #1e3a5f;
          border: 2px solid #22d3ee;
          border-radius: 0;
          transition: transform 0.15s ease;
        }
        .blueprint-slider [data-slot="thumb"]:hover {
          transform: scale(1.15) rotate(45deg);
        }
        .blueprint-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
}
