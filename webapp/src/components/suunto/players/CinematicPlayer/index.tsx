/**
 * Cinematic Player - Full-screen immersive Activity Player
 *
 * A dramatic, movie-trailer aesthetic experience for activity replays.
 * Color Palette: Deep black (#0a0a0a) + Gold accents (#d4af37, #f4d03f) + White text
 *
 * Features:
 * - Full-screen map (70vh+) with cinematic letterbox bars
 * - Floating minimal translucent controls
 * - Dramatic first-person camera by default
 * - Minimal elegant stats in floating badges
 * - No charts visible - pure immersive experience
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Video,
  Eye,
  Navigation,
  Sparkles,
  Mountain,
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
import { CinematicMap, type CinematicMapRef, type CameraMode } from "./CinematicMap";

interface CinematicPlayerProps {
  data: SuuntoParseResult;
}

export function CinematicPlayer({ data }: CinematicPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>("firstPerson");
  const [terrain3D, setTerrain3D] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<CinematicMapRef>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-hide controls after inactivity
  useEffect(() => {
    const resetHideTimeout = () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      setShowControls(true);
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener("mousemove", resetHideTimeout);
    window.addEventListener("touchstart", resetHideTimeout);

    return () => {
      window.removeEventListener("mousemove", resetHideTimeout);
      window.removeEventListener("touchstart", resetHideTimeout);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

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

  if (!activityData) {
    return (
      <div className="cinematic-container bg-[#0a0a0a] min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#d4af37] tracking-[0.3em] uppercase text-sm font-light">Loading Experience</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cinematic-container relative bg-[#0a0a0a] overflow-hidden">
      {/* Full-screen Map */}
      <div className="relative" style={{ height: "75vh", minHeight: "500px" }}>
        <CinematicMap
          ref={mapRef}
          dataPoints={activityData.dataPoints}
          currentIndex={currentIndex}
          bounds={activityData.bounds}
          cameraMode={cameraMode}
          terrain3D={terrain3D}
        />

        {/* Floating Stats Badges - Top Left */}
        <div
          className={`absolute top-8 left-6 flex flex-col gap-3 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Speed Badge */}
          {currentPoint?.speed !== undefined && (
            <div className="cinematic-stat-badge">
              <span className="cinematic-stat-value">
                {msToMph(currentPoint.speed).toFixed(1)}
              </span>
              <span className="cinematic-stat-unit">mph</span>
            </div>
          )}

          {/* Distance Badge */}
          <div className="cinematic-stat-badge">
            <span className="cinematic-stat-value">
              {currentPoint?.distance
                ? (currentPoint.distance * 0.000621371).toFixed(2)
                : "0.00"}
            </span>
            <span className="cinematic-stat-unit">mi</span>
          </div>

          {/* Elevation Badge */}
          {currentPoint?.elevation !== undefined && (
            <div className="cinematic-stat-badge">
              <span className="cinematic-stat-value">
                {Math.round(metersToFeet(currentPoint.elevation))}
              </span>
              <span className="cinematic-stat-unit">ft</span>
            </div>
          )}
        </div>

        {/* Time Display - Top Right */}
        <div
          className={`absolute top-8 right-6 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="cinematic-time-badge">
            <span className="text-white/60 text-xs tracking-widest uppercase mb-1">Time</span>
            <span className="text-white font-light text-2xl tracking-wider">
              {formatDuration(currentTime)}
            </span>
            <span className="text-white/40 text-sm">
              / {formatDuration(activityData.summary.duration)}
            </span>
          </div>
        </div>

        {/* Branding - Bottom Left */}
        <div
          className={`absolute bottom-20 left-6 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-30"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span className="text-white/80 text-xs tracking-[0.25em] uppercase font-light">
              Replay Studio
            </span>
          </div>
        </div>
      </div>

      {/* Floating Control Bar */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl transition-all duration-500 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="cinematic-controls-bar">
          {/* Progress Scrubber */}
          <div className="px-4 py-3">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cinematic-slider"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-3">
            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkipBack}
                disabled={currentIndex === 0}
                className="cinematic-control-btn"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                onClick={handlePlayPause}
                className="cinematic-play-btn"
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
                className="cinematic-control-btn"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3">
              {/* Camera Mode */}
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="cinematic-select w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  <SelectItem value="firstPerson" className="text-white focus:bg-[#333] focus:text-[#d4af37]">
                    <div className="flex items-center gap-2">
                      <Video className="h-3 w-3" />
                      First Person
                    </div>
                  </SelectItem>
                  <SelectItem value="follow" className="text-white focus:bg-[#333] focus:text-[#d4af37]">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3 w-3" />
                      Follow
                    </div>
                  </SelectItem>
                  <SelectItem value="cinematic" className="text-white focus:bg-[#333] focus:text-[#d4af37]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Cinematic
                    </div>
                  </SelectItem>
                  <SelectItem value="overview" className="text-white focus:bg-[#333] focus:text-[#d4af37]">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Overview
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 3D Terrain Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTerrain3D(!terrain3D)}
                className={`cinematic-control-btn ${terrain3D ? "text-[#d4af37]" : ""}`}
              >
                <Mountain className="h-4 w-4" />
              </Button>

              {/* Speed */}
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="cinematic-select w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  <SelectItem value="0.5" className="text-white focus:bg-[#333] focus:text-[#d4af37]">0.5x</SelectItem>
                  <SelectItem value="1" className="text-white focus:bg-[#333] focus:text-[#d4af37]">1x</SelectItem>
                  <SelectItem value="2" className="text-white focus:bg-[#333] focus:text-[#d4af37]">2x</SelectItem>
                  <SelectItem value="4" className="text-white focus:bg-[#333] focus:text-[#d4af37]">4x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic Styles */}
      <style>{`
        .cinematic-container {
          font-family: "Inter", system-ui, sans-serif;
        }

        /* Floating stat badges */
        .cinematic-stat-badge {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 80px;
        }

        .cinematic-stat-value {
          font-size: 1.5rem;
          font-weight: 300;
          color: #fff;
          letter-spacing: 0.05em;
          line-height: 1;
        }

        .cinematic-stat-unit {
          font-size: 0.7rem;
          color: #d4af37;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 2px;
        }

        /* Time badge */
        .cinematic-time-badge {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        /* Controls bar */
        .cinematic-controls-bar {
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        /* Slider styling */
        .cinematic-slider [data-radix-slider-track] {
          background: rgba(255, 255, 255, 0.15);
          height: 4px;
        }

        .cinematic-slider [data-radix-slider-range] {
          background: linear-gradient(90deg, #d4af37 0%, #f4d03f 100%);
        }

        .cinematic-slider [data-radix-slider-thumb] {
          width: 14px;
          height: 14px;
          background: #d4af37;
          border: 2px solid #fff;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }

        .cinematic-slider [data-radix-slider-thumb]:hover {
          transform: scale(1.2);
        }

        /* Control buttons */
        .cinematic-control-btn {
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
        }

        .cinematic-control-btn:hover {
          color: #d4af37;
          background: rgba(212, 175, 55, 0.1);
        }

        .cinematic-control-btn:disabled {
          color: rgba(255, 255, 255, 0.2);
        }

        /* Play button */
        .cinematic-play-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%);
          color: #0a0a0a;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
        }

        .cinematic-play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 30px rgba(212, 175, 55, 0.6);
          background: linear-gradient(135deg, #f4d03f 0%, #d4af37 100%);
        }

        /* Select styling */
        .cinematic-select {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.8rem;
          height: 32px;
        }

        .cinematic-select:hover {
          border-color: rgba(212, 175, 55, 0.5);
        }

        .cinematic-select:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}
