import React from "react";
import { View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { Progress, Text } from "@/components/ui";

/**
 * Small icon/value/label tile — the web `<StatCard />`. The `icon` node is
 * expected to be pre-coloured (e.g. `<Lightbulb size={20} color="#fbbf24" />`).
 */
export function StatCard({
  icon,
  label,
  value,
  style,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          flexGrow: 1,
          flexBasis: "45%",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderRadius: radius.xl,
          backgroundColor: colors.accent + "4d",
        },
        style,
      ]}
    >
      <View>{icon}</View>
      <Text variant="h3" weight="bold">
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

/** Labelled track + fill bar — web `<ProgressBar />`. */
export function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="small" color="mutedForeground">
          {label}
        </Text>
        <Text variant="small" weight="semibold">
          {value}/{max}
        </Text>
      </View>
      <Progress value={percentage} height={8} />
    </View>
  );
}

/** Wrapping pill row for media tags / vocab tags. */
export function TagRow({ tags }: { tags: string[] }) {
  const { colors, radius } = useTheme();
  if (tags.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {tags.map((tag) => (
        <View
          key={tag}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: radius.full,
            backgroundColor: colors.accent,
          }}
        >
          <Text variant="small" color="mutedForeground">
            {tag}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Bordered surface with a title row — the web `glass grain rounded-2xl` card. */
export function DetailSection({
  title,
  action,
  children,
  style,
}: {
  title?: string;
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
          gap: 12,
        },
        style,
      ]}
    >
      {title || action ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {title ? <Text variant="h4">{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
