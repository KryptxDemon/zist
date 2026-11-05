import React, { useState } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Text } from "@/components/ui";
import { brandColors } from "@/theme/brandTokens";

/**
 * Primitives for the auth screens, transcribed from the web's `Login.css` /
 * `Signup.css`.
 *
 * Those files form a self-contained design system (their own `:root`, their own
 * type scale, 3px-radius inputs, pill CTAs) rather than using the app's Tailwind
 * tokens, so the shared UI kit's shapes don't apply here.
 */

/** `.login-title` — Boldonse, uppercase; the web clamps the size 34px–56px. */
export const authTitle: TextStyle = {
  fontFamily: "Boldonse_400Regular",
  fontSize: 34,
  lineHeight: 42,
  color: brandColors.paper,
  textTransform: "uppercase",
};

/** `.login-label` / `.login-forgot-link` / `.login-divider` — Geist Mono micro-type. */
export const authMono: TextStyle = {
  fontFamily: "GeistMono_400Regular",
  fontSize: 10,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

/** `.login-btn-signin` / `.login-btn-google` label. */
export const authButtonLabel: TextStyle = {
  fontFamily: "GeistMono_500Medium",
  fontSize: 11,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

/** `border-radius: 999px` — the web's pill CTAs. */
export const authPill: ViewStyle = { borderRadius: 999 };

/** `.login-btn-google` — transparent fill with a `--auth-line` hairline. */
export const authOutline: ViewStyle = {
  borderRadius: 999,
  borderColor: brandColors.line,
  backgroundColor: "transparent",
};

/**
 * `.login-input` — 3px radius, `--auth-card` fill, `--auth-line` border, and a
 * `--auth-lime` border on focus.
 */
export const AuthInput = React.forwardRef<
  any,
  TextInputProps & { trailing?: React.ReactNode }
>(function AuthInput({ trailing, style, onFocus, onBlur, multiline, ...rest }, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: multiline ? "flex-start" : "center",
        borderRadius: 3,
        borderWidth: 1,
        borderColor: focused ? brandColors.accent : brandColors.line,
        backgroundColor: brandColors.card,
        paddingHorizontal: 16,
      }}
    >
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={brandColors.soft}
        selectionColor={brandColors.accent}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          {
            flex: 1,
            paddingVertical: 14,
            color: brandColors.paper,
            fontFamily: "InterTight_400Regular",
            fontSize: 15,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
        {...rest}
      />
      {trailing}
    </View>
  );
});

/** `.login-field` — a mono uppercase label above the control. */
export function AuthField({
  label,
  hint,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text style={authMono} tint={brandColors.soft}>
          {label}
        </Text>
      ) : null}
      {children}
      {hint ? (
        <Text variant="caption" tint={brandColors.soft}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** `.login-signup-text` — the muted footnote under the form. */
export const authFootnote: TextStyle = {
  fontFamily: "InterTight_400Regular",
  fontSize: 14,
  color: brandColors.soft,
};
