import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/theme";
import { toLocalDayKey } from "@/lib/time";
import { Text } from "@/components/ui";

/**
 * Chart primitives rebuilt with `react-native-svg` (the web app used
 * `recharts`). Every chart measures its own width with `onLayout` so it stays
 * responsive inside cards, and pulls its palette from `useTheme().colors`.
 */

export interface SeriesDatum {
  label: string;
  value: number;
  color?: string;
}

/** The `chart1`..`chart5` series palette (mirrors the web chart config). */
export function useChartColors(): string[] {
  const { colors } = useTheme();
  return useMemo(
    () => [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5],
    [colors],
  );
}

function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  return { width, onLayout };
}

/** Horizontal bars — the direct port of the web's vertical BarChart. */
export function HorizontalBarChart({
  data,
  barColor,
  maxRows = 8,
  valueSuffix = "",
  style,
}: {
  data: SeriesDatum[];
  barColor?: string;
  maxRows?: number;
  valueSuffix?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const chart = useChartColors();
  const { width, onLayout } = useMeasuredWidth();

  const rows = data.slice(0, maxRows);
  const max = Math.max(1, ...rows.map((row) => row.value));
  const labelWidth = 104;
  const valueWidth = 56;
  const trackWidth = Math.max(1, width - labelWidth - valueWidth - 16);

  return (
    <View style={style} onLayout={onLayout}>
      {rows.map((row, index) => {
        const fill = Math.max(3, trackWidth * (row.value / max));
        return (
          <View
            key={`${row.label}-${index}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}
          >
            <Text variant="caption" numberOfLines={1} style={{ width: labelWidth }}>
              {row.label}
            </Text>
            <Svg width={trackWidth} height={18}>
              <Rect x={0} y={4} width={trackWidth} height={10} rx={5} fill={colors.muted} />
              <Rect
                x={0}
                y={4}
                width={fill}
                height={10}
                rx={5}
                fill={row.color ?? barColor ?? chart[0]}
              />
            </Svg>
            <Text
              variant="caption"
              weight="medium"
              tint={colors.foreground}
              style={{ width: valueWidth, textAlign: "right" }}
            >
              {`${row.value}${valueSuffix}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Vertical columns — used for the per-media-type breakdown. */
export function VerticalBarChart({
  data,
  barColor,
  height = 168,
  style,
}: {
  data: SeriesDatum[];
  barColor?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const chart = useChartColors();
  const { width, onLayout } = useMeasuredWidth();

  const count = Math.max(1, data.length);
  const slot = width > 0 ? width / count : 48;
  const barWidth = Math.min(46, Math.max(14, slot - 16));
  const max = Math.max(1, ...data.map((row) => row.value));
  const chartHeight = height - 30;

  return (
    <View style={style} onLayout={onLayout}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: chartHeight, gap: 8 }}>
        {data.map((row, index) => {
          const barHeight = Math.max(3, (row.value / max) * (chartHeight - 22));
          return (
            <View key={`${row.label}-${index}`} style={{ flex: 1, alignItems: "center" }}>
              <Text variant="caption" weight="medium" tint={colors.foreground}>
                {row.value}
              </Text>
              <Svg width={barWidth} height={barHeight}>
                <Rect
                  x={0}
                  y={0}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={row.color ?? barColor ?? chart[0]}
                />
              </Svg>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        {data.map((row, index) => (
          <Text
            key={`${row.label}-label-${index}`}
            variant="caption"
            align="center"
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {row.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Donut — replaces the web's PieChart for distributions. */
export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
  style,
}: {
  data: SeriesDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const chart = useChartColors();

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, row) => sum + row.value, 0);

  let offset = 0;

  return (
    <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.muted}
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0
            ? data.map((row, index) => {
                const dash = (row.value / total) * circumference;
                const circle = (
                  <Circle
                    key={`${row.label}-${index}`}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={row.color ?? chart[index % chart.length]}
                    strokeWidth={thickness}
                    fill="none"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += dash;
                return circle;
              })
            : null}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        {centerValue !== undefined ? (
          <Text variant="h3" weight="semibold">
            {centerValue}
          </Text>
        ) : null}
        {centerLabel ? <Text variant="caption">{centerLabel}</Text> : null}
      </View>
    </View>
  );
}

/** Small colour key used beside donuts and bars. */
export function ChartLegend({
  data,
  style,
}: {
  data: SeriesDatum[];
  style?: ViewStyle;
}) {
  const chart = useChartColors();
  return (
    <View style={[{ gap: 8 }, style]}>
      {data.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: row.color ?? chart[index % chart.length],
            }}
          />
          <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
            {row.label}
          </Text>
          <Text variant="small" weight="medium">
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Line/area chart — the vocabulary-growth trend. */
export function LineChart({
  values,
  labels,
  height = 148,
  color,
  style,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const { width, onLayout } = useMeasuredWidth();
  const stroke = color ?? colors.chart1;

  const padX = 10;
  const padTop = 12;
  const padBottom = 8;
  const chartWidth = Math.max(1, width - padX * 2);
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(1, ...values);
  const count = values.length;
  const step = count > 1 ? chartWidth / (count - 1) : 0;

  const points = values.map((value, index) => ({
    x: padX + index * step,
    y: padTop + chartHeight - (value / max) * chartHeight,
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const area =
    first && last
      ? `${line} L ${last.x} ${padTop + chartHeight} L ${first.x} ${padTop + chartHeight} Z`
      : "";

  return (
    <View style={style} onLayout={onLayout}>
      <Svg width={Math.max(width, 1)} height={height}>
        <Line
          x1={padX}
          y1={padTop + chartHeight}
          x2={padX + chartWidth}
          y2={padTop + chartHeight}
          stroke={colors.border}
          strokeWidth={StyleSheet.hairlineWidth}
        />
        {area ? <Path d={area} fill={stroke} fillOpacity={0.14} /> : null}
        {line ? <Path d={line} stroke={stroke} strokeWidth={2.5} fill="none" /> : null}
        {points.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={3} fill={stroke} />
        ))}
      </Svg>
      {labels && labels.length === values.length ? (
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          {labels.map((label, index) => (
            <Text key={`${label}-${index}`} variant="caption" align="center" style={{ flex: 1 }}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** GitHub-style activity grid built from `toLocalDayKey` buckets. */
export function ActivityHeatmap({
  counts,
  weeks = 12,
  cell = 13,
  gap = 3,
  style,
}: {
  counts: Record<string, number>;
  weeks?: number;
  cell?: number;
  gap?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  const columns = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    // Align the grid to the current week (Sunday start) and go back `weeks`.
    start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

    const max = Math.max(1, ...Object.values(counts));
    const grid: { key: string; count: number; future: boolean }[][] = [];

    for (let week = 0; week < weeks; week++) {
      const column: { key: string; count: number; future: boolean }[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7 + day);
        const key = toLocalDayKey(date);
        column.push({
          key,
          count: counts[key] ?? 0,
          future: date.getTime() > today.getTime(),
        });
      }
      grid.push(column);
    }
    return { grid, max };
  }, [counts, weeks]);

  return (
    <View style={[{ flexDirection: "row", gap, justifyContent: "space-between" }, style]}>
      {columns.grid.map((column, columnIndex) => (
        <View key={columnIndex} style={{ gap }}>
          {column.map((entry) => {
            const intensity = entry.count === 0 ? 0 : 0.28 + 0.72 * (entry.count / columns.max);
            return (
              <View
                key={entry.key}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 3,
                  backgroundColor: entry.future ? "transparent" : colors.muted,
                }}
              >
                {!entry.future && entry.count > 0 ? (
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 3,
                      backgroundColor: colors.chart1,
                      opacity: intensity,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
