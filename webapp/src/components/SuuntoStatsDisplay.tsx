import { useMemo, useState } from "react";
import {
  Heart,
  Activity,
  Thermometer,
  Mountain,
  Footprints,
  Flame,
  Clock,
  TrendingUp,
  Timer,
  Gauge,
  ChevronUp,
  ChevronDown,
  Watch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SuuntoParseResult, SuuntoLap } from "@/lib/suunto-parser";

interface SuuntoStatsDisplayProps {
  suuntoData: SuuntoParseResult;
}

// Helper to format pace as mm:ss
function formatPace(minPerMile: number): string {
  if (!minPerMile || minPerMile <= 0 || !isFinite(minPerMile)) return "--:--";
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper to format duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${secs}s`;
}

// HR Zone colors
const zoneColors = {
  zone1: { bg: "bg-blue-500", text: "text-blue-500", label: "Recovery" },
  zone2: { bg: "bg-green-500", text: "text-green-500", label: "Easy" },
  zone3: { bg: "bg-yellow-500", text: "text-yellow-500", label: "Aerobic" },
  zone4: { bg: "bg-orange-500", text: "text-orange-500", label: "Threshold" },
  zone5: { bg: "bg-red-500", text: "text-red-500", label: "Maximum" },
};

// Stat card component - compact design for mobile
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-md bg-background ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </p>
      </div>
      <p className="text-lg font-bold font-outfit leading-tight">{value}</p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

// HR Zone bar visualization
function HrZoneBar({
  zones,
}: {
  zones: SuuntoParseResult["heartRate"]["zones"];
}) {
  const totalPercentage =
    zones.zone1.percentage +
    zones.zone2.percentage +
    zones.zone3.percentage +
    zones.zone4.percentage +
    zones.zone5.percentage;

  if (totalPercentage === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-6 flex rounded-full overflow-hidden">
        {zones.zone1.percentage > 0 && (
          <div
            className={`${zoneColors.zone1.bg} transition-all`}
            style={{ width: `${zones.zone1.percentage}%` }}
            title={`Zone 1: ${zones.zone1.percentage.toFixed(1)}%`}
          />
        )}
        {zones.zone2.percentage > 0 && (
          <div
            className={`${zoneColors.zone2.bg} transition-all`}
            style={{ width: `${zones.zone2.percentage}%` }}
            title={`Zone 2: ${zones.zone2.percentage.toFixed(1)}%`}
          />
        )}
        {zones.zone3.percentage > 0 && (
          <div
            className={`${zoneColors.zone3.bg} transition-all`}
            style={{ width: `${zones.zone3.percentage}%` }}
            title={`Zone 3: ${zones.zone3.percentage.toFixed(1)}%`}
          />
        )}
        {zones.zone4.percentage > 0 && (
          <div
            className={`${zoneColors.zone4.bg} transition-all`}
            style={{ width: `${zones.zone4.percentage}%` }}
            title={`Zone 4: ${zones.zone4.percentage.toFixed(1)}%`}
          />
        )}
        {zones.zone5.percentage > 0 && (
          <div
            className={`${zoneColors.zone5.bg} transition-all`}
            style={{ width: `${zones.zone5.percentage}%` }}
            title={`Zone 5: ${zones.zone5.percentage.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {Object.entries(zoneColors).map(([key, config]) => {
          const zone = zones[key as keyof typeof zones];
          if (zone.percentage < 0.5) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${config.bg}`} />
              <span className="text-muted-foreground">
                {config.label}:{" "}
                <span className="font-medium text-foreground">
                  {zone.percentage.toFixed(0)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Elevation mini chart
function ElevationMiniChart({
  profile,
}: {
  profile: Array<{ distance: number; altitude: number }>;
}) {
  if (profile.length < 2) return null;

  const minAlt = Math.min(...profile.map((p) => p.altitude));
  const maxAlt = Math.max(...profile.map((p) => p.altitude));
  const range = maxAlt - minAlt || 1;
  const maxDist = Math.max(...profile.map((p) => p.distance));

  const points = profile
    .map((p) => {
      const x = (p.distance / maxDist) * 100;
      const y = 100 - ((p.altitude - minAlt) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  // Create filled area
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative h-20 w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id="elevGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon fill="url(#elevGradient)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Min/Max labels */}
      <div className="absolute top-0 right-0 text-[10px] text-muted-foreground">
        {Math.round(maxAlt)}m
      </div>
      <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">
        {Math.round(minAlt)}m
      </div>
    </div>
  );
}

// HR over time mini chart
function HrMiniChart({ hrData }: { hrData: Array<{ time: number; hr: number }> }) {
  if (hrData.length < 2) return null;

  const minHr = Math.min(...hrData.map((p) => p.hr));
  const maxHr = Math.max(...hrData.map((p) => p.hr));
  const range = maxHr - minHr || 1;
  const maxTime = Math.max(...hrData.map((p) => p.time));

  const points = hrData
    .map((p) => {
      const x = (p.time / maxTime) * 100;
      const y = 100 - ((p.hr - minHr) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative h-20 w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="hrGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon fill="url(#hrGradient)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute top-0 right-0 text-[10px] text-muted-foreground">
        {maxHr} bpm
      </div>
      <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground">
        {minHr} bpm
      </div>
    </div>
  );
}

// Lap splits table
function LapSplitsTable({ laps }: { laps: SuuntoLap[] }) {
  if (laps.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Pace</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <ChevronUp className="h-3 w-3" />
                <ChevronDown className="h-3 w-3" />
              </div>
            </TableHead>
            <TableHead>Avg HR</TableHead>
            <TableHead>Temp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {laps.map((lap) => (
            <TableRow key={lap.lapNumber} className="hover:bg-muted/50">
              <TableCell className="text-center font-medium">
                {lap.lapNumber}
              </TableCell>
              <TableCell className="font-medium">
                {lap.distanceMiles.toFixed(2)} mi
              </TableCell>
              <TableCell>{formatDuration(lap.durationSeconds)}</TableCell>
              <TableCell className="font-mono">
                {formatPace(lap.paceMinPerMile)}/mi
              </TableCell>
              <TableCell className="text-center">
                <span className="text-green-600 dark:text-green-400">
                  +{Math.round(lap.ascentMeters * 3.28084)}
                </span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-red-600 dark:text-red-400">
                  -{Math.round(lap.descentMeters * 3.28084)}
                </span>
                <span className="text-xs text-muted-foreground ml-0.5">ft</span>
              </TableCell>
              <TableCell>
                {lap.avgHrBpm ? (
                  <span className="text-red-500">{lap.avgHrBpm} bpm</span>
                ) : (
                  "--"
                )}
              </TableCell>
              <TableCell>
                {lap.avgTempCelsius !== null ? (
                  <span>{Math.round(lap.avgTempCelsius * 9/5 + 32)}°F</span>
                ) : (
                  "--"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SuuntoStatsDisplay({ suuntoData }: SuuntoStatsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { heartRate, pace, temperature, elevation, laps, elevationProfile, hrOverTime } =
    suuntoData;

  // Calculate effort score (combination of HR zones and elevation)
  const effortScore = useMemo(() => {
    const hrScore =
      heartRate.zones.zone1.percentage * 1 +
      heartRate.zones.zone2.percentage * 2 +
      heartRate.zones.zone3.percentage * 3 +
      heartRate.zones.zone4.percentage * 4 +
      heartRate.zones.zone5.percentage * 5;
    const elevationScore = (elevation.ascentFeet / suuntoData.distanceMiles) * 0.1;
    return Math.min(100, (hrScore / 5) * 0.7 + Math.min(30, elevationScore));
  }, [heartRate.zones, elevation.ascentFeet, suuntoData.distanceMiles]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent overflow-hidden"
        >
          {/* Header with Watch Icon */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shrink-0">
              <Watch className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left min-w-0">
              <h3 className="text-lg font-semibold font-outfit">Fitness Watch Data</h3>
              <p className="text-sm text-muted-foreground truncate">
                Recorded on {new Date(suuntoData.dateTime).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-6 pt-6">
          {/* Summary Stats Grid - 2x2 on mobile, 4 across on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          icon={Footprints}
          label="Steps"
          value={suuntoData.stepCount.toLocaleString()}
          subValue={`${suuntoData.stepsPerMile.toLocaleString()}/mi`}
          iconColor="text-violet-500"
        />
        <StatCard
          icon={Flame}
          label="Calories"
          value={suuntoData.caloriesBurned.toLocaleString()}
          subValue="kcal"
          iconColor="text-orange-500"
        />
        <StatCard
          icon={Clock}
          label="Duration"
          value={suuntoData.durationFormatted}
          subValue={`${Math.round(pace.movingTimeSeconds / 60)}m moving`}
          iconColor="text-blue-500"
        />
        <StatCard
          icon={Gauge}
          label="Avg Pace"
          value={formatPace(pace.avgPaceMinPerMile)}
          subValue={`${pace.avgSpeedMph.toFixed(1)} mph`}
          iconColor="text-green-500"
        />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="heart-rate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heart-rate" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Heart Rate</span>
          </TabsTrigger>
          <TabsTrigger value="elevation" className="gap-2">
            <Mountain className="h-4 w-4" />
            <span className="hidden sm:inline">Elevation</span>
          </TabsTrigger>
          <TabsTrigger value="laps" className="gap-2">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">Lap Splits</span>
          </TabsTrigger>
        </TabsList>

        {/* Heart Rate Tab */}
        <TabsContent value="heart-rate" className="mt-4 space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Heart Rate Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* HR Stats Row */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase">Min</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {heartRate.minBpm}
                  </p>
                  <p className="text-xs text-muted-foreground">bpm</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border-2 border-primary/20">
                  <p className="text-xs text-muted-foreground uppercase">Avg</p>
                  <p className="text-2xl font-bold text-primary">
                    {heartRate.avgBpm}
                  </p>
                  <p className="text-xs text-muted-foreground">bpm</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase">Max</p>
                  <p className="text-2xl font-bold text-red-500">
                    {heartRate.maxBpm}
                  </p>
                  <p className="text-xs text-muted-foreground">bpm</p>
                </div>
              </div>

              {/* HR Chart */}
              {hrOverTime.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2 uppercase">
                    Heart Rate Over Time
                  </p>
                  <HrMiniChart hrData={hrOverTime} />
                </div>
              )}

              {/* HR Zones */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-3 uppercase">
                  Time in Heart Rate Zones
                </p>
                <HrZoneBar zones={heartRate.zones} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Elevation Tab */}
        <TabsContent value="elevation" className="mt-4 space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mountain className="h-4 w-4 text-primary" />
                Elevation Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Elevation Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronUp className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-muted-foreground uppercase">
                      Ascent
                    </p>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    +{elevation.ascentFeet.toLocaleString()} ft
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(pace.ascentTimeSeconds)} climbing
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronDown className="h-4 w-4 text-red-500" />
                    <p className="text-xs text-muted-foreground uppercase">
                      Descent
                    </p>
                  </div>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    -{elevation.descentFeet.toLocaleString()} ft
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(pace.descentTimeSeconds)} descending
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase mb-1">
                    Min Altitude
                  </p>
                  <p className="text-xl font-bold">
                    {elevation.minAltitudeFeet.toLocaleString()} ft
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase mb-1">
                    Max Altitude
                  </p>
                  <p className="text-xl font-bold">
                    {elevation.maxAltitudeFeet.toLocaleString()} ft
                  </p>
                </div>
              </div>

              {/* Elevation Chart */}
              {elevationProfile.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2 uppercase">
                    Elevation Profile
                  </p>
                  <ElevationMiniChart profile={elevationProfile} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Temperature Card */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                Trail Temperature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center px-4">
                  <p className="text-xs text-muted-foreground uppercase">Min</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {temperature.minFahrenheit}°F
                  </p>
                </div>
                <div className="flex-1 px-4">
                  <div className="relative h-3 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full shadow"
                      style={{
                        left: `${
                          ((temperature.avgFahrenheit - temperature.minFahrenheit) /
                            (temperature.maxFahrenheit - temperature.minFahrenheit || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-center text-sm font-medium mt-2">
                    Avg: {temperature.avgFahrenheit}°F
                  </p>
                </div>
                <div className="text-center px-4">
                  <p className="text-xs text-muted-foreground uppercase">Max</p>
                  <p className="text-2xl font-bold text-red-500">
                    {temperature.maxFahrenheit}°F
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Laps Tab */}
        <TabsContent value="laps" className="mt-4">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Lap Splits ({laps.length} laps)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              {laps.length > 0 ? (
                <LapSplitsTable laps={laps} />
              ) : (
                <p className="text-sm text-muted-foreground p-4">
                  No lap data available for this activity.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Effort Score */}
      <Card className="border-2 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Effort Score</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {effortScore.toFixed(0)}
            </span>
          </div>
          <Progress value={effortScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on heart rate zones and elevation gain per mile
          </p>
        </CardContent>
      </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
