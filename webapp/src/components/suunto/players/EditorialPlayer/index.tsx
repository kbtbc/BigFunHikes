/**
 * Editorial Player - Magazine/Publication Style Layout
 *
 * Design philosophy: Sophisticated editorial design like a feature article
 * Color Palette: Off-white (#FAFAFA) + Rich black (#1A1A1A) + Deep red accent (#C41E3A)
 *
 * Features:
 * - Asymmetric magazine-style grid layout
 * - Elegant serif + sans-serif font pairing
 * - Large pull quotes for key statistics
 * - Drop caps and horizontal rules
 * - Map as elegant sidebar element
 * - Caption-style labels
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MapPin,
  Clock,
  TrendingUp,
  Heart,
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
import { EditorialMap, type EditorialMapRef, type CameraMode } from "./EditorialMap";

interface EditorialPlayerProps {
  data: SuuntoParseResult;
}

export function EditorialPlayer({ data }: EditorialPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<EditorialMapRef>(null);

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

  // Format date in editorial style
  const formatEditorialDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!activityData) {
    return (
      <div className="editorial-player bg-[#FAFAFA] p-12">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#C41E3A] border-t-transparent" />
        </div>
      </div>
    );
  }

  const distanceMiles = currentPoint?.distance
    ? (currentPoint.distance * 0.000621371).toFixed(2)
    : "0.00";

  const totalDistanceMiles = (activityData.summary.distance * 0.000621371).toFixed(1);
  const elevationGainFt = Math.round(metersToFeet(activityData.summary.elevationGain));

  return (
    <div className="editorial-player font-sans">
      {/* Main Container */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5]">
        {/* Magazine Header */}
        <header className="border-b border-[#1A1A1A]/10 px-8 py-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-[#1A1A1A]/50 font-medium mb-2">
                Activity Journal
              </p>
              <h1 className="editorial-headline text-3xl md:text-4xl text-[#1A1A1A] leading-tight">
                {data.activityType || "Trail Activity"}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#1A1A1A]/60 editorial-body">
                {formatEditorialDate(activityData.summary.startTime)}
              </p>
            </div>
          </div>
        </header>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-7 p-8 lg:pr-4">
            {/* Opening Pull Quote - Distance */}
            <div className="mb-10">
              <div className="border-l-4 border-[#C41E3A] pl-6 py-2">
                <p className="editorial-headline text-6xl md:text-7xl text-[#1A1A1A] leading-none">
                  {distanceMiles}
                  <span className="text-xl md:text-2xl text-[#1A1A1A]/40 ml-2 font-normal">miles</span>
                </p>
                <p className="text-sm text-[#1A1A1A]/50 mt-2 uppercase tracking-wider">
                  Distance Covered
                </p>
              </div>
            </div>

            {/* Editorial Stats Grid - Asymmetric */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-10">
              {/* Time - Large feature */}
              <div className="col-span-2 sm:col-span-1">
                <div className="flex items-baseline gap-3">
                  <Clock className="w-4 h-4 text-[#C41E3A] flex-shrink-0 mt-1" />
                  <div>
                    <p className="editorial-headline text-4xl text-[#1A1A1A] tabular-nums">
                      {formatDuration(currentTime)}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider mt-1">
                      Elapsed Time
                    </p>
                  </div>
                </div>
              </div>

              {/* Elevation */}
              {currentPoint?.elevation !== undefined && (
                <div>
                  <div className="flex items-baseline gap-3">
                    <TrendingUp className="w-4 h-4 text-[#C41E3A] flex-shrink-0 mt-1" />
                    <div>
                      <p className="editorial-headline text-4xl text-[#1A1A1A]">
                        {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}
                        <span className="text-lg text-[#1A1A1A]/40 ml-1">ft</span>
                      </p>
                      <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider mt-1">
                        Elevation
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Speed / Pace */}
              {currentPoint?.speed !== undefined && (
                <div>
                  <div className="flex items-baseline gap-3">
                    <Footprints className="w-4 h-4 text-[#C41E3A] flex-shrink-0 mt-1" />
                    <div>
                      <p className="editorial-headline text-4xl text-[#1A1A1A] tabular-nums">
                        {formatPace(currentPoint.speed)}
                        <span className="text-lg text-[#1A1A1A]/40 ml-1">/mi</span>
                      </p>
                      <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider mt-1">
                        Current Pace
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Heart Rate */}
              {currentPoint?.hr !== undefined && (
                <div>
                  <div className="flex items-baseline gap-3">
                    <Heart className="w-4 h-4 text-[#C41E3A] flex-shrink-0 mt-1" />
                    <div>
                      <p className="editorial-headline text-4xl text-[#1A1A1A]">
                        {currentPoint.hr}
                        <span className="text-lg text-[#1A1A1A]/40 ml-1">bpm</span>
                      </p>
                      <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider mt-1">
                        Heart Rate
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Rule */}
            <div className="flex items-center gap-4 my-8">
              <div className="h-px bg-[#1A1A1A]/10 flex-1" />
              <MapPin className="w-4 h-4 text-[#C41E3A]" />
              <div className="h-px bg-[#1A1A1A]/10 flex-1" />
            </div>

            {/* Summary Block with Drop Cap Style */}
            <div className="editorial-body text-[#1A1A1A]/70 leading-relaxed">
              <p className="first-letter:text-5xl first-letter:font-serif first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#C41E3A] first-letter:leading-none">
                This activity covered {totalDistanceMiles} miles with {elevationGainFt.toLocaleString()} feet of elevation gain over {formatDuration(activityData.summary.duration)}.
                {activityData.summary.avgHr && (
                  <> Average heart rate was {activityData.summary.avgHr} bpm.</>
                )}
              </p>
            </div>
          </div>

          {/* Map Sidebar - Right Column */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#1A1A1A]/10">
            <div className="h-full flex flex-col">
              {/* Map Caption */}
              <div className="px-6 pt-6 pb-3">
                <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-wider">
                  Route Overview
                </p>
              </div>

              {/* Map */}
              <div className="flex-1 min-h-[300px] px-4 pb-4">
                <div className="h-full rounded-sm overflow-hidden border border-[#1A1A1A]/10">
                  <EditorialMap
                    ref={mapRef}
                    dataPoints={activityData.dataPoints}
                    currentIndex={currentIndex}
                    bounds={activityData.bounds}
                    cameraMode={cameraMode}
                  />
                </div>
              </div>

              {/* Map Toggle */}
              <div className="px-6 pb-4 flex justify-end">
                <button
                  onClick={() => {
                    setCameraMode(cameraMode === "follow" ? "overview" : "follow");
                    if (cameraMode === "follow") {
                      mapRef.current?.fitBounds();
                    }
                  }}
                  className="text-xs text-[#1A1A1A]/50 hover:text-[#C41E3A] transition-colors uppercase tracking-wider"
                >
                  {cameraMode === "follow" ? "View Full Route" : "Follow Position"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <footer className="border-t border-[#1A1A1A]/10 px-8 py-6">
          {/* Progress Scrubber */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#1A1A1A]/40 tabular-nums w-14 font-mono">
                {formatDuration(currentTime)}
              </span>
              <div className="flex-1">
                <Slider
                  value={[progress]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="editorial-slider"
                />
              </div>
              <span className="text-xs text-[#1A1A1A]/40 tabular-nums w-14 text-right font-mono">
                {formatDuration(activityData.summary.duration)}
              </span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            {/* Left - Speed selector */}
            <div className="flex items-center gap-2">
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    playbackSpeed === speed
                      ? "text-[#C41E3A] font-medium"
                      : "text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Center - Play controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSkipBack}
                disabled={currentIndex === 0}
                className="p-2 text-[#1A1A1A]/40 hover:text-[#1A1A1A] disabled:opacity-30 transition-colors"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full border-2 border-[#1A1A1A] hover:border-[#C41E3A] hover:text-[#C41E3A] text-[#1A1A1A] flex items-center justify-center transition-colors"
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
                className="p-2 text-[#1A1A1A]/40 hover:text-[#1A1A1A] disabled:opacity-30 transition-colors"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Right - Progress indicator */}
            <div className="text-xs text-[#1A1A1A]/40">
              <span className="font-mono">{Math.round(progress)}%</span>
              <span className="ml-2">complete</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Typography and Slider Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

        .editorial-player {
          font-family: 'Source Sans 3', system-ui, sans-serif;
        }

        .editorial-headline {
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
          font-weight: 400;
        }

        .editorial-body {
          font-family: 'Source Sans 3', system-ui, sans-serif;
          font-weight: 400;
        }

        .editorial-slider [data-slot="track"] {
          height: 2px;
          background: #E5E5E5;
        }

        .editorial-slider [data-slot="range"] {
          background: #C41E3A;
        }

        .editorial-slider [data-slot="thumb"] {
          width: 14px;
          height: 14px;
          background: #FAFAFA;
          border: 2px solid #C41E3A;
          box-shadow: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .editorial-slider [data-slot="thumb"]:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(196, 30, 58, 0.25);
        }

        .editorial-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(196, 30, 58, 0.15);
        }
      `}</style>
    </div>
  );
}
