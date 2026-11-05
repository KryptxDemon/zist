import React from "react";
import { Image } from "react-native";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { useRouter } from "expo-router";

import { useTheme } from "@/theme";
import { Pressable } from "react-native";
import { isSvgDataUri, svgDataUriToXml } from "@/lib/avatar";
import { Text } from "./Text";

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, "2xl": 96 } as const;
export type AvatarSize = keyof typeof SIZES;

/**
 * Avatar artwork for a given URI. React Native's `Image` cannot draw SVG, so
 * generated (initials) avatars — stored by the web app as
 * `data:image/svg+xml,…` URIs — are rendered with `SvgXml` instead.
 */
function AvatarArt({ uri, size }: { uri: string; size: number }) {
  if (isSvgDataUri(uri)) {
    const xml = svgDataUriToXml(uri);
    if (xml) return <SvgXml xml={xml} width={size} height={size} />;
  }
  return (
    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
  );
}

export interface AvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: AvatarSize;
  userId?: string;
  clickable?: boolean;
  style?: ViewStyle;
  ring?: boolean;
}

/**
 * Circular avatar with a gradient initial fallback — mirrors the web
 * `<UserAvatar />` (including tapping through to `/app/user/:id`).
 */
export function Avatar({
  name,
  avatarUrl,
  size = "md",
  userId,
  clickable = true,
  style,
  ring,
}: AvatarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const dim = SIZES[size];
  const initial = name?.trim()?.[0]?.toUpperCase() || "U";

  const canNavigate = clickable && !!userId;

  return (
    <Pressable
      disabled={!canNavigate}
      onPress={() => {
        if (canNavigate) router.push(`/user/${userId}`);
      }}
      style={[
        {
          height: dim,
          width: dim,
          borderRadius: dim / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary + "26",
          borderWidth: ring ? 2 : 0,
          borderColor: colors.primary + "66",
        },
        style,
      ]}
    >
      {avatarUrl ? (
        <AvatarArt uri={avatarUrl} size={dim} />
      ) : (
        <Text
          variant="small"
          tint={colors.primary}
          weight="semibold"
          style={{ fontSize: Math.max(10, dim * 0.4) }}
        >
          {initial}
        </Text>
      )}
    </Pressable>
  );
}

/** Avatar used inside the top bar — gradient fill + white initial. */
export function GradientAvatar({
  name,
  avatarUrl,
  size = 36,
  userId,
}: {
  name?: string;
  avatarUrl?: string;
  size?: number;
  userId?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => userId && router.push(`/user/${userId}`)}
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f3d52",
      }}
    >
      {avatarUrl ? (
        <AvatarArt uri={avatarUrl} size={size} />
      ) : (
        <Text variant="small" tint="#ffffff" weight="medium">
          {name?.[0]?.toUpperCase() || "U"}
        </Text>
      )}
    </Pressable>
  );
}

/** Avatar + name + secondary line, used in feed posts and friend rows. */
export function AvatarRow({
  name,
  avatarUrl,
  userId,
  subtitle,
  size = "md",
  trailing,
  onPress,
}: {
  name: string;
  avatarUrl?: string;
  userId?: string;
  subtitle?: string;
  size?: AvatarSize;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
      <Avatar name={name} avatarUrl={avatarUrl} size={size} userId={userId} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}
