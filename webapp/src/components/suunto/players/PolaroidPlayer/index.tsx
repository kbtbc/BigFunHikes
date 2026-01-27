/**
 * Polaroid Player - Vintage Photo/Film Aesthetic
 *
 * Design philosophy: Warm, nostalgic, treasured memories from an old photo album
 * Color Palette: Warm cream (#FDF8F3) + Sepia tones + Vintage browns (#8B7355) + Faded greens
 *
 * Features:
 * - Polaroid-framed map with tilt effect
 * - Handwritten-style fonts (Google Font: Caveat)
 * - Warm sepia/vintage photo filters
 * - Scrapbook layout with handwritten notes
 * - Tape/pin decorations
 * - Aged paper texture backgrounds
 * - Stamp-style badges
 * - Film strip progress indicator
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { PolaroidMap, type PolaroidMapRef, type CameraMode, type ColorMode } from "./PolaroidMap";

interface PolaroidPlayerProps {
  data: SuuntoParseResult;
}

export function PolaroidPlayer({ data }: PolaroidPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("elevation");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<PolaroidMapRef>(null);

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

  // Handle film strip click
  const handleFilmStripClick = useCallback((index: number) => {
    if (!activityData) return;
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, [activityData]);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Format date from activity
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "A Beautiful Day";
    }
  };

  // Generate film strip frames
  const frameCount = 12;
  const frames = activityData
    ? Array.from({ length: frameCount }, (_, i) => {
        const frameIndex = Math.floor((i / (frameCount - 1)) * (activityData.dataPoints.length - 1));
        return frameIndex;
      })
    : [];

  if (!activityData) {
    return (
      <div className="polaroid-player p-8" style={{ background: "#FDF8F3" }}>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B7355] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="polaroid-player space-y-6">
      {/* Google Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Homemade+Apple&display=swap');
      `}</style>

      {/* Main scrapbook page */}
      <div
        className="relative rounded-lg overflow-hidden p-8"
        style={{
          background: `
            linear-gradient(135deg, #FDF8F3 0%, #F5EBE0 50%, #EDE4D3 100%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")
          `,
          boxShadow: "inset 0 0 100px rgba(139, 115, 85, 0.1)",
        }}
      >
        {/* Decorative tape in corner */}
        <div
          className="absolute -top-2 -left-2 w-20 h-8 transform -rotate-45"
          style={{
            background: "linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(245,235,200,0.8) 100%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        />
        <div
          className="absolute -top-2 -right-2 w-20 h-8 transform rotate-45"
          style={{
            background: "linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(245,235,200,0.8) 100%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        />

        {/* Date header - handwritten style */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl text-[#5C4033]"
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
          >
            {formatDate(activityData.summary.startTime)}
          </h2>
          <p
            className="text-sm text-[#8B7355] mt-1"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            A trail adventure to remember...
          </p>
        </div>

        {/* Polaroid frame with map */}
        <div className="flex justify-center mb-6">
          <div
            className="relative transform rotate-[-1deg] hover:rotate-0 transition-transform duration-500"
            style={{
              background: "#FFFEF9",
              padding: "12px 12px 48px 12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {/* Pushpin decoration */}
            <div
              className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full"
              style={{
                background: "radial-gradient(circle at 30% 30%, #E8D4B8 0%, #C41E3A 30%, #8B0000 100%)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)",
              }}
            />

            {/* Map container */}
            <div
              className="relative overflow-hidden"
              style={{
                width: "min(100%, 400px)",
                height: "300px",
              }}
            >
              <PolaroidMap
                ref={mapRef}
                dataPoints={activityData.dataPoints}
                currentIndex={currentIndex}
                bounds={activityData.bounds}
                colorMode={colorMode}
                cameraMode={cameraMode}
                hasHeartRate={activityData.hasHeartRate}
              />
            </div>

            {/* Polaroid caption */}
            <div
              className="absolute bottom-3 left-0 right-0 text-center px-4"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              <p className="text-lg text-[#5C4033]">
                Mile {currentPoint?.distance ? (currentPoint.distance * 0.000621371).toFixed(1) : "0"} of the journey
              </p>
            </div>

            {/* Map control buttons - subtle */}
            <div className="absolute bottom-14 right-3 flex flex-col gap-1">
              <button
                onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                className="px-2 py-1 text-xs rounded bg-[#FDF8F3]/90 text-[#8B7355] hover:bg-[#FDF8F3] transition-colors"
                style={{ fontFamily: "'Caveat', cursive", fontSize: "14px" }}
              >
                {cameraMode === "follow" ? "See all" : "Follow"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats as handwritten notes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Distance stamp */}
          <div
            className="relative p-4 rounded-lg text-center transform rotate-[-2deg]"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "2px solid #8B7355",
              boxShadow: "2px 2px 0 rgba(139, 115, 85, 0.2)",
            }}
          >
            <div
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full"
              style={{
                background: "radial-gradient(circle at 30% 30%, #FFD700 0%, #DAA520 100%)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}
            />
            <p
              className="text-xs uppercase tracking-wider text-[#8B7355] mb-1"
              style={{ fontFamily: "serif" }}
            >
              Distance
            </p>
            <p
              className="text-3xl text-[#5C4033]"
              style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
            >
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}{" "}
              <span className="text-lg">mi</span>
            </p>
          </div>

          {/* Time stamp */}
          <div
            className="relative p-4 rounded-lg text-center transform rotate-[1deg]"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "2px solid #6B8E6B",
              boxShadow: "2px 2px 0 rgba(107, 142, 107, 0.2)",
            }}
          >
            <p
              className="text-xs uppercase tracking-wider text-[#6B8E6B] mb-1"
              style={{ fontFamily: "serif" }}
            >
              Time
            </p>
            <p
              className="text-3xl text-[#5C4033] tabular-nums"
              style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
            >
              {formatDuration(currentTime)}
            </p>
          </div>

          {/* Elevation stamp */}
          {currentPoint?.elevation !== undefined && (
            <div
              className="relative p-4 rounded-lg text-center transform rotate-[-1deg]"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "2px solid #B8860B",
                boxShadow: "2px 2px 0 rgba(184, 134, 11, 0.2)",
              }}
            >
              <p
                className="text-xs uppercase tracking-wider text-[#B8860B] mb-1"
                style={{ fontFamily: "serif" }}
              >
                Elevation
              </p>
              <p
                className="text-3xl text-[#5C4033]"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
              >
                {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}{" "}
                <span className="text-lg">ft</span>
              </p>
            </div>
          )}

          {/* Speed/Pace stamp */}
          {currentPoint?.speed !== undefined && (
            <div
              className="relative p-4 rounded-lg text-center transform rotate-[2deg]"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "2px solid #8B4513",
                boxShadow: "2px 2px 0 rgba(139, 69, 19, 0.2)",
              }}
            >
              <p
                className="text-xs uppercase tracking-wider text-[#8B4513] mb-1"
                style={{ fontFamily: "serif" }}
              >
                Speed
              </p>
              <p
                className="text-3xl text-[#5C4033]"
                style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
              >
                {msToMph(currentPoint.speed).toFixed(1)}{" "}
                <span className="text-lg">mph</span>
              </p>
            </div>
          )}
        </div>

        {/* Film strip progress bar */}
        <div
          className="relative mx-auto mb-6 p-2 rounded"
          style={{
            background: "#1a1a1a",
            maxWidth: "500px",
          }}
        >
          {/* Sprocket holes top */}
          <div className="flex justify-between px-1 mb-1">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={`top-${i}`}
                className="w-2 h-2 rounded-full"
                style={{ background: "#333" }}
              />
            ))}
          </div>

          {/* Film frames */}
          <div className="flex gap-1">
            {frames.map((frameIndex, i) => {
              const isActive = currentIndex >= frameIndex;
              const isCurrent = i === Math.floor((currentIndex / (activityData.dataPoints.length - 1)) * (frameCount - 1));
              return (
                <button
                  key={i}
                  onClick={() => handleFilmStripClick(frameIndex)}
                  className="flex-1 h-8 rounded-sm transition-all duration-200"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #C4A35A 0%, #8B7355 100%)"
                      : "#2a2a2a",
                    boxShadow: isCurrent ? "0 0 8px rgba(196, 163, 90, 0.6)" : "none",
                    border: isCurrent ? "1px solid #C4A35A" : "1px solid transparent",
                  }}
                />
              );
            })}
          </div>

          {/* Sprocket holes bottom */}
          <div className="flex justify-between px-1 mt-1">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={`bottom-${i}`}
                className="w-2 h-2 rounded-full"
                style={{ background: "#333" }}
              />
            ))}
          </div>

          {/* Progress text */}
          <div
            className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-[#8B7355]"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            {Math.round(progress)}% of the journey
          </div>
        </div>

        {/* Playback controls - vintage style */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Skip back */}
          <button
            onClick={handleSkipBack}
            disabled={currentIndex === 0}
            className="p-3 rounded-full transition-all duration-200 disabled:opacity-30"
            style={{
              background: "linear-gradient(135deg, #EDE4D3 0%, #D4C4A8 100%)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <SkipBack className="h-5 w-5 text-[#5C4033]" />
          </button>

          {/* Play/Pause - main action */}
          <button
            onClick={handlePlayPause}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #C41E3A 0%, #8B0000 100%)",
              boxShadow: "0 4px 12px rgba(139, 0, 0, 0.3), inset 0 2px 0 rgba(255,255,255,0.2)",
            }}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="h-7 w-7 text-white ml-1" />
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={handleSkipForward}
            disabled={currentIndex >= activityData.dataPoints.length - 1}
            className="p-3 rounded-full transition-all duration-200 disabled:opacity-30"
            style={{
              background: "linear-gradient(135deg, #EDE4D3 0%, #D4C4A8 100%)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <SkipForward className="h-5 w-5 text-[#5C4033]" />
          </button>

          {/* Speed selector */}
          <div className="ml-4 flex items-center gap-1">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className="px-2 py-1 rounded text-sm transition-all duration-200"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "16px",
                  background: playbackSpeed === speed ? "#8B7355" : "transparent",
                  color: playbackSpeed === speed ? "#FDF8F3" : "#8B7355",
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Heart rate note (if available) */}
        {currentPoint?.hr !== undefined && (
          <div
            className="absolute bottom-4 right-4 transform rotate-3 p-3 rounded"
            style={{
              background: "#FFFACD",
              boxShadow: "2px 2px 6px rgba(0,0,0,0.1)",
              fontFamily: "'Caveat', cursive",
            }}
          >
            <p className="text-sm text-[#8B7355]">Heart rate:</p>
            <p className="text-2xl text-[#C41E3A] font-bold">{currentPoint.hr} bpm</p>
          </div>
        )}

        {/* Summary note in corner */}
        <div
          className="absolute bottom-4 left-4 transform -rotate-2 p-3 rounded max-w-[180px]"
          style={{
            background: "linear-gradient(135deg, #FFFEF9 0%, #F5EBE0 100%)",
            boxShadow: "2px 2px 6px rgba(0,0,0,0.1)",
            fontFamily: "'Caveat', cursive",
          }}
        >
          <p className="text-sm text-[#8B7355] leading-relaxed">
            Total: {(activityData.summary.distance * 0.000621371).toFixed(2)} miles
            <br />
            Climbed: {Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()} ft
            <br />
            Time: {formatDuration(activityData.summary.duration)}
          </p>
        </div>
      </div>
    </div>
  );
}
