import React from "react";
import { View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { Text } from "@/components/ui";

/** Compact metric tile used across the Insights screen. */
export function StatCard({
  label,
  value,
  hint,
  tint,
  icon,
  style,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tint?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        {
          flexGrow: 1,
          flexBasis: 150,
          borderRadius: radius["2xl"],
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 16,
          gap: 6,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon}
        <Text variant="small" numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text variant="h2" weight="semibold" tint={tint}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" numberOfLines={3}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Title + surface used to frame each chart, on the web's `rounded-2xl` card. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        {
          borderRadius: radius["2xl"],
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 16,
          gap: 14,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h4">{title}</Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

/** One row inside the "recent activity" list. */
export function ActivityRow({
  badge,
  title,
  meta,
  right,
}: {
  badge: React.ReactNode;
  title: string;
  meta?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {badge}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="small" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" numberOfLines={1} tint={colors.mutedForeground}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
