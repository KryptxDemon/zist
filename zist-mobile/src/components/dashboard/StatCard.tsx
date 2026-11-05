import React from "react";
import { View } from "react-native";

import { useTheme } from "@/theme";
import { Text } from "@/components/ui";

export interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Accent colour for the icon chip; defaults to the primary token. */
  tint?: string;
}

/**
 * Compact metric tile used by the dashboard "learning snapshot" grid:
 * big Space Grotesk number, muted Inter Tight label, tinted icon chip.
 */
export function StatCard({ label, value, icon, tint }: StatCardProps) {
  const { colors, radius, shadow } = useTheme();
  const accent = tint ?? colors.primary;

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "47%",
        minWidth: 140,
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 14,
        gap: 8,
        ...shadow("sm"),
      }}
    >
      <View
        style={{
          height: 34,
          width: 34,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accent + "1f",
        }}
      >
        {icon}
      </View>
      <Text variant="h2">{String(value)}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
