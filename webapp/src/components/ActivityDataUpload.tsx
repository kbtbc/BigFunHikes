import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseGpx,
  readGpxFile,
  simplifyTrack,
  createSimplifiedGpx,
  type GpxParseResult,
} from "@/lib/gpx-parser";
import {
  parseSuuntoJson,
  readSuuntoFile,
  type SuuntoParseResult,
} from "@/lib/suunto-parser";
import {
  FileUp,
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
  Map,
  Watch,
} from "lucide-react";

// Re-export types for compatibility
export interface GpxUploadResult {
  gpxData: string;
  distanceMiles: number;
  elevationGainFeet: number;
  startCoords: [number, number];
  endCoords: [number, number];
  trackPointCount: number;
}

export interface SuuntoUploadResult {
  suuntoData: string;
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

type DataFormat = "gpx" | "suunto" | null;

interface ActivityDataUploadProps {
  onGpxParsed: (result: GpxUploadResult | null) => void;
  onSuuntoParsed: (result: SuuntoUploadResult | null) => void;
  existingGpx?: string | null;
  existingSuuntoData?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Unified activity data upload component that auto-detects
 * GPX files and Suunto JSON exports
 */
export function ActivityDataUpload({
  onGpxParsed,
  onSuuntoParsed,
  existingGpx,
  existingSuuntoData,
  disabled = false,
  className = "",
}: ActivityDataUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DataFormat>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Parsed results
  const [gpxResult, setGpxResult] = useState<GpxParseResult | null>(null);
  const [suuntoResult, setSuuntoResult] = useState<SuuntoParseResult | null>(null);

  // Check for existing data
  const hasExistingGpx = existingGpx && existingGpx.length > 0;
  const hasExistingSuunto = existingSuuntoData && existingSuuntoData.length > 0;
  const hasExisting = hasExistingGpx || hasExistingSuunto;

  /**
   * Detect file format from content and extension
   */
  const detectFormat = (file: File, content: string): DataFormat => {
    const extension = file.name.toLowerCase().split(".").pop();

    // Check extension first
    if (extension === "gpx") return "gpx";

    // Check content for GPX XML
    if (content.trim().startsWith("<?xml") || content.includes("<gpx")) {
      return "gpx";
    }

    // Check for JSON (Suunto format)
    if (extension === "json") {
      try {
        const parsed = JSON.parse(content);
        // Suunto files typically have these fields
        if (parsed.DeviceName || parsed.Samples || parsed.Header) {
          return "suunto";
        }
      } catch {
        // Not valid JSON
      }
    }

    return null;
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      try {
        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsText(file);
        });

        // Auto-detect format
        const format = detectFormat(file, content);

        if (!format) {
          throw new Error(
            "Unrecognized file format. Please upload a GPX file or Suunto JSON export."
          );
        }

        setDetectedFormat(format);

        if (format === "gpx") {
          // Parse as GPX
          const result = parseGpx(content);

          // Simplify track for storage (max 500 points)
          const simplifiedCoords = simplifyTrack(result.coordinates, 500);
          const simplifiedGpx = createSimplifiedGpx(simplifiedCoords, {
            name: file.name.replace(".gpx", ""),
            time: result.startTime,
          });

          setGpxResult(result);
          setSuuntoResult(null);

          onGpxParsed({
            gpxData: simplifiedGpx,
            distanceMiles: result.totalDistanceMiles,
            elevationGainFeet: result.totalElevationGainFeet,
            startCoords: result.startCoords!,
            endCoords: result.endCoords!,
            trackPointCount: result.coordinates.length,
          });
          onSuuntoParsed(null);
        } else if (format === "suunto") {
          // Parse as Suunto JSON
          const result = parseSuuntoJson(content);

          const startCoords: [number, number] | null =
            result.gpsTrack.length > 0
              ? [result.gpsTrack[0].lat, result.gpsTrack[0].lon]
              : null;

          setSuuntoResult(result);
          setGpxResult(null);

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
          onGpxParsed(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse file";
        setError(message);
        setGpxResult(null);
        setSuuntoResult(null);
        setDetectedFormat(null);
        onGpxParsed(null);
        onSuuntoParsed(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onGpxParsed, onSuuntoParsed]
  );

  const handleRemove = useCallback(() => {
    setGpxResult(null);
    setSuuntoResult(null);
    setDetectedFormat(null);
    setFileName(null);
    setError(null);
    onGpxParsed(null);
    onSuuntoParsed(null);
  }, [onGpxParsed, onSuuntoParsed]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const hasResult = gpxResult || suuntoResult;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* File Upload - Show when no result and no existing data */}
      {!hasResult && !hasExisting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".gpx,.json,application/gpx+xml,application/json,text/xml"
              onChange={handleFileChange}
              disabled={disabled || isLoading}
              className="h-10"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a GPX file or Suunto JSON export. Format is auto-detected.
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

      {/* GPX Success State */}
      {gpxResult && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <Map className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                GPX Track Imported
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

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-semibold">
                  {gpxResult.totalDistanceMiles}
                </span>
                <span className="text-muted-foreground ml-1">miles</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-semibold">
                  {gpxResult.totalElevationGainFeet.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">ft gain</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {gpxResult.coordinates.length.toLocaleString()} track points recorded
          </p>
        </div>
      )}

      {/* Suunto Success State */}
      {suuntoResult && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-violet-500" />
              <Watch className="h-4 w-4 text-violet-500" />
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
              <span className="font-semibold">{suuntoResult.distanceMiles}</span>
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">
                {suuntoResult.elevation.ascentFeet.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">ft</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">
                {formatDuration(suuntoResult.durationSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold">{suuntoResult.heartRate.avgBpm}</span>
              <span className="text-xs text-muted-foreground">bpm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">
                {suuntoResult.stepCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-semibold">{suuntoResult.caloriesBurned}</span>
              <span className="text-xs text-muted-foreground">cal</span>
            </div>
          </div>

          {suuntoResult.gpsTrack.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {suuntoResult.gpsTrack.length.toLocaleString()} GPS points &bull;{" "}
              {suuntoResult.laps.length} laps recorded
            </p>
          )}
        </div>
      )}

      {/* Existing Data State */}
      {hasExisting && !hasResult && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasExistingSuunto ? (
                <Watch className="h-4 w-4 text-violet-500" />
              ) : (
                <Map className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm font-medium">
                {hasExistingSuunto ? "Suunto Data" : "GPX Track"} Attached
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
          <p className="text-xs text-muted-foreground">
            {hasExistingSuunto
              ? "This entry has Suunto watch data. Heart rate, steps, and other metrics will be displayed."
              : "This entry has GPX track data. The route will be displayed on the map."}
          </p>
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground block mb-2">
              Replace with new file:
            </Label>
            <Input
              type="file"
              accept=".gpx,.json,application/gpx+xml,application/json,text/xml"
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
