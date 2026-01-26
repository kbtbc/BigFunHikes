/**
 * ActivityCharts - Synchronized metrics charts for activity playback
 * Shows elevation, speed, and heart rate with playback position indicator
 * Supports segment highlighting when clicking/dragging on charts
 */

import { useMemo, useCallback, useState, useRef } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { formatDuration, metersToFeet, msToMph } from "@/lib/activity-data-parser";

interface ActivityChartsProps {
  dataPoints: ActivityDataPoint[];
  currentIndex: number;
  hasHeartRate: boolean;
  hasCadence: boolean;
  hasSpeed: boolean;
  onSeek: (index: number) => void;
  onHighlightSegment?: (segment: { start: number; end: number } | null) => void;
  duration: number; // seconds
}

interface ChartDataPoint {
  index: number;
  time: number; // seconds
  timeLabel: string;
  elevation?: number;
  elevationFt?: number;
  speed?: number;
  speedMph?: number;
  hr?: number;
  cadence?: number;
  distance?: number;
  distanceMi?: number;
}

export function ActivityCharts({
  dataPoints,
  currentIndex,
  hasHeartRate,
  hasCadence,
  hasSpeed,
  onSeek,
  onHighlightSegment,
  duration,
}: ActivityChartsProps) {
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const isSelecting = useRef(false);

  // Transform data for charts (downsample for performance)
  const chartData = useMemo(() => {
    const sampleRate = Math.max(1, Math.floor(dataPoints.length / 200));
    const data: ChartDataPoint[] = [];

    for (let i = 0; i < dataPoints.length; i += sampleRate) {
      const point = dataPoints[i];
      data.push({
        index: i,
        time: point.timestamp / 1000,
        timeLabel: formatDuration(point.timestamp / 1000),
        elevation: point.elevation,
        elevationFt: point.elevation !== undefined ? metersToFeet(point.elevation) : undefined,
        speed: point.speed,
        speedMph: point.speed !== undefined ? msToMph(point.speed) : undefined,
        hr: point.hr,
        cadence: point.cadence,
        distance: point.distance,
        distanceMi: point.distance !== undefined ? point.distance * 0.000621371 : undefined,
      });
    }

    return data;
  }, [dataPoints]);

  // Current time for reference line
  const currentTime = dataPoints[currentIndex]?.timestamp / 1000 || 0;

  // Handle chart click to seek
  const handleChartClick = useCallback(
    (data: { activePayload?: Array<{ payload: ChartDataPoint }> }) => {
      if (data.activePayload?.[0]?.payload) {
        const clickedIndex = data.activePayload[0].payload.index;
        onSeek(clickedIndex);
      }
    },
    [onSeek]
  );

  // Handle mouse down for segment selection
  const handleMouseDown = useCallback(
    (data: { activePayload?: Array<{ payload: ChartDataPoint }> }) => {
      if (data.activePayload?.[0]?.payload) {
        isSelecting.current = true;
        const timeLabel = data.activePayload[0].payload.timeLabel;
        setSelectionStart(timeLabel);
        setSelectionEnd(null);
      }
    },
    []
  );

  // Handle mouse move for segment selection
  const handleMouseMove = useCallback(
    (data: { activePayload?: Array<{ payload: ChartDataPoint }> }) => {
      if (isSelecting.current && data.activePayload?.[0]?.payload) {
        const timeLabel = data.activePayload[0].payload.timeLabel;
        setSelectionEnd(timeLabel);
      }
    },
    []
  );

  // Handle mouse up for segment selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && selectionStart && selectionEnd) {
      // Find indices for the selection
      const startData = chartData.find((d) => d.timeLabel === selectionStart);
      const endData = chartData.find((d) => d.timeLabel === selectionEnd);

      if (startData && endData && onHighlightSegment) {
        const startIdx = Math.min(startData.index, endData.index);
        const endIdx = Math.max(startData.index, endData.index);
        onHighlightSegment({ start: startIdx, end: endIdx });
      }
    }
    isSelecting.current = false;
  }, [selectionStart, selectionEnd, chartData, onHighlightSegment]);

  // Clear selection on double click
  const handleDoubleClick = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    onHighlightSegment?.(null);
  }, [onHighlightSegment]);

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(1)}
          </p>
        ))}
      </div>
    );
  };

  // Common chart event handlers
  const chartEvents = {
    onClick: handleChartClick,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onDoubleClick: handleDoubleClick,
  };

  return (
    <div className="space-y-4">
      {/* Instructions for segment selection */}
      {onHighlightSegment && (
        <p className="text-xs text-muted-foreground text-center">
          Click and drag on charts to highlight a segment on the map. Double-click to clear.
        </p>
      )}

      {/* Elevation Chart */}
      <div className="bg-muted/30 rounded-lg p-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Elevation (ft)
        </h4>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart
            data={chartData}
            {...chartEvents}
            style={{ cursor: "pointer" }}
          >
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4a7c59" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#4a7c59" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" hide />
            <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
            <Tooltip content={<CustomTooltip />} />
            {selectionStart && selectionEnd && (
              <ReferenceArea
                x1={selectionStart}
                x2={selectionEnd}
                fill="#f4a261"
                fillOpacity={0.3}
              />
            )}
            <Area
              type="monotone"
              dataKey="elevationFt"
              name="Elevation"
              stroke="#4a7c59"
              fill="url(#elevationGradient)"
              strokeWidth={2}
            />
            <ReferenceLine
              x={chartData.find((d) => d.time >= currentTime)?.timeLabel}
              stroke="#f4a261"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Speed Chart */}
      {hasSpeed && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Speed (mph)
          </h4>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart
              data={chartData}
              {...chartEvents}
              style={{ cursor: "pointer" }}
            >
              <XAxis dataKey="timeLabel" hide />
              <YAxis hide domain={[0, "dataMax + 1"]} />
              <Tooltip content={<CustomTooltip />} />
              {selectionStart && selectionEnd && (
                <ReferenceArea
                  x1={selectionStart}
                  x2={selectionEnd}
                  fill="#f4a261"
                  fillOpacity={0.3}
                />
              )}
              <Line
                type="monotone"
                dataKey="speedMph"
                name="Speed"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                x={chartData.find((d) => d.time >= currentTime)?.timeLabel}
                stroke="#f4a261"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Heart Rate Chart */}
      {hasHeartRate && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Heart Rate (bpm)
          </h4>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart
              data={chartData}
              {...chartEvents}
              style={{ cursor: "pointer" }}
            >
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timeLabel" hide />
              <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
              <Tooltip content={<CustomTooltip />} />
              {selectionStart && selectionEnd && (
                <ReferenceArea
                  x1={selectionStart}
                  x2={selectionEnd}
                  fill="#f4a261"
                  fillOpacity={0.3}
                />
              )}
              <Area
                type="monotone"
                dataKey="hr"
                name="Heart Rate"
                stroke="#ef4444"
                fill="url(#hrGradient)"
                strokeWidth={2}
              />
              <ReferenceLine
                x={chartData.find((d) => d.time >= currentTime)?.timeLabel}
                stroke="#f4a261"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cadence Chart */}
      {hasCadence && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Cadence (spm)
          </h4>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart
              data={chartData}
              {...chartEvents}
              style={{ cursor: "pointer" }}
            >
              <XAxis dataKey="timeLabel" hide />
              <YAxis hide domain={[0, "dataMax + 10"]} />
              <Tooltip content={<CustomTooltip />} />
              {selectionStart && selectionEnd && (
                <ReferenceArea
                  x1={selectionStart}
                  x2={selectionEnd}
                  fill="#f4a261"
                  fillOpacity={0.3}
                />
              )}
              <Line
                type="monotone"
                dataKey="cadence"
                name="Cadence"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                x={chartData.find((d) => d.time >= currentTime)?.timeLabel}
                stroke="#f4a261"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
