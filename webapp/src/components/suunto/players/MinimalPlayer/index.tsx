/**
 * Minimal Player - Typography-focused Scandinavian Design
 *
 * Design philosophy: Clean whites, elegant typography, generous whitespace
 * Color Palette: Pure white (#ffffff) + Light gray (#f5f5f5) + Black text (#1a1a1a) + Soft blue accent (#4a90d9)
 *
 * Inspired by: IKEA, Muji, Apple - calm, sophisticated, design-forward
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
import { MinimalMap, type MinimalMapRef, type CameraMode, type ColorMode } from "./MinimalMap";

interface MinimalPlayerProps {
  data: SuuntoParseResult;
}

export function MinimalPlayer({ data }: MinimalPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<MinimalMapRef>(null);

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
      <div className="minimal-player bg-white rounded-2xl p-12">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#4a90d9] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="minimal-player">
      {/* Main Container - White background, generous padding */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Stats - Big beautiful numbers */}
        <div className="px-8 pt-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Distance - Hero stat */}
            <div className="space-y-1">
              <p className="text-xs tracking-widest text-gray-400 uppercase font-medium">Distance</p>
              <p className="text-4xl font-extralight text-[#1a1a1a] tracking-tight">
                {currentPoint?.distance
                  ? (currentPoint.distance * 0.000621371).toFixed(2)
                  : "0.00"}
                <span className="text-lg text-gray-400 ml-1 font-normal">mi</span>
              </p>
            </div>

            {/* Time */}
            <div className="space-y-1">
              <p className="text-xs tracking-widest text-gray-400 uppercase font-medium">Time</p>
              <p className="text-4xl font-extralight text-[#1a1a1a] tracking-tight tabular-nums">
                {formatDuration(currentTime)}
              </p>
            </div>

            {/* Elevation */}
            {currentPoint?.elevation !== undefined && (
              <div className="space-y-1">
                <p className="text-xs tracking-widest text-gray-400 uppercase font-medium">Elevation</p>
                <p className="text-4xl font-extralight text-[#1a1a1a] tracking-tight">
                  {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}
                  <span className="text-lg text-gray-400 ml-1 font-normal">ft</span>
                </p>
              </div>
            )}

            {/* Pace */}
            {currentPoint?.speed !== undefined && (
              <div className="space-y-1">
                <p className="text-xs tracking-widest text-gray-400 uppercase font-medium">Pace</p>
                <p className="text-4xl font-extralight text-[#1a1a1a] tracking-tight tabular-nums">
                  {formatPace(currentPoint.speed)}
                  <span className="text-lg text-gray-400 ml-1 font-normal">/mi</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-8" />

        {/* Map Section - Compact, secondary to stats */}
        <div className="p-6">
          <div className="relative rounded-xl overflow-hidden bg-[#f5f5f5]" style={{ height: "280px" }}>
            <MinimalMap
              ref={mapRef}
              dataPoints={activityData.dataPoints}
              currentIndex={currentIndex}
              bounds={activityData.bounds}
              colorMode={colorMode}
              cameraMode={cameraMode}
              hasHeartRate={activityData.hasHeartRate}
            />

            {/* Map overlay controls - minimal */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-600 hover:bg-white transition-colors shadow-sm"
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
                className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-600 hover:bg-white transition-colors shadow-sm capitalize"
              >
                {colorMode === "hr" ? "Heart Rate" : colorMode}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar - Clean, subtle */}
        <div className="px-8 pb-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 tabular-nums w-12">{formatDuration(currentTime)}</span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="minimal-slider"
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums w-12 text-right">{formatDuration(activityData.summary.duration)}</span>
          </div>
        </div>

        {/* Controls - Minimal, elegant */}
        <div className="px-8 pb-8">
          <div className="flex items-center justify-center gap-6">
            {/* Skip back */}
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="p-2 text-gray-400 hover:text-[#1a1a1a] disabled:opacity-30 transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {/* Play/Pause - Primary action */}
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-[#4a90d9] hover:bg-[#3a7dc5] text-white flex items-center justify-center transition-colors shadow-sm"
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
              className="p-2 text-gray-400 hover:text-[#1a1a1a] disabled:opacity-30 transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Speed selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-[#1a1a1a] transition-colors"
              >
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[60px] animate-in fade-in slide-in-from-bottom-1 duration-150">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                        playbackSpeed === speed ? "text-[#4a90d9] font-medium" : "text-gray-600"
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

        {/* Secondary Stats Bar */}
        {(currentPoint?.hr !== undefined || currentPoint?.speed !== undefined) && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="px-8 py-4 flex items-center justify-center gap-8 text-sm text-gray-500">
              {currentPoint?.speed !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Speed</span>
                  <span className="font-medium text-[#1a1a1a]">{msToMph(currentPoint.speed).toFixed(1)} mph</span>
                </div>
              )}
              {currentPoint?.hr !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Heart Rate</span>
                  <span className="font-medium text-[#4a90d9]">{currentPoint.hr} bpm</span>
                </div>
              )}
              {activityData.summary.elevationGain > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Gain</span>
                  <span className="font-medium text-[#1a1a1a]">{Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()} ft</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .minimal-slider [data-slot="track"] {
          height: 3px;
          background: #e5e7eb;
          border-radius: 2px;
        }
        .minimal-slider [data-slot="range"] {
          background: #4a90d9;
          border-radius: 2px;
        }
        .minimal-slider [data-slot="thumb"] {
          width: 12px;
          height: 12px;
          background: #4a90d9;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.15s ease;
        }
        .minimal-slider [data-slot="thumb"]:hover {
          transform: scale(1.15);
        }
        .minimal-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.2), 0 1px 3px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
