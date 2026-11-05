import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Rendered inside the field, before the text. */
  icon?: React.ReactNode;
  /** Rendered inside the field, after the text (e.g. a password toggle). */
  trailing?: React.ReactNode;
  containerStyle?: ViewStyle | ViewStyle[];
}

/** Themed single-line (or multiline) text field. */
export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(function Input(
  { label, hint, error, icon, trailing, containerStyle, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, radius, fontFamily, fontSize } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.destructive : focused ? colors.ring : colors.input;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? <Label>{label}</Label> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          minHeight: multiline ? 96 : 44,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.card,
        }}
      >
        {icon}
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={colors.inputPlaceholder}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              color: colors.foreground,
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              paddingVertical: 10,
              textAlignVertical: multiline ? "top" : "center",
            },
            multiline ? { minHeight: 76 } : null,
            style,
          ]}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});

export function Textarea(props: InputProps) {
  return <Input multiline numberOfLines={4} {...props} />;
}

export function Label({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Text variant="label" weight="medium" style={[{ letterSpacing: 0.1 }, style as any]}>
      {children}
    </Text>
  );
}

/** Label + control + error, mirroring shadcn's `<FormItem />` layout. */
export function Field({
  label,
  hint,
  error,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

export const inputStyles = StyleSheet.create({});
