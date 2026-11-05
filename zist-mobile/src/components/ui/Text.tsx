import React from "react";
import { StyleSheet, Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "lead"
  | "body"
  | "small"
  | "muted"
  | "label"
  | "caption";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Any key of the active theme's colour table. */
  color?: keyof ThemeColors;
  /** Explicit colour string, wins over `color`. */
  tint?: string;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: TextStyle["textAlign"];
  uppercase?: boolean;
  letterSpacing?: number;
}

/**
 * Themed text primitive. Display variants use Space Grotesk (like the web
 * app's `h1`–`h6`), everything else uses Inter Tight.
 */
export function Text({
  variant = "body",
  color = "foreground",
  tint,
  weight,
  align,
  uppercase,
  letterSpacing,
  style,
  ...rest
}: TextProps) {
  const { colors, fontFamily, fontSize } = useTheme();

  let resolvedColor: string = tint ?? colors[color];
  let variantStyle: TextStyle = {};
  switch (variant) {
    case "display":
      variantStyle = { fontFamily: fontFamily.displayBold, fontSize: fontSize["4xl"], lineHeight: 40 };
      break;
    case "h1":
      variantStyle = { fontFamily: fontFamily.displayBold, fontSize: fontSize["3xl"], lineHeight: 36 };
      break;
    case "h2":
      variantStyle = { fontFamily: fontFamily.displaySemibold, fontSize: fontSize["2xl"], lineHeight: 30 };
      break;
    case "h3":
      variantStyle = { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.xl, lineHeight: 26 };
      break;
    case "h4":
      variantStyle = { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.lg, lineHeight: 24 };
      break;
    case "lead":
      variantStyle = { fontFamily: fontFamily.body, fontSize: fontSize.lg, lineHeight: 24 };
      break;
    case "body":
      variantStyle = { fontFamily: fontFamily.body, fontSize: fontSize.base, lineHeight: 22 };
      break;
    case "small":
      variantStyle = { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 };
      break;
    case "muted":
      variantStyle = { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 };
      resolvedColor = tint ?? colors.mutedForeground;
      break;
    case "label":
      variantStyle = { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, lineHeight: 18 };
      break;
    case "caption":
      variantStyle = { fontFamily: fontFamily.body, fontSize: fontSize.xs, lineHeight: 16 };
      resolvedColor = tint ?? colors.mutedForeground;
      break;
  }

  const weightStyle: TextStyle = weight
    ? {
        fontFamily:
          variant === "display" || variant === "h1" || variant === "h2" || variant === "h3" || variant === "h4"
            ? weight === "bold"
              ? fontFamily.displayBold
              : weight === "semibold"
                ? fontFamily.displaySemibold
                : fontFamily.display
            : weight === "bold"
              ? fontFamily.bodyBold
              : weight === "semibold"
                ? fontFamily.bodySemibold
                : weight === "medium"
                  ? fontFamily.bodyMedium
                  : fontFamily.body,
      }
    : {};

  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: fontFamily.body, color: resolvedColor },
        variantStyle,
        weightStyle,
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: "uppercase" } : null,
        letterSpacing != null ? { letterSpacing } : null,
        style,
      ]}
    />
  );
}

/** Semantic heading shortcut used across pages. */
export function Heading({ variant = "h2", ...rest }: TextProps) {
  return <Text variant={variant} {...rest} />;
}

export const textStyles = StyleSheet.create({});
