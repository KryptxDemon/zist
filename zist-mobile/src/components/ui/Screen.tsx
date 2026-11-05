import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
  type RefreshControlProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

export interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (most screens). */
  scroll?: boolean;
  /** Apply the standard horizontal page padding. */
  padded?: boolean;
  /** Extra bottom padding for screens that sit above the tab bar. */
  bottomInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  /** Hero/gradient background used by Dashboard and profile headers. */
  variant?: "plain" | "gradient";
  /**
   * Decorations painted behind the scrolling content and pinned to the viewport
   * (they do not scroll). The web uses a `pointer-events-none absolute inset-0`
   * layer for its radial washes; pass `<RadialGlow />` elements here.
   */
  backdrop?: React.ReactNode;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "refreshControl">;
}

/**
 * Page container: safe-area aware, themed background, optional scrolling and
 * pull-to-refresh. Replaces the web `<AppLayout>` content wrapper.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  bottomInset = 0,
  refreshControl,
  contentContainerStyle,
  style,
  variant = "plain",
  backdrop,
  scrollProps,
}: ScreenProps) {
  const { colors, gradient } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = padded ? { paddingHorizontal: 16 } : null;

  const inner: ViewStyle = {
    paddingTop: 12,
    paddingBottom: insets.bottom + 24 + bottomInset,
    gap: 16,
  };

  return (
    <View
      style={[
        { flex: 1, backgroundColor: variant === "gradient" ? gradient.background[0] : colors.background },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
      >
        {backdrop}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {scroll ? (
          <ScrollView
            {...scrollProps}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[inner, padding, contentContainerStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[inner, padding, { flex: 1 }, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Vertical stack with consistent gap. */
export function Stack({
  children,
  gap = 12,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/** Horizontal row with consistent gap + centering. */
export function Row({
  children,
  gap = 8,
  style,
  justify,
  align = "center",
  wrap,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
  justify?: ViewStyle["justifyContent"];
  align?: ViewStyle["alignItems"];
  wrap?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const screenStyles = StyleSheet.create({});
