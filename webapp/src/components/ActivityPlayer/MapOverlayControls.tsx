/**
 * MapOverlayControls - Overlay controls for the activity map
 * Displays stats and playback controls directly on the map
 */

import { useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Mountain,
  Navigation,
  Eye,
  Video,
  Map,
  Satellite,
  Gauge,
  Heart,
  TrendingUp,
} from "lucide-react";
import { formatDuration, metersToFeet } from "@/lib/activity-data-parser";
import type { ActivityDataPoint, ActivitySummary } from "@/lib/activity-data-parser";
import type { ColorMode, CameraMode, MapStyle } from "./ActivityMap";

interface MapOverlayControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentIndex: number;
  totalPoints: number;
  currentPoint: ActivityDataPoint | null;
  summary: ActivitySummary;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  // Map control props
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  terrain3D: boolean;
  onTerrain3DChange: (enabled: boolean) => void;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  hasHeartRate: boolean;
  showStats: boolean;
  onToggleStats: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const COLOR_MODES: ColorMode[] = ["speed", "elevation", "hr"];
const CAMERA_MODES: CameraMode[] = ["follow", "overview", "firstPerson"];

export function MapOverlayControls({
  isPlaying,
  playbackSpeed,
  currentIndex,
  totalPoints,
  currentPoint,
  summary,
  onPlayPause,
  onSpeedChange,
  onSeek,
  colorMode,
  onColorModeChange,
  cameraMode,
  onCameraModeChange,
  terrain3D,
  onTerrain3DChange,
  mapStyle,
  onMapStyleChange,
  hasHeartRate,
  showStats,
  onToggleStats,
}: MapOverlayControlsProps) {
  const progress = totalPoints > 0 ? (currentIndex / (totalPoints - 1)) * 100 : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newIndex = Math.round((value[0] / 100) * (totalPoints - 1));
      onSeek(newIndex);
    },
    [totalPoints, onSeek]
  );

  // Cycle through speed options
  const cycleSpeed = useCallback(() => {
    const currentIdx = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    onSpeedChange(SPEED_OPTIONS[nextIdx]);
  }, [playbackSpeed, onSpeedChange]);

  // Cycle through color modes
  const cycleColorMode = useCallback(() => {
    const availableModes = hasHeartRate ? COLOR_MODES : COLOR_MODES.filter(m => m !== "hr");
    const currentIdx = availableModes.indexOf(colorMode);
    const nextIdx = (currentIdx + 1) % availableModes.length;
    onColorModeChange(availableModes[nextIdx]);
  }, [colorMode, onColorModeChange, hasHeartRate]);

  // Cycle through camera modes
  const cycleCameraMode = useCallback(() => {
    const currentIdx = CAMERA_MODES.indexOf(cameraMode);
    const nextIdx = (currentIdx + 1) % CAMERA_MODES.length;
    onCameraModeChange(CAMERA_MODES[nextIdx]);
  }, [cameraMode, onCameraModeChange]);

  // Get icon for current color mode
  const getColorModeIcon = () => {
    switch (colorMode) {
      case "speed": return <Gauge className="h-4 w-4" />;
      case "hr": return <Heart className="h-4 w-4" />;
      case "elevation": return <TrendingUp className="h-4 w-4" />;
    }
  };

  // Get icon for current camera mode
  const getCameraModeIcon = () => {
    switch (cameraMode) {
      case "follow": return <Navigation className="h-4 w-4" />;
      case "overview": return <Eye className="h-4 w-4" />;
      case "firstPerson": return <Video className="h-4 w-4" />;
    }
  };

  // Get label for color mode
  const getColorModeLabel = () => {
    switch (colorMode) {
      case "speed": return "SPD";
      case "hr": return "HR";
      case "elevation": return "ELV";
    }
  };

  // Get label for camera mode
  const getCameraModeLabel = () => {
    switch (cameraMode) {
      case "follow": return "Follow";
      case "overview": return "Overview";
      case "firstPerson": return "FPV";
    }
  };

  return (
    <>
      {/* Stats Overlay - Top Left (replaces BigFun Hikes!) */}
      <div
        className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white shadow-lg cursor-pointer transition-all hover:bg-black/80"
        onClick={onToggleStats}
      >
        {showStats ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-white/60">Time</span>
              <span className="font-mono font-semibold">
                {formatDuration(currentTime)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/60">Dist</span>
              <span className="font-mono font-semibold">
                {currentPoint?.distance
                  ? (currentPoint.distance * 0.000621371).toFixed(2)
                  : "0.00"} mi
              </span>
            </div>
            {currentPoint?.elevation !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-white/60">Elev</span>
                <span className="font-mono font-semibold">
                  {Math.round(metersToFeet(currentPoint.elevation))} ft
                </span>
              </div>
            )}
            {currentPoint?.hr !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-white/60">HR</span>
                <span className="font-mono font-semibold text-red-400">
                  {currentPoint.hr} bpm
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="font-semibold text-sm tracking-wide">BigFun Hikes!</span>
        )}
      </div>

      {/* Play Button & Scrubber - Bottom Left */}
      <div className="absolute bottom-3 left-3 right-24 flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Progress Scrubber */}
        <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
          <Slider
            value={[progress]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white"
          />
        </div>
      </div>

      {/* Settings Icons - Bottom Right */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-all hover:bg-black/80 active:scale-95"
          title={`Speed: ${playbackSpeed}x`}
        >
          <span className="text-xs font-bold">{playbackSpeed}x</span>
        </button>

        {/* Color Mode */}
        <button
          onClick={cycleColorMode}
          className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-all hover:bg-black/80 active:scale-95"
          title={`Color: ${getColorModeLabel()}`}
        >
          {getColorModeIcon()}
        </button>

        {/* Camera Mode */}
        <button
          onClick={cycleCameraMode}
          className="w-9 h-9 rounded-lg bg-black/70 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-all hover:bg-black/80 active:scale-95"
          title={`Camera: ${getCameraModeLabel()}`}
        >
          {getCameraModeIcon()}
        </button>

        {/* 3D Toggle */}
        <button
          onClick={() => onTerrain3DChange(!terrain3D)}
          className={`w-9 h-9 rounded-lg backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-all hover:bg-black/80 active:scale-95 ${
            terrain3D ? "bg-primary/80" : "bg-black/70"
          }`}
          title={`3D: ${terrain3D ? "On" : "Off"}`}
        >
          <Mountain className="h-4 w-4" />
        </button>

        {/* Satellite Toggle */}
        <button
          onClick={() => onMapStyleChange(mapStyle === "satellite" ? "outdoors" : "satellite")}
          className={`w-9 h-9 rounded-lg backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-all hover:bg-black/80 active:scale-95 ${
            mapStyle === "satellite" ? "bg-primary/80" : "bg-black/70"
          }`}
          title={`Map: ${mapStyle === "satellite" ? "Satellite" : "Outdoors"}`}
        >
          {mapStyle === "satellite" ? (
            <Satellite className="h-4 w-4" />
          ) : (
            <Map className="h-4 w-4" />
          )}
        </button>
      </div>
    </>
  );
}
