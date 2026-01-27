/**
 * Dashboard Player - Professional Analytics Multi-Panel View
 *
 * A Bloomberg terminal / mission control style activity player with:
 * - Multi-panel grid layout (2x2 or 3-column)
 * - Live stats panel with real-time updating numbers
 * - Map panel with route visualization
 * - Charts panel showing HR, Speed, and Elevation
 * - Summary panel with totals and lap data
 * - Compact integrated controls
 *
 * Color Palette:
 * - Slate gray background (#1e293b)
 * - Darker panels (#0f172a)
 * - Cyan accent (#06b6d4)
 * - Purple secondary (#8b5cf6)
 * - White text
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
  Activity,
  Gauge,
  Mountain,
  Timer,
  Flame,
  TrendingUp,
  Heart,
  Map,
} from "lucide-react";
import {
  parseActivityData,
  resampleDataPoints,
  formatDuration,
  metersToFeet,
  msToMph,
  type ActivityData,
} from "@/lib/activity-data-parser";
import type { SuuntoParseResult, SuuntoLap } from "@/lib/suunto-parser";
import { DashboardMap, type DashboardMapRef, type ColorMode } from "./DashboardMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface DashboardPlayerProps {
  data: SuuntoParseResult;
}

export function DashboardPlayer({ data }: DashboardPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<DashboardMapRef>(null);

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

  // Handle direct seek from charts
  const handleChartSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    lastUpdateRef.current = 0;
  }, []);

  // Handle segment highlighting from chart
  const handleHighlightSegment = useCallback((segment: { start: number; end: number } | null) => {
    setHighlightedSegment(segment);
    if (segment && mapRef.current) {
      mapRef.current.flyToSegment(segment.start, segment.end);
    }
  }, []);

  const currentPoint = activityData?.dataPoints[currentIndex] || null;
  const progress = activityData
    ? (currentIndex / (activityData.dataPoints.length - 1)) * 100
    : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  // Temperature from data
  const temperature = data.temperature?.avgCelsius;
  const tempFahrenheit = temperature !== undefined
    ? Math.round(temperature * 9/5 + 32)
    : undefined;

  // Format pace (min:sec per mile)
  const formatPace = (speedMs: number | undefined): string => {
    if (!speedMs || speedMs <= 0) return "--:--";
    const mph = msToMph(speedMs);
    const minPerMile = 60 / mph;
    const mins = Math.floor(minPerMile);
    const secs = Math.round((minPerMile - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activityData) {
    return (
      <div className="dashboard-player-loading">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-player">
      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        {/* Left Column - Map */}
        <div className="dashboard-panel dashboard-map-panel">
          <div className="panel-header">
            <Map className="w-4 h-4 text-cyan-400" />
            <span>Route Map</span>
          </div>
          <div className="panel-content map-container">
            <DashboardMap
              ref={mapRef}
              dataPoints={activityData.dataPoints}
              currentIndex={currentIndex}
              bounds={activityData.bounds}
              colorMode={colorMode}
              hasHeartRate={activityData.hasHeartRate}
              highlightedSegment={highlightedSegment}
            />
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="dashboard-right-column">
          {/* Live Stats Panel */}
          <div className="dashboard-panel dashboard-stats-panel">
            <div className="panel-header">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Live Metrics</span>
              <span className={`live-indicator ${isPlaying ? "active" : ""}`}>
                {isPlaying ? "LIVE" : "PAUSED"}
              </span>
            </div>
            <div className="panel-content">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Time</span>
                    <span className="stat-value">{formatDuration(currentTime)}</span>
                    <span className="stat-secondary">/ {formatDuration(activityData.summary.duration)}</span>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Distance</span>
                    <span className="stat-value">
                      {currentPoint?.distance
                        ? (currentPoint.distance * 0.000621371).toFixed(2)
                        : "0.00"}
                    </span>
                    <span className="stat-unit">mi</span>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon">
                    <Mountain className="w-4 h-4" />
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Elevation</span>
                    <span className="stat-value">
                      {currentPoint?.elevation !== undefined
                        ? Math.round(metersToFeet(currentPoint.elevation))
                        : "--"}
                    </span>
                    <span className="stat-unit">ft</span>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Speed</span>
                    <span className="stat-value">
                      {currentPoint?.speed !== undefined
                        ? msToMph(currentPoint.speed).toFixed(1)
                        : "--"}
                    </span>
                    <span className="stat-unit">mph</span>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon pace-icon">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="stat-content">
                    <span className="stat-label">Pace</span>
                    <span className="stat-value">{formatPace(currentPoint?.speed)}</span>
                    <span className="stat-unit">/mi</span>
                  </div>
                </div>

                {currentPoint?.hr !== undefined && (
                  <div className="stat-item hr-stat">
                    <div className="stat-icon">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div className="stat-content">
                      <span className="stat-label">Heart Rate</span>
                      <span className="stat-value text-red-400">{currentPoint.hr}</span>
                      <span className="stat-unit">bpm</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="dashboard-panel dashboard-summary-panel">
            <div className="panel-header">
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Activity Summary</span>
            </div>
            <div className="panel-content">
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Total Distance</span>
                  <span className="summary-value">{(activityData.summary.distance * 0.000621371).toFixed(2)} mi</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Time</span>
                  <span className="summary-value">{formatDuration(activityData.summary.duration)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Elevation Gain</span>
                  <span className="summary-value">{Math.round(metersToFeet(activityData.summary.elevationGain))} ft</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Avg Speed</span>
                  <span className="summary-value">{msToMph(activityData.summary.avgSpeed).toFixed(1)} mph</span>
                </div>
                {activityData.summary.avgHr && (
                  <div className="summary-item">
                    <span className="summary-label">Avg HR</span>
                    <span className="summary-value text-red-400">{activityData.summary.avgHr} bpm</span>
                  </div>
                )}
                {activityData.summary.calories && (
                  <div className="summary-item">
                    <span className="summary-label">Calories</span>
                    <span className="summary-value text-orange-400">{activityData.summary.calories} kcal</span>
                  </div>
                )}
                {tempFahrenheit !== undefined && (
                  <div className="summary-item">
                    <span className="summary-label">Temperature</span>
                    <span className="summary-value text-cyan-400">{tempFahrenheit}F</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lap Data Table (if available) */}
      {data.laps && data.laps.length > 0 && (
        <div className="dashboard-panel dashboard-laps-panel">
          <div className="panel-header">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Lap Splits</span>
          </div>
          <div className="panel-content">
            <div className="laps-table-container">
              <table className="laps-table">
                <thead>
                  <tr>
                    <th>Lap</th>
                    <th>Distance</th>
                    <th>Time</th>
                    <th>Pace</th>
                    {activityData.hasHeartRate && <th>Avg HR</th>}
                    <th>Elev +</th>
                  </tr>
                </thead>
                <tbody>
                  {data.laps.map((lap: SuuntoLap) => (
                    <tr key={lap.lapNumber}>
                      <td className="lap-number">{lap.lapNumber}</td>
                      <td>{lap.distanceMiles.toFixed(2)} mi</td>
                      <td>{formatDuration(lap.durationSeconds)}</td>
                      <td>{Math.floor(lap.paceMinPerMile)}:{String(Math.round((lap.paceMinPerMile % 1) * 60)).padStart(2, '0')}</td>
                      {activityData.hasHeartRate && (
                        <td className="hr-cell">{lap.avgHrBpm ?? "--"}</td>
                      )}
                      <td>{Math.round(metersToFeet(lap.ascentMeters))} ft</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Charts Panel */}
      <div className="dashboard-panel dashboard-charts-panel">
        <div className="panel-header">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Performance Charts</span>
          <div className="color-mode-selector">
            <Select
              value={colorMode}
              onValueChange={(val) => setColorMode(val as ColorMode)}
            >
              <SelectTrigger className="dashboard-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speed">Speed</SelectItem>
                {activityData.hasHeartRate && (
                  <SelectItem value="hr">Heart Rate</SelectItem>
                )}
                <SelectItem value="elevation">Elevation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="panel-content charts-container">
          <ActivityCharts
            dataPoints={activityData.dataPoints}
            currentIndex={currentIndex}
            hasHeartRate={activityData.hasHeartRate}
            hasCadence={activityData.hasCadence}
            hasSpeed={activityData.hasSpeed}
            onSeek={handleChartSeek}
            onHighlightSegment={handleHighlightSegment}
            duration={activityData.summary.duration}
          />
        </div>
      </div>

      {/* Controls Panel */}
      <div className="dashboard-panel dashboard-controls-panel">
        <div className="controls-row">
          {/* Progress Scrubber */}
          <div className="progress-section">
            <span className="time-display">{formatDuration(currentTime)}</span>
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="dashboard-slider"
            />
            <span className="time-display">{formatDuration(activityData.summary.duration)}</span>
          </div>

          {/* Playback Controls */}
          <div className="playback-controls">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
              className="dashboard-control-btn"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={handlePlayPause}
              className="dashboard-play-btn"
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
              className="dashboard-control-btn"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Select
              value={playbackSpeed.toString()}
              onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
            >
              <SelectTrigger className="dashboard-speed-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dashboard Styles */}
      <style>{`
        .dashboard-player {
          background: #1e293b;
          border-radius: 0.75rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dashboard-player-loading {
          background: #1e293b;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 1rem;
          min-height: 400px;
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-right-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dashboard-panel {
          background: #0f172a;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-bottom: 1px solid #334155;
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .panel-content {
          padding: 1rem;
        }

        /* Map Panel */
        .dashboard-map-panel .panel-content {
          padding: 0;
          height: 100%;
          min-height: 350px;
        }

        .map-container {
          height: 100%;
        }

        /* Stats Panel */
        .dashboard-stats-panel {
          flex: 1;
        }

        .live-indicator {
          margin-left: auto;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.625rem;
          font-weight: 700;
          background: #334155;
          color: #64748b;
        }

        .live-indicator.active {
          background: rgba(6, 182, 212, 0.2);
          color: #06b6d4;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .stat-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 0.375rem;
          border: 1px solid #334155;
        }

        .stat-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(6, 182, 212, 0.1);
          border-radius: 0.25rem;
          color: #06b6d4;
        }

        .hr-stat .stat-icon {
          background: rgba(248, 113, 113, 0.1);
          color: #f87171;
        }

        .pace-icon {
          background: rgba(139, 92, 246, 0.1) !important;
          color: #8b5cf6 !important;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .stat-label {
          font-size: 0.625rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: ui-monospace, monospace;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          line-height: 1.2;
        }

        .stat-secondary {
          font-size: 0.625rem;
          color: #64748b;
          font-family: ui-monospace, monospace;
        }

        .stat-unit {
          font-size: 0.625rem;
          color: #64748b;
        }

        /* Summary Panel */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.375rem 0;
          border-bottom: 1px solid #1e293b;
        }

        .summary-label {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .summary-value {
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
        }

        /* Laps Panel */
        .dashboard-laps-panel .panel-content {
          padding: 0;
        }

        .laps-table-container {
          max-height: 200px;
          overflow-y: auto;
        }

        .laps-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
        }

        .laps-table th {
          position: sticky;
          top: 0;
          background: #1e293b;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #334155;
        }

        .laps-table td {
          padding: 0.5rem 0.75rem;
          color: #e2e8f0;
          border-bottom: 1px solid #1e293b;
          font-family: ui-monospace, monospace;
        }

        .laps-table tr:hover td {
          background: rgba(6, 182, 212, 0.05);
        }

        .lap-number {
          color: #06b6d4;
          font-weight: 600;
        }

        .hr-cell {
          color: #f87171;
        }

        /* Charts Panel */
        .dashboard-charts-panel .panel-header {
          display: flex;
        }

        .color-mode-selector {
          margin-left: auto;
        }

        .dashboard-select {
          height: 1.75rem;
          min-width: 100px;
          background: #1e293b;
          border: 1px solid #334155;
          color: white;
          font-size: 0.75rem;
        }

        .charts-container {
          background: rgba(15, 23, 42, 0.5);
        }

        /* Controls Panel */
        .dashboard-controls-panel {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        }

        .dashboard-controls-panel .panel-content {
          padding: 0.75rem 1rem;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .progress-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .time-display {
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
          color: #94a3b8;
          min-width: 50px;
        }

        .dashboard-slider {
          flex: 1;
        }

        .dashboard-slider [data-slider-track] {
          background: #334155;
        }

        .dashboard-slider [data-slider-range] {
          background: linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%);
        }

        .dashboard-slider [data-slider-thumb] {
          background: white;
          border: 2px solid #06b6d4;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
        }

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dashboard-control-btn {
          color: #94a3b8;
          transition: color 0.2s;
        }

        .dashboard-control-btn:hover:not(:disabled) {
          color: white;
          background: rgba(6, 182, 212, 0.1);
        }

        .dashboard-control-btn:disabled {
          opacity: 0.3;
        }

        .dashboard-play-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 9999px;
          background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(6, 182, 212, 0.4);
          transition: all 0.2s;
        }

        .dashboard-play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 24px rgba(6, 182, 212, 0.6);
        }

        .dashboard-speed-select {
          width: 70px;
          height: 2rem;
          background: #1e293b;
          border: 1px solid #334155;
          color: white;
          font-size: 0.75rem;
        }

        /* Override chart styles for dark theme */
        .dashboard-charts-panel .bg-muted\\/30 {
          background: rgba(30, 41, 59, 0.5) !important;
        }

        .text-red-400 {
          color: #f87171;
        }

        .text-orange-400 {
          color: #fb923c;
        }

        .text-cyan-400 {
          color: #22d3ee;
        }
      `}</style>
    </div>
  );
}
