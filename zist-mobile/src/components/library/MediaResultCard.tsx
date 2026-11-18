import React from "react";
import { Pressable, View } from "react-native";
import { Pencil, Plus } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Card, Text } from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import {
  getMediaLabel,
  getMissingCreator,
  getResultCover,
  type MediaResultItem,
} from "./mediaResult";

/**
 * Clean, scannable search result card for AddMedia.
 * Tapping the card opens the full preview; Edit opens the manual form prefilled;
 * Add saves straight to the user's library in one tap.
 */
export function MediaResultCard({
  item,
  isBook = false,
  isAdding = false,
  onPreview,
  onAutofill,
  onAdd,
}: {
  item: MediaResultItem;
  isBook?: boolean;
  isAdding?: boolean;
  onPreview: (item: MediaResultItem) => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
}) {
  const { colors, radius } = useTheme();
  const cover = getResultCover(item);

  return (
    <Card variant="glass" style={{ padding: 12 }}>
      <Pressable
        onPress={() => onPreview(item)}
        style={({ pressed }) => ({
          flexDirection: "row",
          gap: 12,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ width: 64 }}>
          <MediaPoster
            coverUrl={cover}
            type={item.type}
            title={item.title}
            height={96}
            style={{ width: 64 }}
          />
        </View>

        <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
          <Text variant="label" weight="semibold" numberOfLines={2}>
            {item.title}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <View
              style={{
                borderRadius: radius.full,
                backgroundColor: colors.primary + "1a",
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text variant="caption" tint={colors.primary} weight="medium">
                {getMediaLabel(item.type)}
              </Text>
            </View>
            {item.year ? (
              <Text variant="caption" color="mutedForeground">
                {item.year}
              </Text>
            ) : null}
          </View>

          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {item.creator || getMissingCreator(isBook)}
          </Text>

          {item.description ? (
            <Text variant="small" color="mutedForeground" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border + "66",
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          label="Edit"
          icon={<Pencil size={14} color={colors.mutedForeground} />}
          onPress={() => onAutofill(item)}
        />
        <Button
          size="sm"
          label="Add"
          icon={<Plus size={15} color={colors.primaryForeground} />}
          loading={isAdding}
          disabled={isAdding}
          onPress={() => onAdd(item)}
        />
      </View>
    </Card>
  );
}

/** Clean section label used above grouped search results. */
export function ResultGroupHeader({
  overline,
  title,
  count,
}: {
  overline?: string;
  title: string;
  count: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline ? (
          <Text variant="caption" uppercase letterSpacing={1.2}>
            {overline}
          </Text>
        ) : null}
        <Text variant="label" weight="semibold">
          {title}
        </Text>
      </View>
      <View
        style={{
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 2,
          backgroundColor: colors.primary + "1a",
        }}
      >
        <Text variant="caption" tint={colors.primary} weight="medium">
          {count}
        </Text>
      </View>
    </View>
  );
}
