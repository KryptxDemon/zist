import React from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme";
import { Text, type TextProps } from "./Text";

export interface CardProps extends ViewProps {
  /** `glass` matches the web `.glass` utility; `gradient` mirrors the hero cards. */
  variant?: "default" | "glass" | "gradient" | "outline";
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/** Card shell — the RN equivalent of shadcn's `<Card />`. */
export function Card({ variant = "default", padded = true, style, children, ...rest }: CardProps) {
  const { colors, radius, shadow } = useTheme();

  const isTransparentBg = variant === "outline" || variant === "gradient";
  const glass = variant === "glass";

  const base: ViewStyle = {
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: isTransparentBg ? "transparent" : colors.border,
    backgroundColor: isTransparentBg ? "transparent" : colors.card,
    padding: padded ? 16 : 0,
    overflow: "hidden",
    ...(glass ? shadow("sm") : null),
  };
  return (
    <View {...rest} style={[base, style]}>
      {variant === "gradient" ? (
        <LinearGradient
          colors={[colors.primary + "33", colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

export function CardHeader({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[{ gap: 6, marginBottom: 12 }, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ variant = "h3", ...rest }: TextProps) {
  return <Text variant={variant} {...rest} />;
}

export function CardDescription({ variant = "small", ...rest }: TextProps) {
  return <Text variant={variant} color="mutedForeground" {...rest} />;
}

export function CardContent({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[{ gap: 8 }, style]}>
      {children}
    </View>
  );
}

export function CardFooter({ style, children, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }, style]}
    >
      {children}
    </View>
  );
}

/** Section wrapper with a title + optional trailing action. */
export function Section({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 12 }, style]}>
      {title || action ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 2 }}>
            {title ? <Text variant="h3">{title}</Text> : null}
            {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
