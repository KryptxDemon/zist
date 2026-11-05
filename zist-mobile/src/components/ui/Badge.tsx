import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";
import { Text, type TextProps } from "./Text";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

export interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

/** shadcn badge port with Zist's custom status hues. */
export function Badge({ children, label, variant = "default", icon, style }: BadgeProps) {
  const { colors, radius } = useTheme();

  let bg = colors.primary;
  let fg = colors.primaryForeground;
  let border = "transparent";

  switch (variant) {
    case "default":
      bg = colors.primary + "1f";
      fg = colors.primary;
      border = colors.primary + "33";
      break;
    case "secondary":
      bg = colors.secondary;
      fg = colors.secondaryForeground;
      break;
    case "outline":
      bg = "transparent";
      fg = colors.foreground;
      border = colors.border;
      break;
    case "destructive":
      bg = colors.destructive + "1f";
      fg = colors.destructive;
      border = colors.destructive + "33";
      break;
    case "success":
      bg = "#22c55e1f";
      fg = "#16a34a";
      border = "#22c55e33";
      break;
    case "warning":
      bg = "#f59e0b1f";
      fg = "#d97706";
      border = "#f59e0b33";
      break;
  }

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
        },
        style,
      ]}
    >
      {icon}
      {label ? (
        <Text variant="caption" tint={fg} weight="medium">
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const MEDIA_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  movie: { bg: "#3b82f61f", fg: "#2563eb" },
  tv: { bg: "#8b5cf61f", fg: "#7c3aed" },
  book: { bg: "#10b9811f", fg: "#059669" },
  documentary: { bg: "#f59e0b1f", fg: "#d97706" },
  podcast: { bg: "#ec48991f", fg: "#db2777" },
  game: { bg: "#06b6d41f", fg: "#0891b2" },
};

/** Media-type pill (`movie`, `tv`, `book`, …) with the web app's icon set. */
export function MediaTypeBadge({
  type,
  size = "sm",
  style,
}: {
  type: string;
  size?: "sm" | "md";
  style?: ViewStyle;
}) {
  const palette = MEDIA_TYPE_COLORS[type] ?? { bg: "#64748b1f", fg: "#475569" };
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          paddingHorizontal: size === "md" ? 10 : 8,
          paddingVertical: size === "md" ? 5 : 3,
          borderRadius: 999,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      <Text variant={size === "md" ? "small" : "caption"} tint={palette.fg} weight="semibold">
        {label}
      </Text>
    </View>
  );
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  planned: { bg: "#64748b1f", fg: "#475569", label: "Planned" },
  "in-progress": { bg: "#f59e0b1f", fg: "#d97706", label: "In Progress" },
  completed: { bg: "#22c55e1f", fg: "#16a34a", label: "Completed" },
};

/** Progress/status pill (`planned`, `in-progress`, `completed`). */
export function StatusBadge({
  status,
  style,
}: {
  status: string;
  style?: ViewStyle;
}) {
  const palette = STATUS_COLORS[status] ?? STATUS_COLORS.planned;
  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      <Text variant="caption" tint={palette.fg} weight="semibold">
        {palette.label}
      </Text>
    </View>
  );
}

export const badgeStyles = StyleSheet.create({});
export type { ThemeColors, TextProps };
