import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { Text } from "./Text";

export function Separator({
  orientation = "horizontal",
  style,
}: {
  orientation?: "horizontal" | "vertical";
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        orientation === "horizontal"
          ? { height: StyleSheet.hairlineWidth, width: "100%" }
          : { width: StyleSheet.hairlineWidth, height: "100%" },
        { backgroundColor: colors.border },
        style,
      ]}
    />
  );
}

/** Track + fill bar — the RN port of shadcn's `<Progress />`. */
export function Progress({
  value = 0,
  height = 8,
  color,
  style,
}: {
  value?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      style={[
        {
          height,
          width: "100%",
          borderRadius: radius.full,
          backgroundColor: colors.secondary,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          height: "100%",
          width: `${clamped}%`,
          borderRadius: radius.full,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

/** Shimmering placeholder block (`skeleton-shimmer` on the web). */
export function Skeleton({
  width,
  height = 16,
  rounded = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius: rounded,
          backgroundColor: colors.muted,
          opacity: 0.7,
        },
        style,
      ]}
    />
  );
}

export function MediaCardSkeleton() {
  return (
    <View style={{ borderRadius: 20, overflow: "hidden", flex: 1 }}>
      <Skeleton height={210} rounded={0} />
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton height={20} width="75%" />
        <Skeleton height={16} width="50%" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton height={22} width={64} rounded={11} />
          <Skeleton height={22} width={80} rounded={11} />
        </View>
      </View>
    </View>
  );
}

export function ThemeCardSkeleton() {
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <Skeleton height={22} width="66%" />
      <Skeleton height={80} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Skeleton height={32} width={96} />
        <Skeleton height={32} width={96} />
      </View>
    </View>
  );
}

export function FeedPostSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Skeleton height={40} width={40} rounded={20} />
        <View style={{ gap: 8 }}>
          <Skeleton height={16} width={96} />
          <Skeleton height={12} width={64} />
        </View>
      </View>
      <Skeleton height={128} />
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Skeleton height={32} width={64} />
        <Skeleton height={32} width={64} />
      </View>
    </View>
  );
}

export function QuizCardSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Skeleton height={160} />
      <Skeleton height={22} width="75%" />
      <Skeleton height={16} width="50%" />
    </View>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text variant="muted">{label}</Text> : null}
    </View>
  );
}

/** Centered empty/zero-data state (port of `<EmptyState />`). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 16, gap: 8 },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            height: 64,
            width: 64,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.xl,
            backgroundColor: colors.accent,
            marginBottom: 8,
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text variant="h4" align="center">
        {title}
      </Text>
      <Text variant="muted" align="center" style={{ maxWidth: 320, marginBottom: 8 }}>
        {description}
      </Text>
      {action}
    </View>
  );
}

/** Star rating row used by media cards and detail views. */
export function StarRating({
  value,
  size = 16,
  onChange,
  max = 5,
}: {
  value: number;
  size?: number;
  max?: number;
  onChange?: (next: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }).map((_, index) => {
        const filled = index < Math.round(value);
        const star = (
          <Text
            variant="small"
            tint={filled ? "#eab308" : colors.mutedForeground}
            style={{ fontSize: size }}
          >
            {filled ? "★" : "☆"}
          </Text>
        );
        return onChange ? (
          <Pressable key={index} onPress={() => onChange(index + 1)} hitSlop={4}>
            {star}
          </Pressable>
        ) : (
          <View key={index}>{star}</View>
        );
      })}
    </View>
  );
}

export function Divider({ label }: { label?: string }) {
  const { colors } = useTheme();
  if (!label) return <Separator style={{ marginVertical: 16 }} />;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
      <Text variant="caption">{label}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
    </View>
  );
}
