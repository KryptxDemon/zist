import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { router } from "expo-router";

import { Avatar, Text } from "@/components/ui";
import { useTheme } from "@/theme";

interface FriendRowProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  /** Secondary line — friend status, request age, bio, etc. */
  subtitle?: string;
  /** Trailing node, e.g. a `<FriendActionButton />`. */
  trailing?: React.ReactNode;
  /** Override the default "push to /user/:id" behaviour. */
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * A single friend / request / search-result row: avatar, name, optional
 * subtitle and a trailing action. Tapping the row opens the user's profile.
 */
export function FriendRow({
  userId,
  name,
  avatarUrl,
  subtitle,
  trailing,
  onPress,
  style,
}: FriendRowProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress ?? (() => router.push(`/user/${userId}`))}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
      >
        <Avatar
          name={name}
          avatarUrl={avatarUrl}
          userId={userId}
          clickable={false}
          size="md"
        />
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
      </Pressable>
      {trailing}
    </View>
  );
}
