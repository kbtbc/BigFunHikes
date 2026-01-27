/**
 * Editorial Player - Magazine/Publication Style Layout
 *
 * Design philosophy: Sophisticated editorial design like a premium magazine feature article
 * Typography: Playfair Display (serif) for headlines, elegant sans-serif for body
 * Color Palette: Off-white (#faf8f5) + Deep red accent (#991b1b) + Warm grays + Muted burgundy
 *
 * Features:
 * - Asymmetric magazine-style grid layout
 * - Elegant serif + sans-serif font pairing
 * - Large pull quote-style statistics with elegant typography
 * - Drop caps for narrative text
 * - Map as elegant sidebar element (40-50% of layout)
 * - Caption-style labels and horizontal rules
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
import { EditorialMap, type EditorialMapRef, type CameraMode, type ColorMode } from "./EditorialMap";

// Re-export types for consumers
export type { CameraMode, ColorMode };

interface EditorialPlayerProps {
  data: SuuntoParseResult;
}

export function EditorialPlayer({ data }: EditorialPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [colorMode, setColorMode] = useState<ColorMode>("elevation");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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
      <div className="editorial-player bg-[#faf8f5] p-12">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#991b1b] border-t-transparent" />
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
    <div className="editorial-player">
      {/* Google Fonts Import */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500&display=swap"
        rel="stylesheet"
      />

      {/* Main Container - Off-white background */}
      <div className="bg-[#faf8f5] border border-[#d4cfc7] shadow-sm overflow-hidden">
        {/* Magazine Masthead */}
        <header className="border-b border-[#991b1b]/20 px-6 md:px-10 py-5">
          <div className="flex items-center justify-between">
            <p className="editorial-caps text-[10px] tracking-[0.4em] text-[#6b5c4c] font-medium">
              THE ACTIVITY JOURNAL
            </p>
            <p className="text-xs text-[#8b7355] editorial-body-serif italic">
              {formatEditorialDate(activityData.summary.startTime)}
            </p>
          </div>
        </header>

        {/* Article Title */}
        <div className="px-6 md:px-10 pt-8 pb-4 border-b border-[#e8e4dd]">
          <h1 className="editorial-headline text-3xl md:text-5xl lg:text-6xl text-[#2c2416] leading-[1.1] tracking-tight">
            {data.activityType || "Trail Activity"}
          </h1>
          <p className="editorial-body-serif text-base md:text-lg text-[#6b5c4c] mt-3 italic">
            A journey of {totalDistanceMiles} miles with {elevationGainFt.toLocaleString()} feet of elevation gain
          </p>
        </div>

        {/* Asymmetric Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column - Stats (narrower, 5 cols) */}
          <div className="lg:col-span-5 p-6 md:p-10 lg:pr-6 order-2 lg:order-1">
            {/* Primary Pull Quote - Distance */}
            <div className="mb-10">
              <div className="border-l-[3px] border-[#991b1b] pl-5 md:pl-8">
                <p className="editorial-headline text-7xl md:text-8xl lg:text-[7rem] text-[#2c2416] leading-none tracking-tight">
                  {distanceMiles}
                </p>
                <p className="editorial-caps text-xs tracking-[0.25em] text-[#991b1b] mt-3 font-medium">
                  MILES TRAVELED
                </p>
              </div>
            </div>

            {/* Secondary Stats - Elegant Pull Quote Style */}
            <div className="space-y-8">
              {/* Time */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#f0ebe4] flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="editorial-headline text-sm text-[#991b1b]">T</span>
                </div>
                <div>
                  <p className="editorial-headline text-4xl md:text-5xl text-[#2c2416] tabular-nums leading-tight">
                    {formatDuration(currentTime)}
                  </p>
                  <p className="editorial-body-serif text-sm text-[#8b7355] mt-1 italic">
                    elapsed time
                  </p>
                </div>
              </div>

              {/* Elevation */}
              {currentPoint?.elevation !== undefined && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#f0ebe4] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="editorial-headline text-sm text-[#991b1b]">E</span>
                  </div>
                  <div>
                    <p className="editorial-headline text-4xl md:text-5xl text-[#2c2416] leading-tight">
                      {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}
                      <span className="text-2xl text-[#8b7355] ml-1">ft</span>
                    </p>
                    <p className="editorial-body-serif text-sm text-[#8b7355] mt-1 italic">
                      current elevation
                    </p>
                  </div>
                </div>
              )}

              {/* Pace */}
              {currentPoint?.speed !== undefined && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#f0ebe4] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="editorial-headline text-sm text-[#991b1b]">P</span>
                  </div>
                  <div>
                    <p className="editorial-headline text-4xl md:text-5xl text-[#2c2416] tabular-nums leading-tight">
                      {formatPace(currentPoint.speed)}
                      <span className="text-xl text-[#8b7355] ml-1">/mi</span>
                    </p>
                    <p className="editorial-body-serif text-sm text-[#8b7355] mt-1 italic">
                      current pace
                    </p>
                  </div>
                </div>
              )}

              {/* Heart Rate */}
              {currentPoint?.hr !== undefined && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#991b1b]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="editorial-headline text-sm text-[#991b1b]">H</span>
                  </div>
                  <div>
                    <p className="editorial-headline text-4xl md:text-5xl text-[#991b1b] leading-tight">
                      {currentPoint.hr}
                      <span className="text-xl text-[#991b1b]/60 ml-1">bpm</span>
                    </p>
                    <p className="editorial-body-serif text-sm text-[#8b7355] mt-1 italic">
                      heart rate
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ornamental Divider */}
            <div className="flex items-center gap-3 my-10">
              <div className="h-px bg-[#d4cfc7] flex-1" />
              <div className="w-2 h-2 rotate-45 bg-[#991b1b]" />
              <div className="h-px bg-[#d4cfc7] flex-1" />
            </div>

            {/* Summary Text with Drop Cap */}
            <div className="editorial-body-serif text-base text-[#4a4035] leading-[1.8]">
              <p>
                <span className="editorial-drop-cap float-left text-6xl leading-[0.8] mr-3 mt-1 text-[#991b1b] font-medium">
                  T
                </span>
                his activity covered {totalDistanceMiles} miles with {elevationGainFt.toLocaleString()} feet of elevation gain over the course of {formatDuration(activityData.summary.duration)}.
                {activityData.summary.avgHr ? (
                  <> The average heart rate recorded was {activityData.summary.avgHr} beats per minute.</>
                ) : null}
              </p>
            </div>
          </div>

          {/* Right Column - Map (wider, 7 cols - ~58% for map prominence) */}
          <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-[#e8e4dd] order-1 lg:order-2">
            <div className="h-full flex flex-col">
              {/* Map Caption */}
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <p className="editorial-caps text-[10px] tracking-[0.3em] text-[#8b7355]">
                  ROUTE MAP
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const modes: ColorMode[] = ["elevation", "speed"];
                      if (activityData.hasHeartRate) modes.push("hr");
                      const idx = modes.indexOf(colorMode);
                      setColorMode(modes[(idx + 1) % modes.length]);
                    }}
                    className="text-[10px] tracking-wider text-[#6b5c4c] hover:text-[#991b1b] transition-colors uppercase"
                  >
                    {colorMode === "hr" ? "Heart Rate" : colorMode}
                  </button>
                  <span className="text-[#d4cfc7]">|</span>
                  <button
                    onClick={() => {
                      setCameraMode(cameraMode === "follow" ? "overview" : "follow");
                      if (cameraMode === "follow") {
                        mapRef.current?.fitBounds();
                      }
                    }}
                    className="text-[10px] tracking-wider text-[#6b5c4c] hover:text-[#991b1b] transition-colors uppercase"
                  >
                    {cameraMode === "follow" ? "Overview" : "Follow"}
                  </button>
                </div>
              </div>

              {/* Map Container */}
              <div className="flex-1 min-h-[350px] lg:min-h-[450px] px-4 pb-4">
                <div className="h-full overflow-hidden border border-[#d4cfc7]">
                  <EditorialMap
                    ref={mapRef}
                    dataPoints={activityData.dataPoints}
                    currentIndex={currentIndex}
                    bounds={activityData.bounds}
                    cameraMode={cameraMode}
                    colorMode={colorMode}
                    hasHeartRate={activityData.hasHeartRate}
                  />
                </div>
              </div>

              {/* Figure Caption */}
              <div className="px-6 pb-4">
                <p className="editorial-body-serif text-xs text-[#8b7355] italic text-center">
                  Fig. 1 - Route visualization colored by {colorMode === "hr" ? "heart rate" : colorMode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls - Elegant, understated */}
        <footer className="border-t border-[#d4cfc7] bg-[#f5f1eb] px-6 md:px-10 py-5">
          {/* Progress Scrubber */}
          <div className="mb-5">
            <div className="flex items-center gap-4">
              <span className="editorial-mono text-xs text-[#8b7355] w-14 tabular-nums">
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
              <span className="editorial-mono text-xs text-[#8b7355] w-14 text-right tabular-nums">
                {formatDuration(activityData.summary.duration)}
              </span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            {/* Left - Speed selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#6b5c4c] hover:text-[#991b1b] transition-colors editorial-mono"
              >
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#faf8f5] border border-[#d4cfc7] py-1 min-w-[60px] shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150 z-50">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-xs text-left hover:bg-[#f0ebe4] transition-colors editorial-mono ${
                        playbackSpeed === speed ? "text-[#991b1b] font-medium" : "text-[#4a4035]"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Center - Play controls */}
            <div className="flex items-center gap-5">
              <button
                onClick={handleSkipBack}
                disabled={currentIndex === 0}
                className="p-2 text-[#8b7355] hover:text-[#2c2416] disabled:opacity-30 transition-colors"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full border-2 border-[#2c2416] hover:border-[#991b1b] hover:bg-[#991b1b] hover:text-white text-[#2c2416] flex items-center justify-center transition-all duration-200"
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
                className="p-2 text-[#8b7355] hover:text-[#2c2416] disabled:opacity-30 transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Right - Progress indicator */}
            <div className="text-xs text-[#8b7355]">
              <span className="editorial-mono">{Math.round(progress)}%</span>
              <span className="ml-1 editorial-body-serif italic">complete</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Typography and Slider Styles */}
      <style>{`
        .editorial-player {
          font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
        }

        .editorial-headline {
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
          font-weight: 400;
        }

        .editorial-body-serif {
          font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
          font-weight: 400;
        }

        .editorial-caps {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          letter-spacing: 0.3em;
        }

        .editorial-mono {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
          font-variant-numeric: tabular-nums;
        }

        .editorial-drop-cap {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 500;
        }

        .editorial-slider [data-slot="track"] {
          height: 2px;
          background: #d4cfc7;
        }

        .editorial-slider [data-slot="range"] {
          background: #991b1b;
        }

        .editorial-slider [data-slot="thumb"] {
          width: 14px;
          height: 14px;
          background: #faf8f5;
          border: 2px solid #991b1b;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .editorial-slider [data-slot="thumb"]:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(153, 27, 27, 0.25);
        }

        .editorial-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(153, 27, 27, 0.15);
        }
      `}</style>
    </div>
  );
}
