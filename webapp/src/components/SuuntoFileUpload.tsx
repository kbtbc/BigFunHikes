import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseSuuntoJson,
  readSuuntoFile,
  isValidSuuntoFile,
  type SuuntoParseResult,
} from "@/lib/suunto-parser";
import {
  Watch,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Heart,
  Footprints,
  Flame,
  Clock,
  TrendingUp,
  Navigation,
} from "lucide-react";

export interface SuuntoUploadResult {
  suuntoData: string; // JSON string of parsed data
  distanceMiles: number;
  elevationGainFeet: number;
  durationSeconds: number;
  stepCount: number;
  caloriesBurned: number;
  avgHeartRate: number;
  dateTime: string;
  startCoords: [number, number] | null;
  gpsTrackPointCount: number;
}

interface SuuntoFileUploadProps {
  onSuuntoParsed: (result: SuuntoUploadResult | null) => void;
  existingSuuntoData?: string | null;
  disabled?: boolean;
  className?: string;
}

export function SuuntoFileUpload({
  onSuuntoParsed,
  existingSuuntoData,
  disabled = false,
  className = "",
}: SuuntoFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<SuuntoParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Check if there's existing Suunto data
  const hasExistingSuunto = existingSuuntoData && existingSuuntoData.length > 0;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!isValidSuuntoFile(file)) {
        setError("Please select a valid JSON file from your Suunto watch");
        return;
      }

      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      try {
        // Read and parse the Suunto JSON file
        const content = await readSuuntoFile(file);
        const result = parseSuuntoJson(content);

        setParseResult(result);

        // Get start coordinates from GPS track
        const startCoords: [number, number] | null =
          result.gpsTrack.length > 0
            ? [result.gpsTrack[0].lat, result.gpsTrack[0].lon]
            : null;

        // Notify parent with parsed data
        onSuuntoParsed({
          suuntoData: JSON.stringify(result),
          distanceMiles: result.distanceMiles,
          elevationGainFeet: result.elevation.ascentFeet,
          durationSeconds: result.durationSeconds,
          stepCount: result.stepCount,
          caloriesBurned: result.caloriesBurned,
          avgHeartRate: result.heartRate.avgBpm,
          dateTime: result.dateTime,
          startCoords,
          gpsTrackPointCount: result.gpsTrack.length,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse Suunto file";
        setError(message);
        setParseResult(null);
        onSuuntoParsed(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuuntoParsed]
  );

  const handleRemove = useCallback(() => {
    setParseResult(null);
    setFileName(null);
    setError(null);
    onSuuntoParsed(null);
  }, [onSuuntoParsed]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Watch className="h-5 w-5 text-primary" />
        <Label className="text-sm font-medium">Suunto Watch Data</Label>
      </div>

      {/* File Upload */}
      {!parseResult && !hasExistingSuunto && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={disabled || isLoading}
              className="h-10"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a JSON export file from your Suunto watch to import heart rate, steps, pace, and more.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Success State - Parsed Suunto Data */}
      {parseResult && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                Suunto Data Imported
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>

          {fileName && (
            <p className="text-xs text-muted-foreground truncate">{fileName}</p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{parseResult.distanceMiles}</span>
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{parseResult.elevation.ascentFeet.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">ft</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{formatDuration(parseResult.durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold">{parseResult.heartRate.avgBpm}</span>
              <span className="text-xs text-muted-foreground">bpm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{parseResult.stepCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-semibold">{parseResult.caloriesBurned}</span>
              <span className="text-xs text-muted-foreground">cal</span>
            </div>
          </div>

          {parseResult.gpsTrack.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {parseResult.gpsTrack.length.toLocaleString()} GPS points &bull; {parseResult.laps.length} laps recorded
            </p>
          )}
        </div>
      )}

      {/* Existing Suunto Data State */}
      {hasExistingSuunto && !parseResult && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Watch className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium">Suunto Data Attached</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This entry has Suunto watch data. Heart rate, steps, and other metrics will be displayed.
          </p>
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground block mb-2">
              Replace with new Suunto file:
            </Label>
            <Input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={disabled || isLoading}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
