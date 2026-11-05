import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme";
import { Text, type TextProps } from "./Text";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextProps["style"];
  children?: React.ReactNode;
}

const SIZES: Record<ButtonSize, { height: number; px: number; text: TextProps["variant"]; gap: number }> = {
  sm: { height: 36, px: 12, text: "small", gap: 6 },
  md: { height: 44, px: 16, text: "body", gap: 8 },
  lg: { height: 52, px: 24, text: "body", gap: 10 },
  icon: { height: 44, px: 0, text: "body", gap: 0 },
  iconSm: { height: 36, px: 0, text: "small", gap: 0 },
};

/**
 * Button primitive mirroring the shadcn button variants used by the web app
 * (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`) plus a
 * gradient `primary` variant used on hero/CTA surfaces.
 */
export function Button({
  variant = "default",
  size = "md",
  label,
  loading,
  icon,
  iconRight,
  fullWidth,
  disabled,
  style,
  textStyle,
  children,
  ...rest
}: ButtonProps) {
  const { colors, radius } = useTheme();
  const dims = SIZES[size];
  const isIcon = size === "icon" || size === "iconSm";
  const isDisabled = disabled || loading;

  const surface: ViewStyle = {
    height: dims.height,
    paddingHorizontal: isIcon ? 0 : dims.px,
    width: isIcon ? dims.height : undefined,
    borderRadius: variant === "link" ? 0 : radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: dims.gap,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : undefined,
  };

  let bg: string | undefined;
  let borderColor: string | undefined;
  let fg = colors.primaryForeground;

  switch (variant) {
    case "default":
    case "primary":
      bg = colors.primary;
      fg = colors.primaryForeground;
      break;
    case "secondary":
      bg = colors.secondary;
      fg = colors.secondaryForeground;
      break;
    case "destructive":
      bg = colors.destructive;
      fg = colors.destructiveForeground;
      break;
    case "outline":
      bg = "transparent";
      borderColor = colors.border;
      fg = colors.foreground;
      break;
    case "ghost":
      bg = "transparent";
      fg = colors.foreground;
      break;
    case "link":
      bg = "transparent";
      fg = colors.primary;
      break;
  }

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon}
          {label ? (
            <Text
              variant={dims.text}
              tint={fg}
              weight="medium"
              style={[variant === "link" ? { textDecorationLine: "underline" } : null, textStyle]}
            >
              {label}
            </Text>
          ) : (
            children
          )}
          {iconRight}
        </>
      )}
    </>
  );

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        surface,
        { backgroundColor: bg, borderWidth: borderColor ? 1 : 0, borderColor },
        variant === "ghost" && pressed ? { backgroundColor: colors.accent } : null,
        pressed && variant !== "ghost" && variant !== "link" ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: surface.borderRadius as number }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

/** Convenience wrapper for icon-only buttons. */
export function IconButton({
  size = "icon",
  ...rest
}: Omit<ButtonProps, "label" | "children"> & { children: React.ReactNode }) {
  return (
    <Button size={size} variant={rest.variant ?? "ghost"} {...rest}>
      <View style={{ alignItems: "center", justifyContent: "center" }}>{rest.children}</View>
    </Button>
  );
}

/** Small pill-shaped action used in filter rows. */
export function ChipButton({
  active,
  label,
  onPress,
  icon,
}: {
  active?: boolean;
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : "transparent",
      }}
    >
      {icon}
      <Text variant="small" weight="medium" tint={active ? colors.primaryForeground : colors.mutedForeground}>
        {label}
      </Text>
    </Pressable>
  );
}
