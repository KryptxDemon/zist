import React from "react";
import { View } from "react-native";
import { Pencil, Plus, Star } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Row, Sheet, Text } from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import {
  getMediaLabel,
  getMissingCreator,
  getResultCover,
  getResultTags,
  MISSING_DESCRIPTION,
  type MediaResultItem,
} from "./mediaResult";

/**
 * Clean preview sheet for a search result before adding it to the library.
 */
export function MediaPreviewSheet({
  item,
  isAdding = false,
  onClose,
  onAutofill,
  onAdd,
}: {
  item: MediaResultItem | null;
  isAdding?: boolean;
  onClose: () => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
}) {
  const { colors } = useTheme();

  if (!item) {
    return <Sheet visible={false} onClose={onClose} />;
  }

  const isBook = item.type === "book";
  const cover = getResultCover(item);
  const tags = getResultTags(item);
  const meta = [getMediaLabel(item.type), item.year ? String(item.year) : null, item.creator]
    .filter(Boolean)
    .join(" · ");

  return (
    <Sheet
      visible
      onClose={onClose}
      title={item.title}
      description={meta}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            fullWidth
            label="Add to Library"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            loading={isAdding}
            disabled={isAdding}
            onPress={() => onAdd(item)}
          />
          <Button
            variant="secondary"
            fullWidth
            label="Edit details first"
            icon={<Pencil size={15} color={colors.secondaryForeground} />}
            onPress={() => onAutofill(item)}
          />
          <Button variant="ghost" fullWidth label="Close" onPress={onClose} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ width: 112 }}>
          <MediaPoster coverUrl={cover} type={item.type} title={item.title} height={168} style={{ width: 112 }} />
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: colors.primary + "1a",
              }}
            >
              <Text variant="caption" tint={colors.primary} weight="medium">
                {getMediaLabel(item.type)}
              </Text>
            </View>
            {item.year ? (
              <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text variant="caption" color="mutedForeground">
                  {item.year}
                </Text>
              </View>
            ) : null}
            {typeof item.rating === "number" ? (
              <Row
                gap={4}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Star size={12} color="#eab308" />
                <Text variant="caption" color="mutedForeground">
                  {item.rating.toFixed(1)}
                </Text>
              </Row>
            ) : null}
          </View>

          <View style={{ gap: 2 }}>
            <Text variant="caption" uppercase letterSpacing={1}>
              {isBook ? "Author" : "Creator"}
            </Text>
            <Text variant="small" weight="medium">
              {item.creator || getMissingCreator(isBook)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text variant="caption" uppercase letterSpacing={1}>
          About
        </Text>
        <Text variant="small" color="mutedForeground">
          {item.description || MISSING_DESCRIPTION}
        </Text>
      </View>

      {tags.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text variant="caption" uppercase letterSpacing={1}>
            Genres & tags
          </Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text variant="caption" color="mutedForeground">
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
