import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Text } from "./Text";
import { Sheet } from "./Overlay";
import { Input, Label } from "./Input";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

/** Dropdown replacement: renders a trigger that opens a bottom-sheet list. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  label,
  style,
  disabled,
}: {
  value: T | null | undefined;
  onChange: (next: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Label>{label}</Label> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.input,
          backgroundColor: colors.card,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text variant="body" tint={selected ? colors.foreground : colors.mutedForeground}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? "Choose an option"}
        scrollable={options.length > 8}
      >
        <View>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" weight={active ? "semibold" : "regular"}>
                    {option.label}
                  </Text>
                  {option.description ? <Text variant="caption">{option.description}</Text> : null}
                </View>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/** Horizontally scrollable chip selector, used for compact filter bars. */
export function ChipSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  style,
}: {
  value: T | "all";
  onChange: (next: T | "all") => void;
  options: SelectOption<T>[];
  allLabel?: string;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const items: SelectOption<T | "all">[] = allLabel
    ? [{ value: "all" as const, label: allLabel }, ...options]
    : options;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={style}>
      {items.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              variant="small"
              weight="medium"
              tint={active ? colors.primaryForeground : colors.mutedForeground}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Search field with a leading icon, used by search screens. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  icon,
  style,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Input
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      icon={icon}
      containerStyle={style}
    />
  );
}
