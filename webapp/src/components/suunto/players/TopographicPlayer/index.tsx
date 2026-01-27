/**
 * Topographic Player - USGS Topo Map / Cartography Inspired Design
 *
 * Design philosophy: Expedition map aesthetic, wilderness-focused, cartographic elements
 * Color Palette: Cream paper (#F5E6D3) + Contour browns (#8B6914) + Forest greens (#2D5016) + Water blues (#4A90A4)
 *
 * Key features:
 * - Large prominent map (hero element)
 * - Stats displayed as map legend
 * - Compass rose decoration
 * - Prominent elevation profile
 * - Coordinates in degrees/minutes/seconds
 * - Paper/parchment texture
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mountain,
  Footprints,
  Clock,
  TrendingUp,
  Heart,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult } from "@/lib/suunto-parser";
import { TopographicMap, type TopographicMapRef, type CameraMode, type ColorMode } from "./TopographicMap";

interface TopographicPlayerProps {
  data: SuuntoParseResult;
}

// Convert decimal degrees to DMS format
function toDMS(decimal: number, isLat: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);

  const direction = isLat
    ? decimal >= 0 ? "N" : "S"
    : decimal >= 0 ? "E" : "W";

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function TopographicPlayer({ data }: TopographicPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("elevation");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const isSelecting = useRef(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<TopographicMapRef>(null);

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

  // Elevation chart data
  const chartData = useMemo(() => {
    if (!activityData) return [];

    const sampleRate = Math.max(1, Math.floor(activityData.dataPoints.length / 150));
    const result: Array<{
      index: number;
      time: number;
      timeLabel: string;
      elevationFt: number;
      distanceMi: number;
    }> = [];

    for (let i = 0; i < activityData.dataPoints.length; i += sampleRate) {
      const point = activityData.dataPoints[i];
      result.push({
        index: i,
        time: point.timestamp / 1000,
        timeLabel: formatDuration(point.timestamp / 1000),
        elevationFt: point.elevation !== undefined ? metersToFeet(point.elevation) : 0,
        distanceMi: point.distance !== undefined ? point.distance * 0.000621371 : 0,
      });
    }

    return result;
  }, [activityData]);

  // Chart interaction handlers
  const handleChartClick = useCallback(
    (chartDataPayload: { activePayload?: Array<{ payload: { index: number } }> }) => {
      if (chartDataPayload.activePayload?.[0]?.payload) {
        const clickedIndex = chartDataPayload.activePayload[0].payload.index;
        setCurrentIndex(clickedIndex);
        lastUpdateRef.current = 0;
      }
    },
    []
  );

  const handleMouseDown = useCallback(
    (chartDataPayload: { activePayload?: Array<{ payload: { timeLabel: string } }> }) => {
      if (chartDataPayload.activePayload?.[0]?.payload) {
        isSelecting.current = true;
        setSelectionStart(chartDataPayload.activePayload[0].payload.timeLabel);
        setSelectionEnd(null);
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (chartDataPayload: { activePayload?: Array<{ payload: { timeLabel: string } }> }) => {
      if (isSelecting.current && chartDataPayload.activePayload?.[0]?.payload) {
        setSelectionEnd(chartDataPayload.activePayload[0].payload.timeLabel);
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && selectionStart && selectionEnd) {
      const startData = chartData.find((d) => d.timeLabel === selectionStart);
      const endData = chartData.find((d) => d.timeLabel === selectionEnd);

      if (startData && endData) {
        const startIdx = Math.min(startData.index, endData.index);
        const endIdx = Math.max(startData.index, endData.index);
        setHighlightedSegment({ start: startIdx, end: endIdx });
        mapRef.current?.flyToSegment(startIdx, endIdx);
      }
    }
    isSelecting.current = false;
  }, [selectionStart, selectionEnd, chartData]);

  const handleDoubleClick = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setHighlightedSegment(null);
  }, []);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  if (!activityData) {
    return (
      <div className="topo-player bg-[#F5E6D3] rounded-lg p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B6914] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="topo-player space-y-4">
      {/* Main Layout - Map as Hero */}
      <div
        className="relative overflow-hidden rounded-lg border-2 border-[#8B6914]"
        style={{
          background: "linear-gradient(135deg, #F5E6D3 0%, #EDD9BC 100%)",
        }}
      >
        {/* Decorative Title Banner */}
        <div className="relative px-6 py-3 border-b border-[#8B6914]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[#2D5016]">
                <Mountain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif tracking-wide text-[#2D5016]">
                  Trail Survey Map
                </h2>
                <p className="text-xs text-[#8B6914] font-mono">
                  {new Date(data.dateTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Compass Rose */}
            <div className="w-16 h-16 relative">
              <svg viewBox="0 0 64 64" className="w-full h-full">
                {/* Outer ring */}
                <circle cx="32" cy="32" r="28" fill="none" stroke="#8B6914" strokeWidth="1" opacity="0.5" />
                <circle cx="32" cy="32" r="24" fill="none" stroke="#8B6914" strokeWidth="0.5" opacity="0.3" />

                {/* Cardinal directions */}
                <polygon points="32,6 35,18 32,14 29,18" fill="#8B2500" />
                <polygon points="32,58 35,46 32,50 29,46" fill="#2D5016" />
                <polygon points="6,32 18,29 14,32 18,35" fill="#2D5016" />
                <polygon points="58,32 46,29 50,32 46,35" fill="#2D5016" />

                {/* Inter-cardinal lines */}
                <line x1="12" y1="12" x2="20" y2="20" stroke="#8B6914" strokeWidth="0.5" opacity="0.5" />
                <line x1="52" y1="12" x2="44" y2="20" stroke="#8B6914" strokeWidth="0.5" opacity="0.5" />
                <line x1="12" y1="52" x2="20" y2="44" stroke="#8B6914" strokeWidth="0.5" opacity="0.5" />
                <line x1="52" y1="52" x2="44" y2="44" stroke="#8B6914" strokeWidth="0.5" opacity="0.5" />

                {/* Center */}
                <circle cx="32" cy="32" r="3" fill="#8B6914" />

                {/* Direction labels */}
                <text x="32" y="5" textAnchor="middle" fontSize="6" fill="#8B2500" fontWeight="bold">N</text>
                <text x="32" y="62" textAnchor="middle" fontSize="5" fill="#2D5016">S</text>
                <text x="61" y="33" textAnchor="middle" fontSize="5" fill="#2D5016">E</text>
                <text x="4" y="33" textAnchor="middle" fontSize="5" fill="#2D5016">W</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Map - Large and Prominent */}
        <div className="relative" style={{ height: "500px" }}>
          <TopographicMap
            ref={mapRef}
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            bounds={activityData.bounds}
            colorMode={colorMode}
            cameraMode={cameraMode}
            hasHeartRate={activityData.hasHeartRate}
            highlightedSegment={highlightedSegment}
          />

          {/* Map Controls Overlay - Styled as legend */}
          <div className="absolute bottom-4 left-4 bg-[#F5E6D3]/95 backdrop-blur-sm border border-[#8B6914] rounded px-3 py-2 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#8B6914] font-semibold border-b border-[#8B6914]/30 pb-1">
              View Options
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCameraMode(cameraMode === "follow" ? "overview" : "follow")}
                className={`px-2 py-1 text-xs rounded border ${
                  cameraMode === "follow"
                    ? "bg-[#2D5016] text-white border-[#2D5016]"
                    : "bg-transparent text-[#2D5016] border-[#2D5016]/50"
                }`}
              >
                {cameraMode === "follow" ? "Following" : "Overview"}
              </button>
              <button
                onClick={() => {
                  const modes: ColorMode[] = ["elevation", "speed"];
                  if (activityData.hasHeartRate) modes.push("hr");
                  const idx = modes.indexOf(colorMode);
                  setColorMode(modes[(idx + 1) % modes.length]);
                }}
                className="px-2 py-1 text-xs rounded border border-[#8B6914]/50 text-[#8B6914] capitalize"
              >
                {colorMode === "hr" ? "HR" : colorMode}
              </button>
            </div>
          </div>

          {/* Current Coordinates Display */}
          {currentPoint && (
            <div className="absolute top-4 left-4 bg-[#F5E6D3]/95 backdrop-blur-sm border border-[#8B6914] rounded px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[#8B6914] font-semibold mb-1">
                Current Position
              </p>
              <p className="text-xs font-mono text-[#2D5016]">
                {toDMS(currentPoint.lat, true)}
              </p>
              <p className="text-xs font-mono text-[#2D5016]">
                {toDMS(currentPoint.lon, false)}
              </p>
              {currentPoint.elevation !== undefined && (
                <p className="text-xs font-mono text-[#4A90A4] mt-1">
                  Elev: {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()} ft
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legend Style Stats Panel */}
        <div className="px-6 py-4 border-t border-[#8B6914]/30">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Distance */}
            <div className="topo-stat">
              <div className="flex items-center gap-1.5 mb-1">
                <Footprints className="w-3.5 h-3.5 text-[#8B6914]" />
                <span className="topo-stat-label">Distance</span>
              </div>
              <span className="topo-stat-value">
                {currentPoint?.distance
                  ? (currentPoint.distance * 0.000621371).toFixed(2)
                  : "0.00"}{" "}
                <span className="topo-stat-unit">mi</span>
              </span>
            </div>

            {/* Time */}
            <div className="topo-stat">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#8B6914]" />
                <span className="topo-stat-label">Time</span>
              </div>
              <span className="topo-stat-value tabular-nums">
                {formatDuration(currentTime)}
              </span>
            </div>

            {/* Elevation */}
            {currentPoint?.elevation !== undefined && (
              <div className="topo-stat">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mountain className="w-3.5 h-3.5 text-[#8B6914]" />
                  <span className="topo-stat-label">Elevation</span>
                </div>
                <span className="topo-stat-value">
                  {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}{" "}
                  <span className="topo-stat-unit">ft</span>
                </span>
              </div>
            )}

            {/* Elevation Gain */}
            <div className="topo-stat">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#8B6914]" />
                <span className="topo-stat-label">Ascent</span>
              </div>
              <span className="topo-stat-value">
                {Math.round(metersToFeet(activityData.summary.elevationGain)).toLocaleString()}{" "}
                <span className="topo-stat-unit">ft</span>
              </span>
            </div>

            {/* Heart Rate or Speed */}
            {currentPoint?.hr !== undefined ? (
              <div className="topo-stat">
                <div className="flex items-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-[#8B2500]" />
                  <span className="topo-stat-label">Heart Rate</span>
                </div>
                <span className="topo-stat-value text-[#8B2500]">
                  {currentPoint.hr}{" "}
                  <span className="topo-stat-unit">bpm</span>
                </span>
              </div>
            ) : currentPoint?.speed !== undefined ? (
              <div className="topo-stat">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="topo-stat-label">Speed</span>
                </div>
                <span className="topo-stat-value">
                  {msToMph(currentPoint.speed).toFixed(1)}{" "}
                  <span className="topo-stat-unit">mph</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Elevation Profile - Prominent Feature */}
        <div className="px-6 pb-4">
          <div className="bg-[#FDF8F0] border border-[#8B6914]/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-serif tracking-wide text-[#2D5016]">
                Elevation Profile
              </h3>
              <p className="text-xs text-[#8B6914] font-mono">
                Min: {Math.round(metersToFeet(activityData.bounds.south)).toLocaleString()} ft
                {" / "}
                Max: {Math.round(metersToFeet(activityData.bounds.north)).toLocaleString()} ft
              </p>
            </div>

            <div className="text-[10px] text-[#8B6914]/70 text-center mb-1">
              Click and drag to highlight segment. Double-click to clear.
            </div>

            <ResponsiveContainer width="100%" height={120}>
              <AreaChart
                data={chartData}
                onClick={handleChartClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                style={{ cursor: "pointer" }}
              >
                <defs>
                  <linearGradient id="topoElevationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D5016" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#4a7c59" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8B6914" stopOpacity={0.2} />
                  </linearGradient>
                  {/* Contour pattern */}
                  <pattern id="contourPattern" patternUnits="userSpaceOnUse" width="10" height="10">
                    <line x1="0" y1="5" x2="10" y2="5" stroke="#8B6914" strokeWidth="0.5" opacity="0.2" />
                  </pattern>
                </defs>
                <XAxis
                  dataKey="distanceMi"
                  tickFormatter={(val) => `${val.toFixed(1)}`}
                  tick={{ fontSize: 10, fill: "#8B6914" }}
                  axisLine={{ stroke: "#8B6914", strokeWidth: 0.5 }}
                  tickLine={{ stroke: "#8B6914", strokeWidth: 0.5 }}
                  label={{ value: "Distance (mi)", position: "bottom", fontSize: 10, fill: "#8B6914", dy: -5 }}
                />
                <YAxis
                  tickFormatter={(val) => `${Math.round(val)}`}
                  tick={{ fontSize: 10, fill: "#8B6914" }}
                  axisLine={{ stroke: "#8B6914", strokeWidth: 0.5 }}
                  tickLine={{ stroke: "#8B6914", strokeWidth: 0.5 }}
                  domain={["dataMin - 100", "dataMax + 100"]}
                  width={45}
                  label={{ value: "ft", position: "top", fontSize: 10, fill: "#8B6914", dx: 15 }}
                />
                {selectionStart && selectionEnd && (
                  <ReferenceArea
                    x1={selectionStart}
                    x2={selectionEnd}
                    fill="#4A90A4"
                    fillOpacity={0.3}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="elevationFt"
                  stroke="#2D5016"
                  strokeWidth={2}
                  fill="url(#topoElevationGradient)"
                />
                {/* Current position marker */}
                <ReferenceLine
                  x={chartData.find((d) => d.time >= currentTime)?.timeLabel}
                  stroke="#8B2500"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Scale Bar */}
            <div className="flex items-center justify-end mt-2 gap-2">
              <div className="flex items-center">
                <div className="w-16 h-1 bg-gradient-to-r from-[#8B6914] via-white to-[#8B6914]" />
              </div>
              <span className="text-[10px] text-[#8B6914] font-mono">
                1 mile
              </span>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="px-6 pb-6">
          {/* Progress Scrubber */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-[#8B6914] tabular-nums w-14 font-mono">
              {formatDuration(currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="topo-slider"
              />
            </div>
            <span className="text-xs text-[#8B6914] tabular-nums w-14 text-right font-mono">
              {formatDuration(activityData.summary.duration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="p-2 text-[#8B6914] hover:text-[#2D5016] disabled:opacity-30 transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md"
              style={{
                background: "linear-gradient(135deg, #2D5016 0%, #4a7c59 100%)",
                border: "2px solid #1a3a0c",
              }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
              className="p-2 text-[#8B6914] hover:text-[#2D5016] disabled:opacity-30 transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Speed Selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#8B6914] hover:text-[#2D5016] border border-[#8B6914]/30 rounded transition-colors"
              >
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#F5E6D3] border border-[#8B6914] rounded shadow-lg py-1 min-w-[60px] z-50">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-sm text-left hover:bg-[#EDD9BC] transition-colors ${
                        playbackSpeed === speed ? "text-[#2D5016] font-semibold" : "text-[#8B6914]"
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

        {/* Footer Attribution */}
        <div className="px-6 pb-3 border-t border-[#8B6914]/20">
          <div className="flex items-center justify-between text-[10px] text-[#8B6914]/60 font-mono pt-2">
            <span>Suunto Replay Studio</span>
            <span>Topographic Survey</span>
            <span>
              Total: {activityData.summary.distance
                ? (activityData.summary.distance * 0.000621371).toFixed(2)
                : "0.00"} mi
            </span>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .topo-player {
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .topo-stat {
          padding: 0.5rem;
          border-left: 2px solid #8B6914;
          background: linear-gradient(90deg, rgba(139, 105, 20, 0.05) 0%, transparent 100%);
        }

        .topo-stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8B6914;
          font-family: system-ui, sans-serif;
        }

        .topo-stat-value {
          font-size: 1.25rem;
          font-weight: 500;
          color: #2D5016;
          font-family: 'Georgia', serif;
        }

        .topo-stat-unit {
          font-size: 0.75rem;
          color: #8B6914;
          font-weight: normal;
        }

        .topo-slider [data-slot="track"] {
          height: 4px;
          background: linear-gradient(90deg, #8B6914 0%, #D4B896 100%);
          border-radius: 2px;
        }

        .topo-slider [data-slot="range"] {
          background: #2D5016;
          border-radius: 2px;
        }

        .topo-slider [data-slot="thumb"] {
          width: 16px;
          height: 16px;
          background: #F5E6D3;
          border: 2px solid #2D5016;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }

        .topo-slider [data-slot="thumb"]:hover {
          transform: scale(1.1);
        }

        .topo-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.2), 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
