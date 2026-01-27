/**
 * PlaybackControls - Play/pause, speed, and scrub bar for activity playback
 * Layout matches Classic player style with all controls in a single row
 */

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Palette,
  Mountain,
  Navigation,
  Eye,
  Video,
} from "lucide-react";
import { formatDuration, metersToFeet, msToMph } from "@/lib/activity-data-parser";
import type { ActivityDataPoint, ActivitySummary } from "@/lib/activity-data-parser";
import type { ColorMode, CameraMode, MapStyle } from "./ActivityMap";

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentIndex: number;
  totalPoints: number;
  currentPoint: ActivityDataPoint | null;
  summary: ActivitySummary;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
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
}

const SPEED_OPTIONS = [
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
];

export function PlaybackControls({
  isPlaying,
  playbackSpeed,
  currentIndex,
  totalPoints,
  currentPoint,
  summary,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onSkipBack,
  onSkipForward,
  colorMode,
  onColorModeChange,
  cameraMode,
  onCameraModeChange,
  terrain3D,
  onTerrain3DChange,
  mapStyle,
  onMapStyleChange,
  hasHeartRate,
}: PlaybackControlsProps) {
  const progress = totalPoints > 0 ? (currentIndex / (totalPoints - 1)) * 100 : 0;
  const currentTime = currentPoint?.timestamp ? currentPoint.timestamp / 1000 : 0;

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newIndex = Math.round((value[0] / 100) * (totalPoints - 1));
      onSeek(newIndex);
    },
    [totalPoints, onSeek]
  );

  return (
    <div className="space-y-4">
      {/* Current Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <span className="text-muted-foreground text-xs block">Time</span>
          <span className="font-mono font-semibold">
            {formatDuration(currentTime)} / {formatDuration(summary.duration)}
          </span>
        </div>

        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <span className="text-muted-foreground text-xs block">Distance</span>
          <span className="font-mono font-semibold">
            {currentPoint?.distance
              ? (currentPoint.distance * 0.000621371).toFixed(2)
              : "0.00"}{" "}
            mi
          </span>
        </div>

        {currentPoint?.elevation !== undefined && (
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <span className="text-muted-foreground text-xs block">Elevation</span>
            <span className="font-mono font-semibold">
              {Math.round(metersToFeet(currentPoint.elevation))} ft
            </span>
          </div>
        )}

        {currentPoint?.hr !== undefined && (
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <span className="text-muted-foreground text-xs block">Heart Rate</span>
            <span className="font-mono font-semibold text-red-500">
              {currentPoint.hr} bpm
            </span>
          </div>
        )}
      </div>

      {/* Progress Scrubber */}
      <div className="px-1">
        <Slider
          value={[progress]}
          onValueChange={handleSliderChange}
          max={100}
          step={0.1}
          className="cursor-pointer"
        />
      </div>

      {/* Combined Controls Row - Play controls left, options right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Play controls */}
        <div className="flex items-center gap-1">
          {/* Skip Back */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipBack}
            disabled={currentIndex === 0}
            title="Skip back 30 seconds"
            className="h-8 w-8"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={onPlayPause}
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipForward}
            disabled={currentIndex >= totalPoints - 1}
            title="Skip forward 30 seconds"
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side: All options in a row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Color Mode */}
          <div className="flex items-center gap-1.5">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Select
              value={colorMode}
              onValueChange={(val) => onColorModeChange(val as ColorMode)}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speed">Speed</SelectItem>
                {hasHeartRate && <SelectItem value="hr">Heart Rate</SelectItem>}
                <SelectItem value="elevation">Elevation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Camera Mode */}
          <div className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <Select
              value={cameraMode}
              onValueChange={(val) => onCameraModeChange(val as CameraMode)}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="follow">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="h-3 w-3" />
                    Follow
                  </div>
                </SelectItem>
                <SelectItem value="overview">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    Overview
                  </div>
                </SelectItem>
                <SelectItem value="firstPerson">
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3 w-3" />
                    First Person
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3D Toggle */}
          <div className="flex items-center gap-1.5">
            <Mountain className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="terrain-toggle" className="text-xs">3D</Label>
            <Switch
              id="terrain-toggle"
              checked={terrain3D}
              onCheckedChange={onTerrain3DChange}
              className="scale-90"
            />
          </div>

          {/* Satellite Toggle */}
          <div className="flex items-center gap-1.5">
            <Label htmlFor="satellite-toggle" className="text-xs">Satellite</Label>
            <Switch
              id="satellite-toggle"
              checked={mapStyle === "satellite"}
              onCheckedChange={(checked) => onMapStyleChange(checked ? "satellite" : "outdoors")}
              className="scale-90"
            />
          </div>

          {/* Speed Selector */}
          <Select
            value={playbackSpeed.toString()}
            onValueChange={(val) => onSpeedChange(parseFloat(val))}
          >
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
