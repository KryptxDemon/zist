import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { Badge, Text } from "@/components/ui";
import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/types";
import { isWithinLastDays } from "@/lib/time";
import { fallbackCover } from "./covers";

const RAIL_CARD_WIDTH = 150;

export interface DashboardRailProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  coverById: Record<string, string>;
  themesByMedia: Record<string, number>;
  quotesByMedia: Record<string, number>;
}

/**
 * Horizontally scrolling media rail — the mobile port of the web Dashboard's
 * `HorizontalRail` + `CoverRailCard`. Renders nothing when it has no items.
 */
export function DashboardRail({
  title,
  subtitle,
  items,
  coverById,
  themesByMedia,
  quotesByMedia,
}: DashboardRailProps) {
  const router = useRouter();

  if (!items.length) return null;

  return (
    <View style={{ gap: 12 }}>
      {title ? (
        <View style={{ gap: 2, paddingHorizontal: 2 }}>
          <Text variant="h3">{title}</Text>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 2, paddingBottom: 4 }}
      >
        {items.map((item) => (
          <RailCard
            key={item.id}
            item={item}
            cover={coverById[item.id] || fallbackCover(item.type)}
            themes={themesByMedia[item.id] ?? 0}
            quotes={quotesByMedia[item.id] ?? 0}
            onPress={() => router.push({ pathname: "/media/[id]", params: { id: item.id } })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RailCard({
  item,
  cover,
  themes,
  quotes,
  onPress,
}: {
  item: MediaItem;
  cover: string;
  themes: number;
  quotes: number;
  onPress: () => void;
}) {
  const isNew = isWithinLastDays(item.createdAt, 7);
  // Per-card width is applied by a wrapper so MediaCard's own layout stays
  // untouched (it fills its parent).
  return (
    <Pressable onPress={onPress} style={{ width: RAIL_CARD_WIDTH }}>
      <MediaCard layout="grid" media={{ ...item, coverUrl: cover }} onPress={onPress} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 4,
          marginTop: 2,
        }}
      >
        {isNew ? <Badge variant="success" label="New" /> : null}
        {themes > 0 ? <Badge variant="outline" label={`${themes} Concepts`} /> : null}
        {quotes > 0 ? <Badge variant="outline" label={`${quotes} Quotes`} /> : null}
      </View>
    </Pressable>
  );
}
