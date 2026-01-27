/**
 * Field Journal Player - Naturalist's Hiking Journal Aesthetic
 *
 * Design philosophy: Hand-drawn sketchbook feel, aged paper, botanical inspiration
 * Color Palette: Cream paper (#faf6ed) + Forest green (#2d5016) + Brown (#6b4423) + Burgundy (#722f37)
 *
 * Inspired by: Naturalist field guides, vintage trail maps, botanical journals
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Compass,
  Mountain,
  Clock,
  Footprints,
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
import { FieldJournalMap, type FieldJournalMapRef, type CameraMode, type ColorMode } from "./FieldJournalMap";

interface FieldJournalPlayerProps {
  data: SuuntoParseResult;
}

export function FieldJournalPlayer({ data }: FieldJournalPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("elevation");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<FieldJournalMapRef>(null);

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

  // Get current date formatted like a journal entry
  const getJournalDate = (): string => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  if (!activityData) {
    return (
      <div className="field-journal-player bg-[#faf6ed] rounded-lg p-8 border-2 border-[#6b4423]/30">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#2d5016] border-t-transparent" />
          <span className="ml-3 text-[#6b4423] italic" style={{ fontFamily: "'Caveat', cursive" }}>
            Loading field notes...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="field-journal-player">
      {/* Import Caveat font from Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Main Container - Aged paper with sketched border */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: `
            linear-gradient(to right, rgba(107, 68, 35, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(107, 68, 35, 0.05) 1px, transparent 1px),
            #faf6ed
          `,
          backgroundSize: '100% 28px, 100% 28px',
          border: '3px solid #6b4423',
          boxShadow: 'inset 0 0 60px rgba(107, 68, 35, 0.08), 4px 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* Corner decorations - botanical flourishes */}
        <div className="absolute top-2 left-2 w-12 h-12 opacity-20">
          <svg viewBox="0 0 50 50" className="w-full h-full text-[#2d5016]">
            <path d="M5 5 Q 15 5 20 15 Q 15 10 5 10 Z" fill="currentColor" />
            <path d="M5 5 Q 5 15 15 20 Q 10 15 10 5 Z" fill="currentColor" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute top-2 right-2 w-12 h-12 opacity-20 scale-x-[-1]">
          <svg viewBox="0 0 50 50" className="w-full h-full text-[#2d5016]">
            <path d="M5 5 Q 15 5 20 15 Q 15 10 5 10 Z" fill="currentColor" />
            <path d="M5 5 Q 5 15 15 20 Q 10 15 10 5 Z" fill="currentColor" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Journal Header */}
        <div className="px-6 pt-6 pb-4 border-b-2 border-dashed border-[#6b4423]/30">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-3xl text-[#2d5016]"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
              >
                Trail Observations
              </h2>
              <p
                className="text-sm text-[#6b4423]/70 mt-1"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {getJournalDate()}
              </p>
            </div>
            <Compass className="w-8 h-8 text-[#6b4423]/40" />
          </div>
        </div>

        {/* Stats as Journal Entries */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Distance Entry */}
            <div className="p-3 rounded-md bg-[#faf6ed]/50" style={{ border: '1px dashed #6b4423' }}>
              <div className="flex items-center gap-2 mb-1">
                <Footprints className="w-4 h-4 text-[#2d5016]" />
                <span
                  className="text-xs uppercase tracking-wider text-[#6b4423]"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
                >
                  Distance Traveled
                </span>
              </div>
              <p
                className="text-3xl text-[#2d5016]"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
              >
                {currentPoint?.distance
                  ? (currentPoint.distance * 0.000621371).toFixed(2)
                  : "0.00"}
                <span className="text-lg text-[#6b4423]/70"> miles</span>
              </p>
            </div>

            {/* Time Entry */}
            <div className="p-3 rounded-md bg-[#faf6ed]/50" style={{ border: '1px dashed #6b4423' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#2d5016]" />
                <span
                  className="text-xs uppercase tracking-wider text-[#6b4423]"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
                >
                  Time Elapsed
                </span>
              </div>
              <p
                className="text-3xl text-[#2d5016] tabular-nums"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
              >
                {formatDuration(currentTime)}
              </p>
            </div>

            {/* Elevation Entry */}
            {currentPoint?.elevation !== undefined && (
              <div className="p-3 rounded-md bg-[#faf6ed]/50" style={{ border: '1px dashed #6b4423' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Mountain className="w-4 h-4 text-[#2d5016]" />
                  <span
                    className="text-xs uppercase tracking-wider text-[#6b4423]"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
                  >
                    Current Altitude
                  </span>
                </div>
                <p
                  className="text-3xl text-[#2d5016]"
                  style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
                >
                  {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}
                  <span className="text-lg text-[#6b4423]/70"> ft</span>
                </p>
              </div>
            )}

            {/* Pace Entry */}
            {currentPoint?.speed !== undefined && (
              <div className="p-3 rounded-md bg-[#faf6ed]/50" style={{ border: '1px dashed #6b4423' }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-[#2d5016]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span
                    className="text-xs uppercase tracking-wider text-[#6b4423]"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
                  >
                    Current Pace
                  </span>
                </div>
                <p
                  className="text-3xl text-[#2d5016] tabular-nums"
                  style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
                >
                  {formatPace(currentPoint.speed)}
                  <span className="text-lg text-[#6b4423]/70"> /mi</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map Section - Styled like a hand-drawn trail map */}
        <div className="px-6 pb-4">
          <div
            className="relative rounded-md overflow-hidden"
            style={{
              height: "300px",
              border: '2px solid #6b4423',
              boxShadow: 'inset 0 0 20px rgba(107, 68, 35, 0.1)'
            }}
          >
            {/* Map title label */}
            <div
              className="absolute top-2 left-2 z-10 px-3 py-1 bg-[#faf6ed]/95 rounded border border-[#6b4423]/50"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              <span className="text-sm text-[#2d5016] font-semibold">Trail Survey Map</span>
            </div>

            <FieldJournalMap
              ref={mapRef}
              dataPoints={activityData.dataPoints}
              currentIndex={currentIndex}
              bounds={activityData.bounds}
              colorMode={colorMode}
              cameraMode={cameraMode}
              hasHeartRate={activityData.hasHeartRate}
            />

            {/* Map overlay controls - journal style */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <button
                onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                className="px-3 py-1.5 bg-[#faf6ed]/95 rounded text-xs text-[#2d5016] hover:bg-[#faf6ed] transition-colors border border-[#6b4423]/50"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
              >
                {cameraMode === "follow" ? "Full Map" : "Follow Trail"}
              </button>
              <button
                onClick={() => {
                  const modes: ColorMode[] = ["elevation", "speed"];
                  if (activityData.hasHeartRate) modes.push("hr");
                  const idx = modes.indexOf(colorMode);
                  setColorMode(modes[(idx + 1) % modes.length]);
                }}
                className="px-3 py-1.5 bg-[#faf6ed]/95 rounded text-xs text-[#2d5016] hover:bg-[#faf6ed] transition-colors border border-[#6b4423]/50 capitalize"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '14px' }}
              >
                {colorMode === "hr" ? "Heart Rate" : colorMode === "elevation" ? "Elevation" : "Speed"}
              </button>
            </div>

            {/* Compass rose decoration */}
            <div className="absolute bottom-2 right-2 w-10 h-10 opacity-60">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <circle cx="20" cy="20" r="18" fill="none" stroke="#6b4423" strokeWidth="1" />
                <path d="M20 4 L22 18 L20 22 L18 18 Z" fill="#722f37" />
                <path d="M20 36 L22 22 L20 18 L18 22 Z" fill="#6b4423" />
                <path d="M4 20 L18 18 L22 20 L18 22 Z" fill="#6b4423" opacity="0.5" />
                <path d="M36 20 L22 18 L18 20 L22 22 Z" fill="#6b4423" opacity="0.5" />
                <text x="20" y="3" textAnchor="middle" fontSize="4" fill="#6b4423" style={{ fontFamily: "'Caveat', cursive" }}>N</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Progress Bar - Styled like a measurement ruler */}
        <div className="px-6 pb-3">
          <div className="flex items-center gap-4">
            <span
              className="text-sm text-[#6b4423] tabular-nums w-14"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {formatDuration(currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="field-journal-slider"
              />
            </div>
            <span
              className="text-sm text-[#6b4423] tabular-nums w-14 text-right"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {formatDuration(activityData.summary.duration)}
            </span>
          </div>
        </div>

        {/* Controls - Hand-drawn button style */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-4">
            {/* Skip back */}
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="p-2 text-[#6b4423] hover:text-[#2d5016] disabled:opacity-30 transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {/* Play/Pause - Primary action with sketched border effect */}
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-[#2d5016] hover:bg-[#3d6020] text-[#faf6ed] flex items-center justify-center transition-colors"
              style={{
                border: '3px solid #6b4423',
                boxShadow: '2px 2px 0 #6b4423'
              }}
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
              className="p-2 text-[#6b4423] hover:text-[#2d5016] disabled:opacity-30 transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Speed selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#6b4423] hover:text-[#2d5016] transition-colors"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
              >
                {playbackSpeed}x speed
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#faf6ed] rounded py-1 min-w-[80px] animate-in fade-in slide-in-from-bottom-1 duration-150"
                  style={{ border: '2px solid #6b4423', boxShadow: '2px 2px 0 rgba(107, 68, 35, 0.3)' }}
                >
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-sm text-left hover:bg-[#6b4423]/10 transition-colors ${
                        playbackSpeed === speed ? "text-[#2d5016] font-semibold" : "text-[#6b4423]"
                      }`}
                      style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Stats - Like additional field notes */}
        {(currentPoint?.hr !== undefined || currentPoint?.speed !== undefined) && (
          <>
            <div className="mx-6 border-t-2 border-dashed border-[#6b4423]/30" />
            <div className="px-6 py-4">
              <p
                className="text-sm text-[#6b4423]/80 mb-2"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
              >
                Additional Observations:
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {currentPoint?.speed !== undefined && (
                  <span
                    className="text-[#6b4423]"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
                  >
                    Speed: <span className="text-[#2d5016] font-semibold">{msToMph(currentPoint.speed).toFixed(1)} mph</span>
                  </span>
                )}
                {currentPoint?.hr !== undefined && (
                  <span
                    className="text-[#6b4423]"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
                  >
                    Heart Rate: <span className="text-[#722f37] font-semibold">{currentPoint.hr} bpm</span>
                  </span>
                )}
                {activityData.summary.elevationGain > 0 && (
                  <span
                    className="text-[#6b4423]"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
                  >
                    Total Ascent: <span className="text-[#2d5016] font-semibold">{Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()} ft</span>
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer flourish */}
        <div className="px-6 pb-4 flex justify-center">
          <div className="flex items-center gap-3 opacity-30">
            <div className="w-12 h-px bg-[#6b4423]" />
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-[#2d5016]">
              <path d="M10 2 C 8 6, 4 8, 2 10 C 4 12, 8 14, 10 18 C 12 14, 16 12, 18 10 C 16 8, 12 6, 10 2" fill="currentColor" />
            </svg>
            <div className="w-12 h-px bg-[#6b4423]" />
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .field-journal-slider [data-slot="track"] {
          height: 6px;
          background: repeating-linear-gradient(
            90deg,
            #6b4423 0px,
            #6b4423 1px,
            transparent 1px,
            transparent 4px
          );
          border-radius: 0;
          border-top: 1px solid #6b4423;
          border-bottom: 1px solid #6b4423;
        }
        .field-journal-slider [data-slot="range"] {
          background: #2d5016;
          border-radius: 0;
        }
        .field-journal-slider [data-slot="thumb"] {
          width: 16px;
          height: 16px;
          background: #faf6ed;
          border: 2px solid #2d5016;
          border-radius: 50%;
          box-shadow: 1px 1px 0 #6b4423;
          transition: transform 0.15s ease;
        }
        .field-journal-slider [data-slot="thumb"]:hover {
          transform: scale(1.15);
        }
        .field-journal-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.2), 1px 1px 0 #6b4423;
        }
      `}</style>
    </div>
  );
}
