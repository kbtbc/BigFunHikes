/**
 * Command Player - Military Tactical Operations Center Style
 *
 * Design philosophy: Military command center aesthetic with tactical displays
 * Color Palette: Military olive (#556b2f), Warning amber (#ffa500), Alert red (#ff4444), Tactical gray (#2d2d2d)
 *
 * Features:
 * - Grid-based tactical display
 * - Stencil/military typography (bold, condensed)
 * - Status indicators with military terminology (ACTIVE, STANDBY, MISSION TIME)
 * - Coordinate grid overlay on map
 * - Mission briefing style stats (OBJECTIVE, DISTANCE TO TARGET, ELAPSED)
 * - Radar sweep animation effect
 * - Full 3D terrain with sky atmosphere
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mountain,
  Target,
  Radio,
  Shield,
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
import { CommandMap, type CommandMapRef, type CameraMode, type MapStyle, type ColorMode } from "./CommandMap";

interface CommandPlayerProps {
  data: SuuntoParseResult;
}

// Format coordinates in military grid format
function formatMilitaryCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}${latDir} ${Math.abs(lon).toFixed(4)}${lonDir}`;
}

// Format time in military 24hr format
function formatMissionTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Status indicator component
function StatusIndicator({ status, label }: { status: "active" | "standby" | "alert"; label: string }) {
  const colors = {
    active: "bg-green-500",
    standby: "bg-amber-500",
    alert: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]} ${status === "active" ? "animate-pulse" : ""}`} />
      <span className="command-status-text">{label}</span>
    </div>
  );
}

export function CommandPlayer({ data }: CommandPlayerProps) {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("speed");
  const [terrain3D, setTerrain3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [highlightedSegment, setHighlightedSegment] = useState<{ start: number; end: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const mapRef = useRef<CommandMapRef>(null);

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

  const cycleCameraMode = useCallback(() => {
    const modes: CameraMode[] = ["follow", "overview", "firstPerson"];
    const idx = modes.indexOf(cameraMode);
    setCameraMode(modes[(idx + 1) % modes.length]);
  }, [cameraMode]);

  const cycleColorMode = useCallback(() => {
    const modes: ColorMode[] = ["speed", "elevation"];
    if (activityData?.hasHeartRate) modes.splice(1, 0, "hr");
    const idx = modes.indexOf(colorMode);
    setColorMode(modes[(idx + 1) % modes.length]);
  }, [colorMode, activityData?.hasHeartRate]);

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

  // Calculate distance remaining
  const totalDistance = activityData?.summary.distance || 0;
  const currentDistance = currentPoint?.distance || 0;
  const remainingDistance = totalDistance - currentDistance;

  if (!activityData) {
    return (
      <div className="command-player-loading">
        <div className="command-loading-content">
          <div className="command-loading-spinner" />
          <div className="command-loading-text">
            <span className="command-loading-main">ESTABLISHING UPLINK...</span>
            <span className="command-loading-sub">SATELLITE ACQUISITION IN PROGRESS</span>
          </div>
        </div>
        <style>{commandStyles}</style>
      </div>
    );
  }

  return (
    <div className="command-player">
      {/* Mission Header */}
      <div className="command-header">
        <div className="command-header-left">
          <Shield className="w-5 h-5 text-[#556b2f]" />
          <span className="command-title">TACTICAL OPERATIONS CENTER</span>
        </div>
        <div className="command-header-center">
          <StatusIndicator status={isPlaying ? "active" : "standby"} label={isPlaying ? "TRACKING ACTIVE" : "STANDBY"} />
        </div>
        <div className="command-header-right">
          <span className="command-datetime">{data.dateTime?.split("T")[0] || "DATE UNKNOWN"}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="command-main-grid">
        {/* Left Panel - Mission Data */}
        <div className="command-left-panel">
          {/* Mission Brief */}
          <div className="command-panel">
            <div className="command-panel-header">
              <Target className="w-4 h-4" />
              <span>MISSION BRIEF</span>
            </div>
            <div className="command-panel-content">
              <div className="command-stat-row">
                <span className="command-stat-label">OBJECTIVE</span>
                <span className="command-stat-value">{(totalDistance * 0.000621371).toFixed(2)} MI</span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">ELAPSED</span>
                <span className="command-stat-value command-green">{formatMissionTime(currentTime)}</span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">REMAINING</span>
                <span className="command-stat-value command-amber">{(remainingDistance * 0.000621371).toFixed(2)} MI</span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">TOTAL TIME</span>
                <span className="command-stat-value">{formatMissionTime(activityData.summary.duration)}</span>
              </div>
            </div>
          </div>

          {/* Current Telemetry */}
          <div className="command-panel">
            <div className="command-panel-header">
              <Radio className="w-4 h-4" />
              <span>TELEMETRY</span>
            </div>
            <div className="command-panel-content">
              <div className="command-stat-row">
                <span className="command-stat-label">GRID REF</span>
                <span className="command-stat-value command-green text-xs">
                  {currentPoint ? formatMilitaryCoord(currentPoint.lat, currentPoint.lon) : "--"}
                </span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">ALTITUDE</span>
                <span className="command-stat-value">
                  {currentPoint?.elevation ? Math.round(metersToFeet(currentPoint.elevation)) : 0} FT
                </span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">VELOCITY</span>
                <span className="command-stat-value command-amber">
                  {currentPoint?.speed ? msToMph(currentPoint.speed).toFixed(1) : "0.0"} MPH
                </span>
              </div>
              {currentPoint?.hr !== undefined && (
                <div className="command-stat-row">
                  <span className="command-stat-label">HEART RATE</span>
                  <span className="command-stat-value command-red">{currentPoint.hr} BPM</span>
                </div>
              )}
              <div className="command-stat-row">
                <span className="command-stat-label">ELEV GAIN</span>
                <span className="command-stat-value">+{Math.round(metersToFeet(activityData.summary.elevationGain))} FT</span>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="command-panel">
            <div className="command-panel-header">
              <Mountain className="w-4 h-4" />
              <span>MAP CONTROL</span>
            </div>
            <div className="command-panel-content">
              <div className="command-control-grid">
                <button
                  onClick={cycleCameraMode}
                  className="command-control-btn"
                >
                  CAM: {cameraMode.toUpperCase()}
                </button>
                <button
                  onClick={cycleColorMode}
                  className="command-control-btn"
                >
                  DATA: {colorMode.toUpperCase()}
                </button>
                <button
                  onClick={() => setTerrain3D(!terrain3D)}
                  className={`command-control-btn ${terrain3D ? "command-control-active" : ""}`}
                >
                  3D: {terrain3D ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setMapStyle(mapStyle === "satellite" ? "outdoors" : "satellite")}
                  className="command-control-btn"
                >
                  {mapStyle.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Tactical Map */}
        <div className="command-map-container">
          <div className="command-map-header">
            <span>TACTICAL DISPLAY</span>
            <StatusIndicator status="active" label="SATELLITE FEED" />
          </div>
          <div className="command-map-wrapper" style={{ height: "400px" }}>
            <CommandMap
              ref={mapRef}
              dataPoints={activityData.dataPoints}
              currentIndex={currentIndex}
              bounds={activityData.bounds}
              colorMode={colorMode}
              cameraMode={cameraMode}
              mapStyle={mapStyle}
              terrain3D={terrain3D}
              hasHeartRate={activityData.hasHeartRate}
              temperature={tempFahrenheit}
              highlightedSegment={highlightedSegment}
            />
          </div>
        </div>

        {/* Right Panel - Status */}
        <div className="command-right-panel">
          {/* Mission Progress */}
          <div className="command-panel">
            <div className="command-panel-header">
              <span>MISSION PROGRESS</span>
            </div>
            <div className="command-panel-content">
              <div className="command-progress-display">
                <div className="command-progress-value">{Math.round(progress)}%</div>
                <div className="command-progress-label">COMPLETE</div>
              </div>
              <div className="command-progress-bar">
                <div
                  className="command-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="command-progress-markers">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="command-panel">
            <div className="command-panel-header">
              <span>MISSION STATS</span>
            </div>
            <div className="command-panel-content">
              <div className="command-stat-row">
                <span className="command-stat-label">AVG SPEED</span>
                <span className="command-stat-value">
                  {activityData.summary.avgSpeed ? msToMph(activityData.summary.avgSpeed).toFixed(1) : "--"} MPH
                </span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">MAX SPEED</span>
                <span className="command-stat-value command-amber">
                  {activityData.summary.maxSpeed ? msToMph(activityData.summary.maxSpeed).toFixed(1) : "--"} MPH
                </span>
              </div>
              {activityData.summary.avgHr && (
                <div className="command-stat-row">
                  <span className="command-stat-label">AVG HR</span>
                  <span className="command-stat-value">{activityData.summary.avgHr} BPM</span>
                </div>
              )}
              {activityData.summary.maxHr && (
                <div className="command-stat-row">
                  <span className="command-stat-label">MAX HR</span>
                  <span className="command-stat-value command-red">{activityData.summary.maxHr} BPM</span>
                </div>
              )}
            </div>
          </div>

          {/* Data Frame Info */}
          <div className="command-panel">
            <div className="command-panel-header">
              <span>DATA STREAM</span>
            </div>
            <div className="command-panel-content">
              <div className="command-stat-row">
                <span className="command-stat-label">FRAME</span>
                <span className="command-stat-value command-green">
                  {currentIndex} / {activityData.dataPoints.length - 1}
                </span>
              </div>
              <div className="command-stat-row">
                <span className="command-stat-label">PLAYBACK</span>
                <span className="command-stat-value">{playbackSpeed}X</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="command-controls">
        <div className="command-controls-left">
          <span className="command-time-display">{formatMissionTime(currentTime)}</span>
        </div>

        <div className="command-controls-center">
          <button
            onClick={handleSkipBack}
            disabled={currentIndex === 0}
            className="command-playback-btn"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="command-play-btn"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            disabled={currentIndex >= activityData.dataPoints.length - 1}
            className="command-playback-btn"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button onClick={cycleSpeed} className="command-speed-btn">
            {playbackSpeed}X
          </button>
        </div>

        <div className="command-controls-right">
          <span className="command-time-display">{formatMissionTime(activityData.summary.duration)}</span>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="command-scrubber">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="command-scrubber-input"
        />
      </div>

      {/* Footer Status Bar */}
      <div className="command-footer">
        <div className="command-footer-item">
          <span className="command-footer-label">STATUS:</span>
          <span className={`command-footer-value ${isPlaying ? "command-green" : "command-amber"}`}>
            {isPlaying ? "ACTIVE" : "STANDBY"}
          </span>
        </div>
        <div className="command-footer-item">
          <span className="command-footer-label">UPLINK:</span>
          <span className="command-footer-value command-green">SECURE</span>
        </div>
        <div className="command-footer-item">
          <span className="command-footer-label">SIGNAL:</span>
          <span className="command-footer-value command-green">NOMINAL</span>
        </div>
      </div>

      <style>{commandStyles}</style>
    </div>
  );
}

