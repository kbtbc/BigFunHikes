/**
 * Strava Player - Athletic/Performance-Focused Design
 *
 * Design philosophy: Mimics Strava's activity card style with emphasis on
 * performance metrics, segments/splits, and motivating data visualization.
 *
 * Color Palette:
 * - White background (#FFFFFF)
 * - Strava orange (#FC4C02) as primary accent
 * - Dark gray text (#242428)
 * - Secondary grays for labels
 *
 * Features:
 * - Activity feed card style
 * - Prominent athlete stats (moving time, distance, elevation)
 * - Pace/speed chart
 * - Heart rate zones bar
 * - Per-mile splits table
 * - Effort-colored route on map
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  TrendingUp,
  Clock,
  Mountain,
  Footprints,
  Flame,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
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
import { StravaMap, type StravaMapRef } from "./StravaMap";

interface StravaPlayerProps {
  data: SuuntoParseResult;
}

// HR Zone definitions (standard 5-zone model)
interface HRZone {
  name: string;
  color: string;
  minPercent: number;
  maxPercent: number;
}

const HR_ZONES: HRZone[] = [
  { name: "Recovery", color: "#94a3b8", minPercent: 0, maxPercent: 60 },
  { name: "Endurance", color: "#22c55e", minPercent: 60, maxPercent: 70 },
  { name: "Tempo", color: "#eab308", minPercent: 70, maxPercent: 80 },
  { name: "Threshold", color: "#f97316", minPercent: 80, maxPercent: 90 },
  { name: "VO2 Max", color: "#ef4444", minPercent: 90, maxPercent: 100 },
];

// Split/Lap data
interface Split {
  mile: number;
  time: number;
  pace: string;
  elevationGain: number;
  elevationLoss: number;
  avgHr?: number;
  avgSpeed: number;
}

// Calculate pace from speed (m/s)
function speedToPace(speedMs: number): string {
  if (speedMs <= 0) return "--:--";
  const mph = msToMph(speedMs);
  if (mph <= 0) return "--:--";
  const minPerMile = 60 / mph;
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Calculate splits from data points
function calculateSplits(dataPoints: ActivityDataPoint[]): Split[] {
  if (dataPoints.length < 2) return [];

  const splits: Split[] = [];
  const mileInMeters = 1609.34;

  let currentMile = 1;
  let mileStartIndex = 0;
  let mileStartTime = 0;
  let mileElevationGain = 0;
  let mileElevationLoss = 0;
  let mileHrSum = 0;
  let mileHrCount = 0;
  let mileSpeedSum = 0;
  let mileSpeedCount = 0;

  for (let i = 1; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    const prevPoint = dataPoints[i - 1];
    const distanceInMiles = (point.distance ?? 0) / mileInMeters;

    // Track elevation changes
    if (point.elevation !== undefined && prevPoint.elevation !== undefined) {
      const eleDiff = point.elevation - prevPoint.elevation;
      if (eleDiff > 0) mileElevationGain += eleDiff;
      else mileElevationLoss += Math.abs(eleDiff);
    }

    // Track HR
    if (point.hr !== undefined) {
      mileHrSum += point.hr;
      mileHrCount++;
    }

    // Track speed
    if (point.speed !== undefined) {
      mileSpeedSum += point.speed;
      mileSpeedCount++;
    }

    // Check if we've completed a mile
    if (distanceInMiles >= currentMile) {
      const mileTime = (point.timestamp - mileStartTime) / 1000;
      const avgSpeed = mileSpeedCount > 0 ? mileSpeedSum / mileSpeedCount : 0;

      splits.push({
        mile: currentMile,
        time: mileTime,
        pace: speedToPace(avgSpeed),
        elevationGain: Math.round(metersToFeet(mileElevationGain)),
        elevationLoss: Math.round(metersToFeet(mileElevationLoss)),
        avgHr: mileHrCount > 0 ? Math.round(mileHrSum / mileHrCount) : undefined,
        avgSpeed,
      });

      // Reset for next mile
      currentMile++;
      mileStartIndex = i;
      mileStartTime = point.timestamp;
      mileElevationGain = 0;
      mileElevationLoss = 0;
      mileHrSum = 0;
      mileHrCount = 0;
      mileSpeedSum = 0;
      mileSpeedCount = 0;
    }
  }

  return splits;
}

// Calculate HR zone distribution
function calculateHRZoneDistribution(
  dataPoints: ActivityDataPoint[],
  maxHr: number
): { zone: HRZone; percentage: number; duration: number }[] {
  if (!maxHr || maxHr <= 0) return [];

  const zoneDurations = new Array(HR_ZONES.length).fill(0);
  let totalTime = 0;

  for (let i = 1; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    const prevPoint = dataPoints[i - 1];

    if (point.hr !== undefined && point.hr > 0) {
      const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000;
      const hrPercent = (point.hr / maxHr) * 100;

      for (let z = HR_ZONES.length - 1; z >= 0; z--) {
        if (hrPercent >= HR_ZONES[z].minPercent) {
          zoneDurations[z] += timeDiff;
          totalTime += timeDiff;
          break;
        }
      }
    }
  }

  if (totalTime === 0) return [];

  return HR_ZONES.map((zone, i) => ({
    zone,
    percentage: (zoneDurations[i] / totalTime) * 100,
    duration: zoneDurations[i],
  }));
}

export function StravaPlayer({ data }: StravaPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSplits, setShowSplits] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<StravaMapRef>(null);

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

  // Calculate splits
  const splits = useMemo(() => {
    if (!activityData) return [];
    return calculateSplits(activityData.dataPoints);
  }, [activityData]);

  // Calculate HR zone distribution
  const hrZones = useMemo(() => {
    if (!activityData || !activityData.hasHeartRate) return [];
    const maxHr = data.heartRate?.maxBpm || 180;
    return calculateHRZoneDistribution(activityData.dataPoints, maxHr);
  }, [activityData, data.heartRate]);

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

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!activityData) return;
      const index = Math.round(
        (value[0] / 100) * (activityData.dataPoints.length - 1)
      );
      setCurrentIndex(index);
      lastUpdateRef.current = 0;
    },
    [activityData]
  );

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
  const currentTime = currentPoint?.timestamp
    ? currentPoint.timestamp / 1000
    : 0;

  // Get best split
  const bestSplit = useMemo(() => {
    if (splits.length === 0) return null;
    return splits.reduce((best, split) =>
      split.avgSpeed > best.avgSpeed ? split : best
    );
  }, [splits]);

  if (!activityData) {
    return (
      <Card className="strava-card p-8 bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange" />
        </div>
      </Card>
    );
  }

  return (
    <div className="strava-player space-y-4">
      {/* Activity Card Header - Like a Strava feed item */}
      <Card className="strava-card bg-white border border-gray-200 shadow-sm overflow-hidden">
        {/* Stats Header */}
        <div className="p-6 border-b border-gray-100">
          {/* Activity Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-strava-orange to-orange-600 flex items-center justify-center">
                <Footprints className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-strava-dark">
                  Trail Activity
                </h2>
                <p className="text-sm text-gray-500">
                  {new Date(data.dateTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            {bestSplit && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-strava-orange/10 rounded-full">
                <Award className="h-4 w-4 text-strava-orange" />
                <span className="text-sm font-semibold text-strava-orange">
                  Best Mile: {bestSplit.pace}
                </span>
              </div>
            )}
          </div>

          {/* Big Stats Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Distance */}
            <div className="text-center">
              <p className="text-4xl font-bold text-strava-dark tabular-nums">
                {currentPoint?.distance
                  ? (currentPoint.distance * 0.000621371).toFixed(2)
                  : "0.00"}
              </p>
              <p className="text-sm text-gray-500 font-medium">Miles</p>
            </div>

            {/* Moving Time */}
            <div className="text-center border-l border-r border-gray-100">
              <p className="text-4xl font-bold text-strava-dark tabular-nums">
                {formatDuration(currentTime)}
              </p>
              <p className="text-sm text-gray-500 font-medium">Moving Time</p>
            </div>

            {/* Elevation */}
            <div className="text-center">
              <p className="text-4xl font-bold text-strava-dark tabular-nums">
                {Math.round(
                  metersToFeet(activityData.summary.elevationGain)
                ).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 font-medium">Elev Gain (ft)</p>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-around text-sm">
            {/* Pace */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Pace</span>
              <span className="font-bold text-strava-dark">
                {currentPoint?.speed ? speedToPace(currentPoint.speed) : "--:--"}
                <span className="font-normal text-gray-500">/mi</span>
              </span>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Speed</span>
              <span className="font-bold text-strava-dark">
                {currentPoint?.speed
                  ? msToMph(currentPoint.speed).toFixed(1)
                  : "0.0"}{" "}
                <span className="font-normal text-gray-500">mph</span>
              </span>
            </div>

            {/* HR */}
            {currentPoint?.hr !== undefined && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">HR</span>
                <span className="font-bold text-strava-dark">
                  {currentPoint.hr}{" "}
                  <span className="font-normal text-gray-500">bpm</span>
                </span>
              </div>
            )}

            {/* Elevation */}
            {currentPoint?.elevation !== undefined && (
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Elev</span>
                <span className="font-bold text-strava-dark">
                  {Math.round(metersToFeet(currentPoint.elevation)).toLocaleString()}{" "}
                  <span className="font-normal text-gray-500">ft</span>
                </span>
              </div>
            )}

            {/* Calories */}
            {data.caloriesBurned > 0 && (
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">Calories</span>
                <span className="font-bold text-strava-dark">
                  {data.caloriesBurned.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* HR Zones Bar */}
        {hrZones.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-strava-dark">
                Heart Rate Zones
              </span>
            </div>
            <div className="flex h-6 rounded-md overflow-hidden">
              {hrZones.map(({ zone, percentage }, i) =>
                percentage > 0 ? (
                  <div
                    key={i}
                    className="flex items-center justify-center text-xs font-bold text-white transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: zone.color,
                      minWidth: percentage > 5 ? "auto" : "0",
                    }}
                  >
                    {percentage > 8 ? `${Math.round(percentage)}%` : ""}
                  </div>
                ) : null
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {HR_ZONES.map((zone, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span>{zone.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="relative" style={{ height: "280px" }}>
          <StravaMap
            ref={mapRef}
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            bounds={activityData.bounds}
            hasHeartRate={activityData.hasHeartRate}
          />
        </div>

        {/* Progress & Controls */}
        <div className="p-4 border-t border-gray-100">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-500 tabular-nums w-14">
              {formatDuration(currentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="strava-slider"
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums w-14 text-right">
              {formatDuration(activityData.summary.duration)}
            </span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="p-2 text-gray-400 hover:text-strava-dark disabled:opacity-30 transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-strava-orange hover:bg-strava-orange-dark text-white flex items-center justify-center transition-colors shadow-md"
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
              className="p-2 text-gray-400 hover:text-strava-dark disabled:opacity-30 transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Speed Selector */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-strava-dark border border-gray-200 rounded-full transition-colors"
              >
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[60px] z-10">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-4 py-1.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                        playbackSpeed === speed
                          ? "text-strava-orange font-bold"
                          : "text-gray-600"
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
      </Card>

      {/* Splits Table */}
      {splits.length > 0 && (
        <Card className="strava-card bg-white border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSplits(!showSplits)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-strava-orange" />
              <span className="font-bold text-strava-dark">
                Mile Splits ({splits.length})
              </span>
            </div>
            {showSplits ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showSplits && (
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">Mile</th>
                    <th className="px-4 py-3 text-right font-semibold">Pace</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Elev Gain
                    </th>
                    {activityData.hasHeartRate && (
                      <th className="px-4 py-3 text-right font-semibold">
                        Avg HR
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {splits.map((split, i) => {
                    const isBest = bestSplit?.mile === split.mile;
                    return (
                      <tr
                        key={i}
                        className={`border-t border-gray-50 ${
                          isBest ? "bg-strava-orange/5" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-strava-dark">
                          <div className="flex items-center gap-2">
                            <span>{split.mile}</span>
                            {isBest && (
                              <Award className="h-4 w-4 text-strava-orange" />
                            )}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold tabular-nums ${
                            isBest ? "text-strava-orange" : "text-strava-dark"
                          }`}
                        >
                          {split.pace}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                          <span className="text-green-600">
                            +{split.elevationGain}
                          </span>
                          {split.elevationLoss > 0 && (
                            <span className="text-red-500 ml-1">
                              -{split.elevationLoss}
                            </span>
                          )}
                        </td>
                        {activityData.hasHeartRate && (
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                            {split.avgHr || "--"}{" "}
                            <span className="text-gray-400">bpm</span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Strava-style CSS */}
      <style>{`
        .strava-player {
          --strava-orange: #FC4C02;
          --strava-orange-dark: #e04402;
          --strava-dark: #242428;
        }

        .strava-card {
          border-radius: 8px;
        }

        .text-strava-orange {
          color: var(--strava-orange);
        }

        .text-strava-dark {
          color: var(--strava-dark);
        }

        .bg-strava-orange {
          background-color: var(--strava-orange);
        }

        .bg-strava-orange-dark {
          background-color: var(--strava-orange-dark);
        }

        .hover\\:bg-strava-orange-dark:hover {
          background-color: var(--strava-orange-dark);
        }

        .border-strava-orange {
          border-color: var(--strava-orange);
        }

        .from-strava-orange {
          --tw-gradient-from: var(--strava-orange);
        }

        .bg-strava-orange\\/5 {
          background-color: rgba(252, 76, 2, 0.05);
        }

        .bg-strava-orange\\/10 {
          background-color: rgba(252, 76, 2, 0.1);
        }

        .strava-slider [data-slot="track"] {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
        }

        .strava-slider [data-slot="range"] {
          background: var(--strava-orange);
          border-radius: 2px;
        }

        .strava-slider [data-slot="thumb"] {
          width: 14px;
          height: 14px;
          background: var(--strava-orange);
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }

        .strava-slider [data-slot="thumb"]:hover {
          transform: scale(1.15);
        }

        .strava-slider [data-slot="thumb"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(252, 76, 2, 0.2), 0 1px 3px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
