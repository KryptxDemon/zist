import React from "react";
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Text } from "@/components/ui";

export interface QuickAction {
  label: string;
  description?: string;
  icon: React.ReactNode;
  onPress: () => void;
}

/**
 * "Continue learning actions" list — the mobile take on the web Dashboard's
 * grid of shortcut tiles (Add Concept / Explore Quotes / Grow Vocabulary),
 * extended with the Add Media, Library and Quiz routes for parity with the
 * hero CTAs.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { colors, radius } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.accent : colors.card,
          })}
        >
          <View
            style={{
              height: 38,
              width: 38,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary + "1a",
            }}
          >
            {action.icon}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" weight="semibold">
              {action.label}
            </Text>
            {action.description ? (
              <Text variant="caption">{action.description}</Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}