const commandStyles = `
  .command-player {
    background: #1a1a1a;
    border: 2px solid #556b2f;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #c0c0c0;
    overflow: hidden;
  }

  .command-player-loading {
    background: #1a1a1a;
    border: 2px solid #556b2f;
    border-radius: 4px;
    padding: 60px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .command-loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .command-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #2d2d2d;
    border-top-color: #556b2f;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .command-loading-text {
    text-align: center;
    font-family: 'Courier New', monospace;
  }

  .command-loading-main {
    display: block;
    color: #ffa500;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
  }

  .command-loading-sub {
    display: block;
    color: #808080;
    font-size: 11px;
    margin-top: 4px;
  }

  /* Header */
  .command-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #2d2d2d;
    border-bottom: 2px solid #556b2f;
  }

  .command-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .command-title {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
    color: #ffa500;
  }

  .command-header-center {
    display: flex;
    align-items: center;
  }

  .command-status-text {
    font-size: 11px;
    letter-spacing: 1px;
    color: #c0c0c0;
  }

  .command-header-right {
    font-size: 11px;
    color: #808080;
  }

  .command-datetime {
    letter-spacing: 1px;
  }

  /* Main Grid */
  .command-main-grid {
    display: grid;
    grid-template-columns: 220px 1fr 200px;
    min-height: 450px;
  }

  @media (max-width: 1024px) {
    .command-main-grid {
      grid-template-columns: 1fr;
    }
    .command-left-panel,
    .command-right-panel {
      display: none;
    }
  }

  /* Panels */
  .command-left-panel,
  .command-right-panel {
    background: #1f1f1f;
    border-right: 1px solid #556b2f;
    display: flex;
    flex-direction: column;
  }

  .command-right-panel {
    border-right: none;
    border-left: 1px solid #556b2f;
  }

  .command-panel {
    border-bottom: 1px solid #3a3a3a;
  }

  .command-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #2d2d2d;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 1px;
    color: #ffa500;
    border-bottom: 1px solid #3a3a3a;
  }

  .command-panel-content {
    padding: 10px 12px;
  }

  .command-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 4px 0;
  }

  .command-stat-label {
    font-size: 9px;
    color: #808080;
    letter-spacing: 1px;
  }

  .command-stat-value {
    font-size: 12px;
    font-weight: bold;
    color: #c0c0c0;
  }

  .command-green { color: #00ff00; }
  .command-amber { color: #ffa500; }
  .command-red { color: #ff4444; }

  /* Control Grid */
  .command-control-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .command-control-btn {
    background: #2d2d2d;
    border: 1px solid #556b2f;
    padding: 6px 8px;
    font-family: 'Courier New', monospace;
    font-size: 9px;
    font-weight: bold;
    color: #c0c0c0;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .command-control-btn:hover {
    background: #3a3a3a;
    border-color: #ffa500;
    color: #ffa500;
  }

  .command-control-active {
    background: #556b2f;
    color: #fff;
  }

  /* Map Container */
  .command-map-container {
    display: flex;
    flex-direction: column;
  }

  .command-map-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #2d2d2d;
    border-bottom: 1px solid #556b2f;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
    color: #ffa500;
  }

  .command-map-wrapper {
    flex: 1;
    background: #0a0a0a;
  }

  /* Progress Display */
  .command-progress-display {
    text-align: center;
    margin-bottom: 12px;
  }

  .command-progress-value {
    font-size: 28px;
    font-weight: bold;
    color: #ffa500;
  }

  .command-progress-label {
    font-size: 9px;
    color: #808080;
    letter-spacing: 1px;
  }

  .command-progress-bar {
    height: 8px;
    background: #2d2d2d;
    border: 1px solid #556b2f;
    margin-bottom: 6px;
    overflow: hidden;
  }

  .command-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #556b2f 0%, #ffa500 100%);
    transition: width 0.2s ease-out;
  }

  .command-progress-markers {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #606060;
  }

  /* Playback Controls */
  .command-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #2d2d2d;
    border-top: 1px solid #556b2f;
  }

  .command-controls-left,
  .command-controls-right {
    width: 100px;
  }

  .command-time-display {
    font-size: 14px;
    font-weight: bold;
    color: #00ff00;
    letter-spacing: 1px;
  }

  .command-controls-center {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .command-playback-btn {
    background: transparent;
    border: 2px solid #556b2f;
    padding: 8px;
    color: #c0c0c0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .command-playback-btn:hover:not(:disabled) {
    border-color: #ffa500;
    color: #ffa500;
  }

  .command-playback-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .command-play-btn {
    background: #556b2f;
    border: 2px solid #ffa500;
    padding: 12px;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s;
  }

  .command-play-btn:hover {
    background: #6b8b3d;
  }

  .command-speed-btn {
    background: transparent;
    border: 1px solid #556b2f;
    padding: 6px 12px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: bold;
    color: #ffa500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .command-speed-btn:hover {
    border-color: #ffa500;
    background: rgba(255, 165, 0, 0.1);
  }

  /* Scrubber */
  .command-scrubber {
    padding: 0 16px 12px;
    background: #2d2d2d;
  }

  .command-scrubber-input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: #1a1a1a;
    border: 1px solid #556b2f;
    cursor: pointer;
  }

  .command-scrubber-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #ffa500;
    border: 2px solid #fff;
    cursor: pointer;
  }

  .command-scrubber-input::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #ffa500;
    border: 2px solid #fff;
    cursor: pointer;
  }

  /* Footer */
  .command-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 8px 16px;
    background: #1a1a1a;
    border-top: 1px solid #3a3a3a;
    font-size: 10px;
  }

  .command-footer-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .command-footer-label {
    color: #606060;
    letter-spacing: 1px;
  }

  .command-footer-value {
    font-weight: bold;
    letter-spacing: 1px;
  }
`;
