import React, { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * A CSS-style radial glow, e.g. the web's
 * `radial-gradient(circle at 15% 10%, hsl(var(--primary)/0.22), transparent 35%)`.
 *
 * React Native has no `filter: blur()` and `expo-linear-gradient` is linear
 * only, so the web's blurred ornaments and radial washes are reproduced with an
 * SVG `RadialGradient` that fades from `color`/`opacity` to fully transparent.
 *
 * `cx`/`cy`/`r` accept percentages so the glow scales with its container.
 */
export function RadialGlow({
  color,
  opacity = 0.22,
  cx = "50%",
  cy = "50%",
  r = "50%",
  style,
}: {
  color: string;
  /** Peak opacity at the centre of the glow. */
  opacity?: number;
  /** Centre as a percentage of the container box. */
  cx?: string;
  cy?: string;
  /** Radius as a percentage of the container box. */
  r?: string;
  style?: StyleProp<ViewStyle>;
}) {
  // React's useId contains colons, which are not valid inside a `url(#…)`
  // reference in every SVG renderer.
  const gradientId = `glow-${useId().replace(/:/g, "")}`;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={gradientId} cx={cx} cy={cy} rx={r} ry={r} fx={cx} fy={cy}>
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
