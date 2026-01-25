import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mountain,
  TrendingUp,
  Calendar,
  MapPin,
  Award,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Stats } from "@/lib/api";

interface EnhancedStatsProps {
  stats: Stats;
  className?: string;
}

const AT_TOTAL_MILES = 2190;

export function EnhancedStats({ stats, className = "" }: EnhancedStatsProps) {
  const [showEnhanced, setShowEnhanced] = useState(false);

  const milesRemaining = AT_TOTAL_MILES - stats.totalMiles;

  return (
    <div className={className}>
      {/* Main progress card */}
      <Card className="mb-6 border-2 shadow-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-bold font-outfit">Trail Progress</h3>
              <span className="text-3xl font-bold text-primary">
                {stats.percentComplete.toFixed(1)}%
              </span>
            </div>

            <Progress value={stats.percentComplete} className="h-3" />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{stats.totalMiles.toFixed(1)} miles completed</span>
              <span>{milesRemaining.toFixed(0)} miles to go</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          label="Miles Hiked"
          value={stats.totalMiles.toFixed(1)}
          unit="mi"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Days on Trail"
          value={stats.totalDays.toString()}
          unit="days"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Daily Average"
          value={stats.averageMilesPerDay.toFixed(1)}
          unit="mi/day"
        />
        <StatCard
          icon={<Mountain className="h-5 w-5" />}
          label="Elevation Gain"
          value={stats.totalElevationGain.toLocaleString()}
          unit="ft"
        />
      </div>

      {/* Toggle for Enhanced Stats */}
      <Button
        variant="outline"
        onClick={() => setShowEnhanced(!showEnhanced)}
        className="w-full mb-4"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {showEnhanced ? "Hide" : "Show"} Detailed Analytics
        {showEnhanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
      </Button>

      {/* Enhanced Stats Section (Collapsible) */}
      {showEnhanced && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Pace & Projections */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-outfit flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Pace & Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recent Pace (7-day)</p>
                  <p className="text-2xl font-bold">{stats.recentPace.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">mi/day</span></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                  <p className="text-2xl font-bold">{stats.daysRemaining || "—"} <span className="text-sm font-normal text-muted-foreground">days</span></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Projected Finish</p>
                  <p className="text-lg font-bold">
                    {stats.projectedCompletionDate
                      ? new Date(stats.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Records */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg font-outfit flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.longestDay && (
                  <div className="p-4 rounded-lg bg-accent/50 border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Longest Day</p>
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{stats.longestDay.miles.toFixed(1)} <span className="text-sm font-normal">miles</span></p>
                    <p className="text-xs text-muted-foreground truncate">{stats.longestDay.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(stats.longestDay.date).toLocaleDateString()}</p>
                  </div>
                )}
                {stats.biggestClimb && (
                  <div className="p-4 rounded-lg bg-accent/50 border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Biggest Climb</p>
                      <Mountain className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{stats.biggestClimb.elevation.toLocaleString()} <span className="text-sm font-normal">ft</span></p>
                    <p className="text-xs text-muted-foreground truncate">{stats.biggestClimb.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(stats.biggestClimb.date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-xl font-bold">{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'} in a row</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elevation Profile Chart */}
          {stats.elevationProfile.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg font-outfit flex items-center gap-2">
                  <Mountain className="h-5 w-5 text-primary" />
                  Elevation Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.elevationProfile}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dayNumber"
                        label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
                        className="text-xs"
                      />
                      <YAxis
                        label={{ value: 'Elevation Gain (ft)', angle: -90, position: 'insideLeft' }}
                        className="text-xs"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold">Day {data.dayNumber}</p>
                                <p className="text-sm text-muted-foreground">{new Date(data.date).toLocaleDateString()}</p>
                                <p className="text-sm mt-1">
                                  <span className="font-semibold text-primary">{data.elevation.toLocaleString()} ft</span> elevation gain
                                </p>
                                <p className="text-sm">{data.miles.toFixed(1)} miles hiked</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="elevation" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Miles Trend */}
          {stats.elevationProfile.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg font-outfit flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Daily Miles Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.elevationProfile}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dayNumber"
                        label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
                        className="text-xs"
                      />
                      <YAxis
                        label={{ value: 'Miles', angle: -90, position: 'insideLeft' }}
                        className="text-xs"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold">Day {data.dayNumber}</p>
                                <p className="text-sm text-muted-foreground">{new Date(data.date).toLocaleDateString()}</p>
                                <p className="text-sm mt-1">
                                  <span className="font-semibold text-primary">{data.miles.toFixed(1)} miles</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="miles"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
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
