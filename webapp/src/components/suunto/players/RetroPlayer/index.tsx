/**
 * Retro Player - Activity Player with 70s/80s Analog Equipment aesthetic
 *
 * Design: Vintage analog equipment (hi-fi, car dashboards, VU meters)
 * Color Palette: Wood brown (#8b4513) + Orange (#ff6b00) + Cream (#f5deb3) + Chrome (#c0c0c0)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mountain,
  Gauge,
  Palette,
  Video,
  Eye,
  Navigation,
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
import { RetroMap, type RetroMapRef, type CameraMode, type MapStyle } from "./RetroMap";
import { ActivityCharts } from "@/components/ActivityPlayer/ActivityCharts";

interface RetroPlayerProps {
  data: SuuntoParseResult;
}

type ColorMode = "speed" | "hr" | "elevation";

// Analog Needle Gauge Component
function AnalogGauge({
  value,
  min,
  max,
  label,
  unit,
  color = "#ff6b00",
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
}) {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const rotation = -135 + percentage * 270; // -135 to 135 degrees

  return (
    <div className="retro-gauge">
      <div className="retro-gauge-inner">
        {/* Gauge markings */}
        <svg viewBox="0 0 100 100" className="retro-gauge-svg">
          {/* Background arc */}
          <path
            d="M 15 75 A 40 40 0 1 1 85 75"
            fill="none"
            stroke="#3d2513"
            strokeWidth="3"
          />
          {/* Value arc */}
          <path
            d="M 15 75 A 40 40 0 1 1 85 75"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${percentage * 188} 188`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const angle = (-135 + tick * 270) * (Math.PI / 180);
            const x1 = 50 + 35 * Math.cos(angle);
            const y1 = 50 + 35 * Math.sin(angle);
            const x2 = 50 + 40 * Math.cos(angle);
            const y2 = 50 + 40 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#8b4513"
                strokeWidth="2"
              />
            );
          })}
          {/* Needle */}
          <g transform={`rotate(${rotation} 50 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="18"
              stroke={color}
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 3px ${color})` }}
            />
            <circle cx="50" cy="50" r="4" fill="#c0c0c0" />
            <circle cx="50" cy="50" r="2" fill="#8b4513" />
          </g>
        </svg>
        {/* Digital readout */}
        <div className="retro-gauge-readout">
          <span className="retro-nixie-display">{Math.round(value)}</span>
          <span className="retro-gauge-unit">{unit}</span>
        </div>
      </div>
      <div className="retro-gauge-label">{label}</div>
    </div>
  );
}

// VU Meter Component
function VuMeter({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const segments = 12;
  const activeSegments = Math.round(percentage * segments);

  return (
    <div className="retro-vu-meter">
      <div className="retro-vu-label">{label}</div>
      <div className="retro-vu-bar">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments;
          const isRed = i >= segments - 3;
          const isYellow = i >= segments - 6 && i < segments - 3;
          let bgColor = "#3d2513";
          if (isActive) {
            if (isRed) bgColor = "#ff3333";
            else if (isYellow) bgColor = "#ffcc00";
            else bgColor = "#00cc66";
          }
          return (
            <div
              key={i}
              className="retro-vu-segment"
              style={{
                background: bgColor,
                boxShadow: isActive ? `0 0 6px ${bgColor}` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Nixie Tube Display Component
function NixieDisplay({ value, digits = 4 }: { value: string; digits?: number }) {
  const paddedValue = value.padStart(digits, " ");
  return (
    <div className="retro-nixie-container">
      {paddedValue.split("").map((char, i) => (
        <div key={i} className="retro-nixie-digit">
          {char}
        </div>
      ))}
    </div>
  );
}

// Physical Button Component
function RetroButton({
  children,
  onClick,
  disabled,
  active,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "retro-btn-sm",
    md: "retro-btn-md",
    lg: "retro-btn-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`retro-button ${sizeClasses[size]} ${active ? "retro-btn-active" : ""} ${disabled ? "retro-btn-disabled" : ""}`}
    >
      {children}
    </button>
  );
}

export function RetroPlayer({ data }: RetroPlayerProps) {
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
  const mapRef = useRef<RetroMapRef>(null);

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

  // Get stats for gauges
  const currentSpeed = currentPoint?.speed ? msToMph(currentPoint.speed) : 0;
  const currentHr = currentPoint?.hr ?? 0;
  const currentElevation = currentPoint?.elevation ? metersToFeet(currentPoint.elevation) : 0;
  const currentDistance = currentPoint?.distance ? currentPoint.distance * 0.000621371 : 0;

  // Calculate effort based on HR if available, otherwise use speed
  const effort = activityData?.hasHeartRate && currentHr > 0
    ? Math.min((currentHr / 180) * 100, 100)
    : Math.min(currentSpeed / 10 * 100, 100);

  if (!activityData) {
    return (
      <div className="retro-player-loading">
        <div className="retro-loading-panel">
          <div className="retro-loading-text">LOADING...</div>
          <div className="retro-loading-bar">
            <div className="retro-loading-progress" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-player space-y-4">
      {/* Main Panel - Wood grain background */}
      <div className="retro-main-panel">
        {/* Top Section: Gauges and Map */}
        <div className="retro-top-section">
          {/* Left Gauge Panel */}
          <div className="retro-gauge-panel retro-gauge-panel-left">
            <AnalogGauge
              value={currentSpeed}
              min={0}
              max={15}
              label="SPEED"
              unit="MPH"
              color="#ff6b00"
            />
            {activityData.hasHeartRate ? (
              <AnalogGauge
                value={currentHr}
                min={60}
                max={200}
                label="HEART RATE"
                unit="BPM"
                color="#ff3333"
              />
            ) : (
              <AnalogGauge
                value={currentElevation}
                min={0}
                max={5000}
                label="ELEVATION"
                unit="FT"
                color="#00cc66"
              />
            )}
          </div>

          {/* Center: Map */}
          <div className="retro-map-container">
            <div className="retro-map-bezel">
              <RetroMap
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

          {/* Right Info Panel */}
          <div className="retro-info-panel">
            {/* Time Display */}
            <div className="retro-time-display">
              <div className="retro-time-label">ELAPSED TIME</div>
              <NixieDisplay value={formatDuration(currentTime).replace(":", "")} digits={6} />
            </div>

            {/* Distance Display */}
            <div className="retro-distance-display">
              <div className="retro-time-label">DISTANCE</div>
              <NixieDisplay value={currentDistance.toFixed(2).replace(".", "")} digits={5} />
              <div className="retro-unit-label">MILES</div>
            </div>

            {/* Effort VU Meter */}
            <VuMeter value={effort} max={100} label="EFFORT" />

            {/* Elevation if HR gauge is showing */}
            {activityData.hasHeartRate && (
              <div className="retro-elevation-display">
                <div className="retro-time-label">ELEVATION</div>
                <NixieDisplay value={Math.round(currentElevation).toString()} digits={5} />
                <div className="retro-unit-label">FEET</div>
              </div>
            )}
          </div>
        </div>

        {/* Control Strip */}
        <div className="retro-control-strip">
          {/* Progress Bar */}
          <div className="retro-progress-container">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="retro-slider"
            />
          </div>

          {/* Transport Controls */}
          <div className="retro-transport">
            <RetroButton onClick={handleSkipBack} disabled={currentIndex === 0}>
              <SkipBack className="h-4 w-4" />
            </RetroButton>

            <RetroButton onClick={handlePlayPause} size="lg" active={isPlaying}>
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </RetroButton>

            <RetroButton
              onClick={handleSkipForward}
              disabled={currentIndex >= activityData.dataPoints.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </RetroButton>
          </div>

          {/* Options */}
          <div className="retro-options">
            {/* Color Mode */}
            <div className="retro-option-group">
              <Palette className="h-4 w-4 text-amber-600" />
              <Select
                value={colorMode}
                onValueChange={(val) => setColorMode(val as ColorMode)}
              >
                <SelectTrigger className="retro-select">
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

            {/* Camera Mode */}
            <div className="retro-option-group">
              <Video className="h-4 w-4 text-amber-600" />
              <Select
                value={cameraMode}
                onValueChange={(val) => setCameraMode(val as CameraMode)}
              >
                <SelectTrigger className="retro-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3 w-3" />
                      Follow
                    </div>
                  </SelectItem>
                  <SelectItem value="overview">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Overview
                    </div>
                  </SelectItem>
                  <SelectItem value="firstPerson">
                    <div className="flex items-center gap-2">
                      <Video className="h-3 w-3" />
                      First Person
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3D Toggle */}
            <div className="retro-option-group">
              <Mountain className="h-4 w-4 text-amber-600" />
              <Label className="retro-label">3D</Label>
              <Switch
                checked={terrain3D}
                onCheckedChange={setTerrain3D}
                className="retro-switch"
              />
            </div>

            {/* Satellite Toggle */}
            <div className="retro-option-group">
              <Label className="retro-label">SAT</Label>
              <Switch
                checked={mapStyle === "satellite"}
                onCheckedChange={(checked) => setMapStyle(checked ? "satellite" : "outdoors")}
                className="retro-switch"
              />
            </div>

            {/* Speed */}
            <div className="retro-option-group">
              <Gauge className="h-4 w-4 text-amber-600" />
              <Select
                value={playbackSpeed.toString()}
                onValueChange={(val) => setPlaybackSpeed(parseFloat(val))}
              >
                <SelectTrigger className="retro-select retro-select-sm">
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
      </div>

      {/* Charts Card */}
      <div className="retro-charts-panel">
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

      {/* Retro Styles */}
      <style>{`
        .retro-player {
          --retro-wood: #8b4513;
          --retro-wood-dark: #5c3a21;
          --retro-wood-light: #a0522d;
          --retro-orange: #ff6b00;
          --retro-cream: #f5deb3;
          --retro-chrome: #c0c0c0;
          --retro-chrome-dark: #808080;
          --retro-black: #1a1a1a;
          --retro-glow: rgba(255, 107, 0, 0.6);
        }

        .retro-player-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          background: linear-gradient(180deg, var(--retro-wood-dark) 0%, var(--retro-wood) 50%, var(--retro-wood-dark) 100%);
          border-radius: 12px;
          border: 3px solid var(--retro-wood-light);
        }

        .retro-loading-panel {
          text-align: center;
        }

        .retro-loading-text {
          font-family: ui-monospace, monospace;
          font-size: 1.5rem;
          color: var(--retro-orange);
          text-shadow: 0 0 10px var(--retro-glow);
          margin-bottom: 1rem;
          letter-spacing: 0.2em;
        }

        .retro-loading-bar {
          width: 200px;
          height: 8px;
          background: var(--retro-black);
          border-radius: 4px;
          overflow: hidden;
        }

        .retro-loading-progress {
          width: 40%;
          height: 100%;
          background: var(--retro-orange);
          animation: loading 1.5s ease-in-out infinite;
        }

        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }

        .retro-main-panel {
          background:
            url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grain' patternUnits='userSpaceOnUse' width='100' height='100'%3E%3Cpath d='M0 0h100v1H0zM0 4h100v1H0zM0 8h100v1H0zM0 12h100v1H0zM0 16h100v1H0zM0 20h100v1H0zM0 24h100v1H0zM0 28h100v1H0zM0 32h100v1H0zM0 36h100v1H0zM0 40h100v1H0zM0 44h100v1H0zM0 48h100v1H0zM0 52h100v1H0zM0 56h100v1H0zM0 60h100v1H0zM0 64h100v1H0zM0 68h100v1H0zM0 72h100v1H0zM0 76h100v1H0zM0 80h100v1H0zM0 84h100v1H0zM0 88h100v1H0zM0 92h100v1H0zM0 96h100v1H0z' fill='%235c3a21' fill-opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='%238b4513' width='100' height='100'/%3E%3Crect fill='url(%23grain)' width='100' height='100'/%3E%3C/svg%3E"),
            linear-gradient(180deg, #6b4423 0%, #8b4513 15%, #9b5523 50%, #8b4513 85%, #6b4423 100%);
          border-radius: 16px;
          border: 4px solid #5c3a21;
          box-shadow:
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.4);
          padding: 16px;
        }

        .retro-top-section {
          display: grid;
          grid-template-columns: 180px 1fr 180px;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .retro-top-section {
            grid-template-columns: 1fr;
          }
          .retro-gauge-panel-left {
            display: flex;
            justify-content: center;
            gap: 24px;
          }
        }

        .retro-gauge-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          justify-content: center;
        }

        .retro-gauge {
          background: linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%);
          border-radius: 12px;
          padding: 12px;
          border: 2px solid var(--retro-chrome-dark);
          box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.5),
            0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .retro-gauge-inner {
          position: relative;
          width: 140px;
          height: 100px;
        }

        .retro-gauge-svg {
          width: 100%;
          height: 100%;
        }

        .retro-gauge-readout {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
        }

        .retro-nixie-display {
          font-family: ui-monospace, monospace;
          font-size: 1.25rem;
          font-weight: bold;
          color: var(--retro-orange);
          text-shadow: 0 0 10px var(--retro-glow);
          letter-spacing: 0.1em;
        }

        .retro-gauge-unit {
          display: block;
          font-size: 0.625rem;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .retro-gauge-label {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .retro-map-container {
          flex: 1;
        }

        .retro-map-bezel {
          background: linear-gradient(180deg, #3d3d3d 0%, #2a2a2a 100%);
          border-radius: 12px;
          padding: 4px;
          border: 3px solid var(--retro-chrome-dark);
          box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.5),
            0 4px 8px rgba(0, 0, 0, 0.3);
          height: 400px;
          overflow: hidden;
        }

        .retro-map-bezel > div {
          border-radius: 8px;
          overflow: hidden;
          height: 100%;
        }

        .retro-info-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: center;
        }

        .retro-time-display,
        .retro-distance-display,
        .retro-elevation-display {
          background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 8px;
          padding: 8px 12px;
          border: 2px solid var(--retro-chrome-dark);
          text-align: center;
        }

        .retro-time-label {
          font-size: 0.625rem;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 4px;
        }

        .retro-unit-label {
          font-size: 0.5rem;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-top: 2px;
        }

        .retro-nixie-container {
          display: flex;
          justify-content: center;
          gap: 2px;
        }

        .retro-nixie-digit {
          width: 18px;
          height: 28px;
          background: linear-gradient(180deg, #1a0a00 0%, #2a1500 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ui-monospace, monospace;
          font-size: 1.25rem;
          font-weight: bold;
          color: var(--retro-orange);
          text-shadow: 0 0 8px var(--retro-glow), 0 0 16px var(--retro-glow);
          border: 1px solid #3d2513;
        }

        .retro-vu-meter {
          background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 8px;
          padding: 8px 12px;
          border: 2px solid var(--retro-chrome-dark);
        }

        .retro-vu-label {
          font-size: 0.625rem;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 6px;
          text-align: center;
        }

        .retro-vu-bar {
          display: flex;
          gap: 3px;
          justify-content: center;
        }

        .retro-vu-segment {
          width: 10px;
          height: 20px;
          border-radius: 2px;
          transition: background 0.1s, box-shadow 0.1s;
        }

        .retro-control-strip {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 12px;
          padding: 12px 16px;
          border: 2px solid var(--retro-chrome-dark);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }

        .retro-progress-container {
          flex: 1;
          min-width: 200px;
        }

        .retro-slider [data-orientation="horizontal"] {
          height: 8px;
          background: #0d0d0d;
          border-radius: 4px;
          border: 1px solid #3d3d3d;
        }

        .retro-slider [data-orientation="horizontal"] > span:first-child {
          background: linear-gradient(90deg, #cc5500 0%, var(--retro-orange) 100%);
          border-radius: 4px;
          box-shadow: 0 0 8px var(--retro-glow);
        }

        .retro-slider [role="slider"] {
          width: 20px;
          height: 20px;
          background: linear-gradient(180deg, var(--retro-chrome) 0%, #909090 100%);
          border: 2px solid #606060;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        .retro-transport {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .retro-button {
          background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%);
          border: 2px solid #606060;
          border-radius: 8px;
          color: var(--retro-cream);
          cursor: pointer;
          transition: all 0.1s;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 4px 0 #0d0d0d,
            0 6px 8px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .retro-btn-sm {
          width: 36px;
          height: 36px;
        }

        .retro-btn-md {
          width: 44px;
          height: 44px;
        }

        .retro-btn-lg {
          width: 56px;
          height: 56px;
        }

        .retro-button:hover:not(:disabled) {
          background: linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 50%, #2a2a2a 100%);
        }

        .retro-button:active:not(:disabled) {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 1px 0 #0d0d0d,
            0 2px 4px rgba(0, 0, 0, 0.3);
          transform: translateY(3px);
        }

        .retro-btn-active {
          background: linear-gradient(180deg, #cc5500 0%, var(--retro-orange) 50%, #cc5500 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 4px 0 #993300,
            0 6px 8px rgba(0, 0, 0, 0.3),
            0 0 12px var(--retro-glow);
        }

        .retro-btn-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .retro-options {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .retro-option-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .retro-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--retro-cream);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .retro-select {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          border: 1px solid #4a4a4a;
          border-radius: 4px;
          color: var(--retro-cream);
          font-size: 0.75rem;
          height: 32px;
          min-width: 100px;
        }

        .retro-select-sm {
          min-width: 70px;
        }

        .retro-switch {
          background: #1a1a1a;
          border: 1px solid #4a4a4a;
        }

        .retro-switch[data-state="checked"] {
          background: var(--retro-orange);
          box-shadow: 0 0 8px var(--retro-glow);
        }

        .retro-charts-panel {
          background:
            url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grain' patternUnits='userSpaceOnUse' width='100' height='100'%3E%3Cpath d='M0 0h100v1H0zM0 4h100v1H0zM0 8h100v1H0zM0 12h100v1H0zM0 16h100v1H0zM0 20h100v1H0zM0 24h100v1H0zM0 28h100v1H0zM0 32h100v1H0zM0 36h100v1H0zM0 40h100v1H0zM0 44h100v1H0zM0 48h100v1H0zM0 52h100v1H0zM0 56h100v1H0zM0 60h100v1H0zM0 64h100v1H0zM0 68h100v1H0zM0 72h100v1H0zM0 76h100v1H0zM0 80h100v1H0zM0 84h100v1H0zM0 88h100v1H0zM0 92h100v1H0zM0 96h100v1H0z' fill='%235c3a21' fill-opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='%238b4513' width='100' height='100'/%3E%3Crect fill='url(%23grain)' width='100' height='100'/%3E%3C/svg%3E"),
            linear-gradient(180deg, #6b4423 0%, #8b4513 15%, #9b5523 50%, #8b4513 85%, #6b4423 100%);
          border-radius: 16px;
          border: 4px solid #5c3a21;
          box-shadow:
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.4);
          padding: 16px;
        }

        .retro-charts-panel :global(.recharts-cartesian-grid-horizontal line),
        .retro-charts-panel :global(.recharts-cartesian-grid-vertical line) {
          stroke: rgba(139, 69, 19, 0.3);
        }
      `}</style>
    </div>
  );
}
