import React from "react";
import { ScrollView, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

/** Pill-style segmented control (used for filters and mode switches). */
export function Segmented<T extends string>({
  value,
  onChange,
  items,
  style,
}: {
  value: T;
  onChange: (next: T) => void;
  items: TabItem<T>[];
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: 4,
          padding: 4,
          borderRadius: radius.lg,
          backgroundColor: colors.muted,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: radius.md,
              backgroundColor: active ? colors.card : "transparent",
            }}
          >
            {item.icon}
            <Text variant="small" weight="medium" tint={active ? colors.foreground : colors.mutedForeground}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Underline tab bar that scrolls horizontally — the RN version of `<Tabs />`. */
export function TabBar<T extends string>({
  value,
  onChange,
  items,
  style,
}: {
  value: T;
  onChange: (next: T) => void;
  items: TabItem<T>[];
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 4 }}
      style={style}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderBottomWidth: 2,
              borderBottomColor: active ? colors.primary : "transparent",
            }}
          >
            {item.icon}
            <Text
              variant="small"
              weight={active ? "semibold" : "medium"}
              tint={active ? colors.foreground : colors.mutedForeground}
            >
              {item.label}
            </Text>
            {item.badge != null ? (
              <View
                style={{
                  minWidth: 20,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 10,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                }}
              >
                <Text variant="caption" weight="medium">
                  {item.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Simple icon-over-label tab bar row. */
export function IconTabRow<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (next: T) => void;
  items: TabItem<T>[];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 6,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary + "14" : colors.card,
            }}
          >
            {item.icon}
            <Text
              variant="caption"
              weight={active ? "semibold" : "medium"}
              tint={active ? colors.primary : colors.mutedForeground}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const tabStyles = StyleSheet.create({});
