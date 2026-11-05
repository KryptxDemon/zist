import React from "react";
import { View } from "react-native";
import { Check, Eye } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Card, Text } from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import {
  getMissingCreator,
  getResultCover,
  getResultTags,
  MISSING_DESCRIPTION,
  type MediaResultItem,
} from "./mediaResult";

/**
 * Result row for the external discovery search. Ported from the web
 * `components/feed/MediaResultCard` — callers own `onPreview`, `onAutofill`
 * and `onAdd` so the card stays decoupled from the AddMedia flow.
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
  const { colors } = useTheme();
  const cover = getResultCover(item);
  const tags = getResultTags(item);

  return (
    <Card variant="glass" style={{ padding: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 64 }}>
          <MediaPoster coverUrl={cover} type={item.type} height={100} style={{ width: 64 }} />
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text variant="label" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {item.title}
            </Text>
            {item.year ? (
              <Text variant="caption" color="mutedForeground">
                {item.year}
              </Text>
            ) : null}
          </View>

          <Text variant="caption" numberOfLines={1}>
            {item.creator || getMissingCreator(isBook)}
          </Text>

          <Text variant="small" numberOfLines={2}>
            {item.description || MISSING_DESCRIPTION}
          </Text>

          {tags.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {tags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 8,
                    paddingVertical: 1,
                  }}
                >
                  <Text variant="caption" color="mutedForeground">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <Button
          size="sm"
          variant="ghost"
          label="Preview"
          icon={<Eye size={15} color={colors.foreground} />}
          onPress={() => onPreview(item)}
        />
        <Button
          size="sm"
          variant="outline"
          label="Autofill"
          icon={<Check size={15} color={colors.foreground} />}
          onPress={() => onAutofill(item)}
        />
        <Button
          size="sm"
          label="Add"
          loading={isAdding}
          disabled={isAdding}
          onPress={() => onAdd(item)}
        />
      </View>
    </Card>
  );
}

/** Small heading + count used above each grouped result list. */
export function ResultGroupHeader({
  overline,
  title,
  count,
}: {
  overline: string;
  title: string;
  count: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" uppercase letterSpacing={1.5}>
          {overline}
        </Text>
        <Text variant="h4" weight="semibold">
          {title}
        </Text>
      </View>
      <View
        style={{
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
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
