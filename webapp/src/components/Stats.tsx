import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Mountain, TrendingUp, Calendar, MapPin } from "lucide-react";

interface StatsProps {
  totalMiles: number;
  milesCompleted: number;
  daysOnTrail: number;
  averageDailyMiles: number;
  totalElevationGain: number;
  className?: string;
}

export function Stats({
  totalMiles,
  milesCompleted,
  daysOnTrail,
  averageDailyMiles,
  totalElevationGain,
  className = "",
}: StatsProps) {
  const percentComplete = (milesCompleted / totalMiles) * 100;
  const milesRemaining = totalMiles - milesCompleted;

  return (
    <div className={className}>
      {/* Main progress card */}
      <Card className="mb-6 border-2 shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-bold">Trail Progress</h3>
              <span className="text-3xl font-bold text-primary">
                {percentComplete.toFixed(1)}%
              </span>
            </div>

            <Progress value={percentComplete} className="h-3" />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{milesCompleted.toFixed(1)} miles completed</span>
              <span>{milesRemaining.toFixed(0)} miles to go</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          label="Miles Hiked"
          value={milesCompleted.toFixed(1)}
          unit="mi"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Days on Trail"
          value={daysOnTrail.toString()}
          unit="days"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Avg Daily Miles"
          value={averageDailyMiles.toFixed(1)}
          unit="mi/day"
        />
        <StatCard
          icon={<Mountain className="h-5 w-5" />}
          label="Elevation Gain"
          value={totalElevationGain.toLocaleString()}
          unit="ft"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}

function StatCard({ icon, label, value, unit }: StatCardProps) {
  return (
    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="text-primary">{icon}</div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl md:text-3xl font-bold text-foreground">
              {value}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
