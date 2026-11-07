import React from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { Moon, Sun } from "lucide-react-native";

import { ThemeProvider, useTheme } from "@/theme";
import {
  brandColors,
  authGlow,
  authImageScrim,
  authImageScrimStops,
} from "@/theme/brandTokens";
import { RadialGlow } from "@/components/layout/RadialGlow";
import { IconButton, Text } from "@/components/ui";

/** The web's `.login-image` / `.signup-image` (`/bg.jpg`). */
const BRAND_IMAGE = require("../../../assets/brand/bg.jpg");
const LOGO_IMAGE = require("../../../assets/brand/zist-logo.png");

/**
 * Shared chrome for the login / signup / reset-password screens.
 *
 * The web has two different looks here and so do we:
 *
 * - `"identity"` (default, login + signup) reproduces the marketing identity
 *   from `Login.css` / `Signup.css`: a permanently dark `#080909` canvas with a
 *   `#55c7f2` accent, Boldonse display type, Geist Mono micro-labels and the
 *   `/bg.jpg` photograph. The web shows the photograph in a second column on
 *   wide viewports and hides it below 900px; on a phone we keep it as a scrimmed
 *   backdrop so the page still reads the same. The subtree is wrapped in a
 *   dark-locked `ThemeProvider` so the shared UI kit resolves dark tokens, since
 *   the web's auth pages ignore the app theme entirely.
 * - `"app"` keeps the ordinary themed layout, which is what the web's
 *   `ForgotPassword` page uses (glass card on `bg-background`, plus a theme
 *   toggle).
 */
export function AuthScaffold({
  children,
  variant = "identity",
}: {
  children: React.ReactNode;
  variant?: "identity" | "app";
}) {
  if (variant === "app") return <AppScaffold>{children}</AppScaffold>;

  return (
    <ThemeProvider lockedTheme="dark">
      <IdentityScaffold>{children}</IdentityScaffold>
    </ThemeProvider>
  );
}

/** Dark, photographic chrome for login / signup. */
function IdentityScaffold({ children }: { children: React.ReactNode }) {
  const { fontFamily } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ImageBackground
      source={BRAND_IMAGE}
      resizeMode="cover"
      style={{ flex: 1, backgroundColor: brandColors.bg }}
    >
      {/* The identity pages are dark whatever the app theme is. */}
      <StatusBar style="light" />
      {/* Keeps the form legible over the photograph. */}
      <LinearGradient
        colors={authImageScrim}
        locations={authImageScrimStops}
        style={StyleSheet.absoluteFill}
      />
      <RadialGlow
        color={brandColors.accent}
        opacity={authGlow.opacity}
        cx={authGlow.cx}
        cy={authGlow.cy}
        r={authGlow.r}
      />

      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 18,
          }}
        >
          <Image
            source={LOGO_IMAGE}
            style={{ height: 30, width: 30 }}
            resizeMode="contain"
          />
          <Text
            tint={brandColors.paper}
            uppercase
            style={{ fontFamily: fontFamily.authDisplay, fontSize: 18 }}
          >
            ZIST
          </Text>
          {/* `.login-return-link` / `.signup-return-link` */}
          <Pressable
            onPress={() => router.replace("/welcome")}
            hitSlop={8}
            style={{ marginLeft: "auto", flexShrink: 1 }}
          >
            <Text
              tint={brandColors.soft}
              numberOfLines={1}
              style={{
                fontFamily: fontFamily.geistMono,
                fontSize: 10,
                letterSpacing: 0.6,
                textAlign: "right",
                textTransform: "uppercase",
              }}
            >
              Back to landing page
            </Text>
          </Pressable>
        </View>
        {children}
      </View>
    </ImageBackground>
  );
}

/** Themed chrome used by pages that follow the app theme. */
function AppScaffold({ children }: { children: React.ReactNode }) {
  const { colors, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={LOGO_IMAGE}
            style={{ height: 40, width: 40, borderRadius: 12 }}
            resizeMode="contain"
          />
          <Text variant="h2" weight="bold" style={{ letterSpacing: 1.5 }}>
            ZIST
          </Text>
        </View>
        <IconButton onPress={toggleTheme} accessibilityLabel="Toggle theme">
          {theme === "light" ? (
            <Moon size={20} color={colors.mutedForeground} />
          ) : (
            <Sun size={20} color={colors.mutedForeground} />
          )}
        </IconButton>
      </View>
      {children}
    </View>
  );
}

/** Google's official four-colour "G" mark. */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

/** Horizontal "or" rule used between the credentials form and Google button. */
export function OrDivider({
  label = "or",
  style,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { fontFamily, fontSize } = useTheme();
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 13, marginVertical: 24 },
        style,
      ]}
    >
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: brandColors.line }} />
      <Text
        tint={brandColors.soft}
        uppercase
        style={{ fontFamily: fontFamily.geistMono, fontSize: fontSize.xs, letterSpacing: 1 }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: brandColors.line }} />
    </View>
  );
}
