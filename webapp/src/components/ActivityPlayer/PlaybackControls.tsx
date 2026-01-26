/**
 * PlaybackControls - Play/pause, speed, and scrub bar for activity playback
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
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
} from "lucide-react";
import { formatDuration, metersToFeet, msToMph } from "@/lib/activity-data-parser";
import type { ActivityDataPoint, ActivitySummary } from "@/lib/activity-data-parser";

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

        {currentPoint?.speed !== undefined && (
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <span className="text-muted-foreground text-xs block">Speed</span>
            <span className="font-mono font-semibold">
              {msToMph(currentPoint.speed).toFixed(1)} mph
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

        {currentPoint?.cadence !== undefined && (
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <span className="text-muted-foreground text-xs block">Cadence</span>
            <span className="font-mono font-semibold text-purple-500">
              {currentPoint.cadence} spm
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

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipBack}
            disabled={currentIndex === 0}
            title="Skip back 30 seconds"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={onPlayPause}
            className="h-10 w-10"
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
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <Select
            value={playbackSpeed.toString()}
            onValueChange={(val) => onSpeedChange(parseFloat(val))}
          >
            <SelectTrigger className="w-20 h-8">
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
