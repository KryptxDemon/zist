import React from "react";
import { Pressable, View } from "react-native";
import { Check, X } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Text } from "@/components/ui";
import { QUIZ_CORRECT, QUIZ_CORRECT_BG, QUIZ_CORRECT_BORDER } from "./colors";

export type QuizOptionState = "idle" | "selected" | "correct" | "wrong";

/**
 * A single tappable answer row. The state drives instant correct/incorrect
 * feedback colouring (green for the right answer, destructive red for a wrong
 * pick) while keeping idle/selected styling close to the web page.
 */
export function QuizOptionRow({
  label,
  state,
  disabled,
  onPress,
}: {
  label: string;
  state: QuizOptionState;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();

  let backgroundColor = colors.accent + "4d";
  let borderColor = "transparent";
  let tint = colors.mutedForeground;

  if (state === "selected") {
    backgroundColor = colors.primary + "33";
    borderColor = colors.primary;
    tint = colors.foreground;
  } else if (state === "correct") {
    backgroundColor = QUIZ_CORRECT_BG;
    borderColor = QUIZ_CORRECT_BORDER;
    tint = colors.foreground;
  } else if (state === "wrong") {
    backgroundColor = colors.destructive + "1f";
    borderColor = colors.destructive;
    tint = colors.foreground;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: state === "selected", disabled }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 16,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor,
          backgroundColor,
        },
        pressed && !disabled ? { opacity: 0.85 } : null,
      ]}
    >
      <Text variant="body" tint={tint} style={{ flex: 1 }}>
        {label}
      </Text>
      {state === "correct" ? <Check size={18} color={QUIZ_CORRECT} /> : null}
      {state === "wrong" ? <X size={18} color={colors.destructive} /> : null}
      {state === "selected" ? <View style={{ width: 18 }} /> : null}
    </Pressable>
  );
}
