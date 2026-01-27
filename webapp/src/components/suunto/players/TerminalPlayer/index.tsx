/**
 * Terminal Player - Hacker/CLI Terminal Aesthetic
 *
 * Design philosophy: Matrix-inspired, command-line interface feel
 * Color Palette: Black (#0D0D0D) + Green (#00FF00) + Amber (#FFB000)
 *
 * Features:
 * - Monospace typography (JetBrains Mono style)
 * - ASCII art elements and borders
 * - Scan line effects
 * - Blinking cursor
 * - Terminal-style stats output
 * - ASCII progress bar
 * - Scrolling data log
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
  type ActivityDataPoint,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { TerminalMap, type TerminalMapRef, type CameraMode, type ColorMode } from "./TerminalMap";

interface TerminalPlayerProps {
  data: SuuntoParseResult;
}

// ASCII progress bar generator
function generateProgressBar(progress: number, width: number = 30): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return "[" + "\u2588".repeat(filled) + "\u2591".repeat(empty) + "]";
}

// Format time as HH:MM:SS
function formatTimeCode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Log entry type
interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "data" | "system" | "warning";
}

export function TerminalPlayer({ data }: TerminalPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<TerminalMapRef>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastLogIndex = useRef<number>(-1);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Parse activity data on mount
  useEffect(() => {
    try {
      const parsed = parseActivityData({
        type: "suunto",
        data: data,
      });
      const resampled = resampleDataPoints(parsed.dataPoints, 5000);
      setActivityData({ ...parsed, dataPoints: resampled });

      // Initialize log with system messages
      setLogEntries([
        { timestamp: "00:00:00", message: "SATELLITE LINK ESTABLISHED", type: "system" },
        { timestamp: "00:00:01", message: `TRACKING ${resampled.length} DATA POINTS`, type: "system" },
        { timestamp: "00:00:02", message: "GPS FEED ONLINE", type: "info" },
      ]);
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

  // Add log entries as playback progresses
  useEffect(() => {
    if (!activityData || currentIndex <= lastLogIndex.current) return;

    const currentPoint = activityData.dataPoints[currentIndex];
    if (!currentPoint) return;

    // Add log entry every ~30 data points (to avoid spam)
    if (currentIndex % 30 === 0 || currentIndex === activityData.dataPoints.length - 1) {
      const timestamp = formatTimeCode(currentPoint.timestamp / 1000);
      const distance = currentPoint.distance ? (currentPoint.distance * 0.000621371).toFixed(2) : "0.00";
      const elevation = currentPoint.elevation ? Math.round(metersToFeet(currentPoint.elevation)) : 0;
      const speed = currentPoint.speed ? msToMph(currentPoint.speed).toFixed(1) : "0.0";

      const messages = [
        `LAT:${currentPoint.lat.toFixed(5)} LON:${currentPoint.lon.toFixed(5)}`,
        `DIST:${distance}mi ALT:${elevation}ft SPD:${speed}mph`,
      ];

      // Randomly choose message type for variety
      const types: ("info" | "data")[] = ["info", "data"];
      const type = types[Math.floor(Math.random() * types.length)];

      setLogEntries(prev => {
        const newEntries = [
          ...prev,
          { timestamp, message: messages[Math.floor(Math.random() * messages.length)], type }
        ];
        // Keep only last 50 entries
        return newEntries.slice(-50);
      });

      lastLogIndex.current = currentIndex;
    }
  }, [currentIndex, activityData]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logEntries]);

  const handlePlayPause = useCallback(() => {
    if (!activityData) return;

    if (currentIndex >= activityData.dataPoints.length - 1) {
      setCurrentIndex(0);
      lastLogIndex.current = -1;
    }

    lastUpdateRef.current = 0;
    setIsPlaying((prev) => !prev);

    // Add log entry
    setLogEntries(prev => [
      ...prev,
      {
        timestamp: formatTimeCode((activityData.dataPoints[currentIndex]?.timestamp || 0) / 1000),
        message: isPlaying ? "PLAYBACK PAUSED" : "PLAYBACK INITIATED",
        type: "system"
      }
    ]);
  }, [activityData, currentIndex, isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activityData) return;
    const value = parseFloat(e.target.value);
    const index = Math.round((value / 100) * (activityData.dataPoints.length - 1));
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

  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 1, 2, 4];
    const idx = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
  }, [playbackSpeed]);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  if (!activityData) {
    return (
      <div className="terminal-player bg-[#0D0D0D] rounded-lg p-6 font-mono">
        <div className="flex items-center justify-center py-12">
          <span className="text-[#00FF00] animate-pulse">INITIALIZING SATELLITE LINK...</span>
          <span className={`ml-1 ${showCursor ? "opacity-100" : "opacity-0"}`}>_</span>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-player font-mono text-sm">
      {/* Main Terminal Container */}
      <div className="bg-[#0D0D0D] rounded-lg overflow-hidden border border-[#00FF00]/30 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
        {/* Terminal Header */}
        <div className="bg-[#0D0D0D] border-b border-[#00FF00]/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <span className="text-[#00FF00]/70 text-xs">SUUNTO_REPLAY_STUDIO v2.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#FFB000]">[ {data.dateTime?.split("T")[0] || "UNKNOWN"} ]</span>
            <span className={`text-[#00FF00] ${isPlaying ? "animate-pulse" : ""}`}>
              {isPlaying ? "STREAMING" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* ASCII Art Header */}
        <div className="px-4 py-3 border-b border-[#00FF00]/20 text-[#00FF00]/50 text-xs hidden sm:block">
          <pre className="leading-none">{`
  _____ ____  ____    _____ _____ _____ ____
 / ____|  _ \\/ ___|  |  ___|  ___| ____|  _ \\
| |  __| |_) \\___ \\  | |_  | |_  |  _| | | | |
| | |_ |  __/ ___) | |  _| |  _| | |___| |_| |
|_____|_|   |____/  |_|   |_|   |_____|____/
          `.trim()}</pre>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Map Section (2 cols) */}
          <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-[#00FF00]/20">
            {/* Map Header */}
            <div className="px-4 py-2 border-b border-[#00FF00]/20 flex items-center justify-between">
              <span className="text-[#00FF00]">&gt; TERRAIN_VIEW</span>
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                  className="text-[#FFB000] hover:text-[#00FF00] transition-colors"
                >
                  [{cameraMode.toUpperCase()}]
                </button>
                <button
                  onClick={() => {
                    const modes: ColorMode[] = ["speed", "elevation"];
                    if (activityData.hasHeartRate) modes.splice(1, 0, "hr");
                    const idx = modes.indexOf(colorMode);
                    setColorMode(modes[(idx + 1) % modes.length]);
                  }}
                  className="text-[#FFB000] hover:text-[#00FF00] transition-colors uppercase"
                >
                  [{colorMode}]
                </button>
              </div>
            </div>

            {/* Map */}
            <div className="relative" style={{ height: "350px" }}>
              <TerminalMap
                ref={mapRef}
                dataPoints={activityData.dataPoints}
                currentIndex={currentIndex}
                bounds={activityData.bounds}
                colorMode={colorMode}
                cameraMode={cameraMode}
                hasHeartRate={activityData.hasHeartRate}
              />

              {/* Coordinate overlay */}
              <div className="absolute top-3 left-3 bg-[#0D0D0D]/90 px-3 py-2 text-[#00FF00] text-xs border border-[#00FF00]/30">
                <div>LAT: {currentPoint?.lat.toFixed(6) || "0.000000"}</div>
                <div>LON: {currentPoint?.lon.toFixed(6) || "0.000000"}</div>
              </div>
            </div>
          </div>

          {/* Data Panel (1 col) */}
          <div className="flex flex-col">
            {/* Stats Section */}
            <div className="px-4 py-3 border-b border-[#00FF00]/20">
              <div className="text-[#FFB000] mb-2">&gt; TELEMETRY_DATA</div>
              <div className="space-y-1 text-[#00FF00]">
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">DISTANCE:</span>
                  <span>{currentPoint?.distance ? (currentPoint.distance * 0.000621371).toFixed(2) : "0.00"} mi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">ELAPSED:</span>
                  <span>{formatTimeCode(currentTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">SPEED:</span>
                  <span>{currentPoint?.speed ? msToMph(currentPoint.speed).toFixed(1) : "0.0"} mph</span>
                </div>
                {currentPoint?.elevation !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[#00FF00]/60">ALTITUDE:</span>
                    <span>{Math.round(metersToFeet(currentPoint.elevation))} ft</span>
                  </div>
                )}
                {currentPoint?.hr !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[#FFB000]/60">HEART_RT:</span>
                    <span className="text-[#FFB000]">{currentPoint.hr} bpm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="px-4 py-3 border-b border-[#00FF00]/20">
              <div className="text-[#FFB000] mb-2">&gt; SESSION_STATS</div>
              <div className="space-y-1 text-[#00FF00] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">TOTAL_DIST:</span>
                  <span>{(activityData.summary.distance * 0.000621371).toFixed(2)} mi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">TOTAL_TIME:</span>
                  <span>{formatTimeCode(activityData.summary.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00FF00]/60">ELEV_GAIN:</span>
                  <span>+{Math.round(metersToFeet(activityData.summary.elevationGain))} ft</span>
                </div>
                {activityData.summary.avgHr && (
                  <div className="flex justify-between">
                    <span className="text-[#FFB000]/60">AVG_HR:</span>
                    <span className="text-[#FFB000]">{activityData.summary.avgHr} bpm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Data Log */}
            <div className="flex-1 px-4 py-3 min-h-[150px] max-h-[200px]">
              <div className="text-[#FFB000] mb-2">&gt; DATA_LOG</div>
              <div
                ref={logRef}
                className="h-[120px] overflow-y-auto text-xs space-y-0.5 terminal-scrollbar"
              >
                {logEntries.map((entry, i) => (
                  <div
                    key={i}
                    className={`${
                      entry.type === "system"
                        ? "text-[#FFB000]"
                        : entry.type === "warning"
                        ? "text-red-500"
                        : "text-[#00FF00]/70"
                    }`}
                  >
                    <span className="text-[#00FF00]/40">[{entry.timestamp}]</span> {entry.message}
                  </div>
                ))}
                <div className="text-[#00FF00]">
                  <span className="text-[#00FF00]/40">[{formatTimeCode(currentTime)}]</span>{" "}
                  <span className={showCursor ? "opacity-100" : "opacity-0"}>_</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-4 py-3 border-t border-[#00FF00]/20">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[#00FF00]/60 text-xs">{formatTimeCode(currentTime)}</span>
            <div className="flex-1 text-center">
              <span className="text-[#00FF00] tracking-wider">
                {generateProgressBar(progress, 40)}
              </span>
              <span className="text-[#FFB000] ml-2">{Math.round(progress)}%</span>
            </div>
            <span className="text-[#00FF00]/60 text-xs">{formatTimeCode(activityData.summary.duration)}</span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="text-[#00FF00] hover:text-[#FFB000] disabled:text-[#00FF00]/30 transition-colors p-2"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-12 h-12 border-2 border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00]/10 hover:text-[#FFB000] hover:border-[#FFB000] transition-colors flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </button>

            <button
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
              className="text-[#00FF00] hover:text-[#FFB000] disabled:text-[#00FF00]/30 transition-colors p-2"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="ml-4 border-l border-[#00FF00]/30 pl-4">
              <button
                onClick={cycleSpeed}
                className="text-[#FFB000] hover:text-[#00FF00] transition-colors text-sm"
              >
                [{playbackSpeed}x]
              </button>
            </div>
          </div>

          {/* Scrubber (hidden range input for accessibility) */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full mt-3 terminal-scrubber"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#00FF00]/20 flex items-center justify-between text-xs">
          <span className="text-[#00FF00]/40">SECURE CHANNEL ACTIVE</span>
          <span className="text-[#00FF00]/40">
            FRAME: {currentIndex}/{activityData.dataPoints.length - 1}
          </span>
        </div>
      </div>

      {/* Terminal Styles */}
      <style>{`
        .terminal-player {
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }

        .terminal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .terminal-scrollbar::-webkit-scrollbar-track {
          background: #0D0D0D;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb {
          background: #00FF00;
          opacity: 0.3;
        }

        .terminal-scrubber {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          height: 20px;
        }

        .terminal-scrubber::-webkit-slider-runnable-track {
          height: 4px;
          background: linear-gradient(to right, #00FF00 0%, #00FF00 var(--progress, 0%), #003300 var(--progress, 0%), #003300 100%);
          border-radius: 0;
        }

        .terminal-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #00FF00;
          border: 2px solid #0D0D0D;
          margin-top: -4px;
          cursor: pointer;
          box-shadow: 0 0 10px #00FF00;
        }

        .terminal-scrubber::-moz-range-track {
          height: 4px;
          background: #003300;
          border-radius: 0;
        }

        .terminal-scrubber::-moz-range-progress {
          background: #00FF00;
        }

        .terminal-scrubber::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #00FF00;
          border: 2px solid #0D0D0D;
          cursor: pointer;
          box-shadow: 0 0 10px #00FF00;
        }

        /* CRT scan line animation */
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .terminal-scanlines::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(
            transparent 0%,
            rgba(0, 255, 0, 0.02) 50%,
            transparent 100%
          );
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
