import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseGpx,
  readGpxFile,
  isValidGpxFile,
  simplifyTrack,
  createSimplifiedGpx,
  type GpxParseResult,
} from "@/lib/gpx-parser";
import {
  FileUp,
  Map,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Navigation,
  TrendingUp,
} from "lucide-react";

export interface GpxUploadResult {
  gpxData: string;
  distanceMiles: number;
  elevationGainFeet: number;
  startCoords: [number, number];
  endCoords: [number, number];
  trackPointCount: number;
}

interface GpxFileUploadProps {
  onGpxParsed: (result: GpxUploadResult | null) => void;
  existingGpx?: string | null;
  disabled?: boolean;
  className?: string;
}

export function GpxFileUpload({
  onGpxParsed,
  existingGpx,
  disabled = false,
  className = "",
}: GpxFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<GpxParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Check if there's existing GPX data
  const hasExistingGpx = existingGpx && existingGpx.length > 0;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!isValidGpxFile(file)) {
        setError("Please select a valid GPX file");
        return;
      }

      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      try {
        // Read and parse the GPX file
        const content = await readGpxFile(file);
        const result = parseGpx(content);

        // Simplify track for storage (max 500 points)
        const simplifiedCoords = simplifyTrack(result.coordinates, 500);
        const simplifiedGpx = createSimplifiedGpx(simplifiedCoords, {
          name: file.name.replace(".gpx", ""),
          time: result.startTime,
        });

        setParseResult(result);

        // Notify parent with parsed data
        onGpxParsed({
          gpxData: simplifiedGpx,
          distanceMiles: result.totalDistanceMiles,
          elevationGainFeet: result.totalElevationGainFeet,
          startCoords: result.startCoords!,
          endCoords: result.endCoords!,
          trackPointCount: result.coordinates.length,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse GPX file";
        setError(message);
        setParseResult(null);
        onGpxParsed(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onGpxParsed]
  );

  const handleRemove = useCallback(() => {
    setParseResult(null);
    setFileName(null);
    setError(null);
    onGpxParsed(null);
  }, [onGpxParsed]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Map className="h-5 w-5 text-primary" />
        <Label className="text-sm font-medium">GPX Track Data</Label>
      </div>

      {/* File Upload */}
      {!parseResult && !hasExistingGpx && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".gpx,application/gpx+xml,text/xml,application/xml"
              onChange={handleFileChange}
              disabled={disabled || isLoading}
              className="h-10"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a GPX file from your Suunto, Garmin, or other fitness watch to automatically import your route.
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

      {/* Success State - Parsed GPX */}
      {parseResult && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">GPX Imported</span>
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
            <p className="text-xs text-muted-foreground truncate">
              {fileName}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-semibold">{parseResult.totalDistanceMiles}</span>
                <span className="text-muted-foreground ml-1">miles</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-semibold">{parseResult.totalElevationGainFeet.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">ft gain</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {parseResult.coordinates.length.toLocaleString()} track points recorded
          </p>
        </div>
      )}

      {/* Existing GPX State */}
      {hasExistingGpx && !parseResult && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">GPX Track Attached</span>
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
            This entry has GPX track data. The route will be displayed on the map.
          </p>
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground block mb-2">
              Replace with new GPX:
            </Label>
            <Input
              type="file"
              accept=".gpx,application/gpx+xml,text/xml,application/xml"
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
