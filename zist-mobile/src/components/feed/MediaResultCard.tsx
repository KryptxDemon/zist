import React from "react";
import { Image, StyleSheet, View, type ViewStyle } from "react-native";
import { Check, Eye, Star } from "lucide-react-native";

import { useTheme } from "@/theme";
import type { MediaType } from "@/types";
import { Button, Sheet, Text } from "@/components/ui";

/**
 * Shared media-result UI used by the Feed discovery search (and reusable by the
 * Add flow). Callers provide their own `onPreview`, `onAutofill` and `onAdd`
 * callbacks so the card stays decoupled from any specific flow.
 *
 * Ported from `zist-frontend/src/components/feed/MediaResultCard.tsx` — the
 * helper exports (MISSING_*, getMissingCreator, getResultTags, fallbackCovers,
 * getResultCover, getMediaLabel) keep the same names/copy so both surfaces can
 * share the missing-data messaging.
 */

export interface MediaResultItem {
  external_id?: string;
  external_source?: string;
  title: string;
  type: MediaType;
  year?: number | null;
  creator?: string | null;
  description?: string | null;
  cover_url?: string | null;
  genres?: string[] | null;
  subjects?: string[] | null;
  rating?: number | null;
  work_id?: string | null;
  edition_keys?: string[] | null;
}

export const MISSING_CREATOR = "Creator not listed";
export const MISSING_AUTHOR = "Author not listed";
export const MISSING_DESCRIPTION =
  "No description available for this title yet. You can add your own notes after saving.";

export function getMissingCreator(isBook: boolean): string {
  return isBook ? MISSING_AUTHOR : MISSING_CREATOR;
}

export function getResultTags(item: MediaResultItem): string[] {
  const tags: string[] = [];
  if (Array.isArray(item.genres)) {
    tags.push(...item.genres.filter((g) => typeof g === "string" && g.trim()));
  }
  if (Array.isArray(item.subjects)) {
    tags.push(...item.subjects.filter((s) => typeof s === "string" && s.trim()));
  }
  return Array.from(new Set(tags)).slice(0, 8);
}

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV Show" },
  { value: "book", label: "Book" },
  { value: "documentary", label: "Documentary" },
  { value: "podcast", label: "Podcast" },
  { value: "game", label: "Game" },
];

export const fallbackCovers: Record<MediaType, string> = {
  movie:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
  documentary:
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
  podcast:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80",
  game: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=600&q=80",
};

export function getResultCover(
  item: Pick<MediaResultItem, "type" | "cover_url">,
): string {
  return item.cover_url || fallbackCovers[item.type] || fallbackCovers.movie;
}

export function getMediaLabel(type: MediaType): string {
  return mediaTypes.find((item) => item.value === type)?.label || type;
}

/** Small rounded label used for years, tags and provenance. */
function Pill({
  label,
  tint,
  backgroundColor,
  borderColor,
}: {
  label: string;
  tint: string;
  backgroundColor?: string;
  borderColor?: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
        borderColor,
        backgroundColor,
      }}
    >
      <Text variant="caption" tint={tint} style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export interface MediaResultCardProps {
  item: MediaResultItem;
  isBook?: boolean;
  isAdding?: boolean;
  isAlreadySaved?: boolean;
  onPreview: (item: MediaResultItem) => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
  style?: ViewStyle;
}

/** Compact search result row (cover + metadata + Preview/Autofill/Add). */
export function MediaResultCard({
  item,
  isBook = false,
  isAdding = false,
  isAlreadySaved = false,
  onPreview,
  onAutofill,
  onAdd,
  style,
}: MediaResultCardProps) {
  const { colors, radius, shadow } = useTheme();
  const cover = getResultCover(item);
  const tags = getResultTags(item);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: 12,
          padding: 12,
          borderRadius: radius["2xl"],
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        shadow("sm"),
        style,
      ]}
    >
      <View
        style={{
          height: 112,
          width: 80,
          borderRadius: radius.xl,
          overflow: "hidden",
          backgroundColor: colors.muted,
          justifyContent: "flex-end",
        }}
      >
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 4,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <Text variant="caption" tint="#ffffff" style={{ fontSize: 9, letterSpacing: 1 }} uppercase>
            {getMediaLabel(item.type)}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text variant="label" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.title}
          </Text>
          {item.year ? <Pill label={String(item.year)} tint={colors.mutedForeground} borderColor={colors.border} /> : null}
          {isAlreadySaved ? (
            <Pill label="In library" tint="#34d399" backgroundColor="rgba(16,185,129,0.12)" borderColor="rgba(52,211,153,0.4)" />
          ) : null}
        </View>

        <Text variant="caption" numberOfLines={1}>
          {item.creator || getMissingCreator(isBook)}
        </Text>

        <Text variant="small" color="mutedForeground" numberOfLines={2}>
          {item.description || MISSING_DESCRIPTION}
        </Text>

        {tags.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {tags.slice(0, 3).map((tag) => (
              <Pill key={tag} label={tag.toUpperCase()} tint={colors.mutedForeground} borderColor={colors.border} />
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          <Button
            variant="ghost"
            size="sm"
            label="Preview"
            icon={<Eye size={16} color={colors.foreground} />}
            onPress={() => onPreview(item)}
          />
          <Button
            variant="outline"
            size="sm"
            label="Autofill"
            icon={<Check size={16} color={colors.foreground} />}
            onPress={() => onAutofill(item)}
          />
          <Button
            size="sm"
            label={isAlreadySaved ? "Saved" : "Add"}
            loading={isAdding}
            disabled={isAdding || isAlreadySaved}
            onPress={() => onAdd(item)}
          />
        </View>
      </View>
    </View>
  );
}

export interface MediaPreviewSheetProps {
  item: MediaResultItem | null;
  isAdding?: boolean;
  isAlreadySaved?: boolean;
  onClose: () => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
}

/** Rich preview sheet — the RN replacement for the web `MediaPreviewDialog`. */
export function MediaPreviewSheet({
  item,
  isAdding = false,
  isAlreadySaved = false,
  onClose,
  onAutofill,
  onAdd,
}: MediaPreviewSheetProps) {
  const { colors, radius } = useTheme();
  const isBook = item?.type === "book";

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      presentation="sheet"
      title={item?.title ?? ""}
      description={
        item
          ? [getMediaLabel(item.type), item.year ? String(item.year) : null, item.creator]
              .filter(Boolean)
              .join(" • ")
          : undefined
      }
      footer={
        item ? (
          <View style={{ gap: 8 }}>
            <Button
              label={isAlreadySaved ? "Already in library" : "Add to Library"}
              loading={isAdding}
              disabled={isAdding || isAlreadySaved}
              fullWidth
              onPress={() => {
                onAdd(item);
                onClose();
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                variant="secondary"
                label="Autofill form"
                icon={<Check size={16} color={colors.secondaryForeground} />}
                style={{ flex: 1 }}
                onPress={() => {
                  onAutofill(item);
                  onClose();
                }}
              />
              <Button variant="outline" label="Close" style={{ flex: 1 }} onPress={onClose} />
            </View>
          </View>
        ) : null
      }
    >
      {item ? (
        <>
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <Image
              source={{ uri: getResultCover(item) }}
              style={{ width: 120, height: 180, borderRadius: radius["2xl"], backgroundColor: colors.muted }}
              resizeMode="cover"
            />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <Pill label={getMediaLabel(item.type)} tint={colors.primary} backgroundColor={colors.primary + "1a"} />
                {item.year ? <Pill label={String(item.year)} tint={colors.mutedForeground} borderColor={colors.border} /> : null}
                {typeof item.rating === "number" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Star size={12} color="#fbbf24" />
                    <Text variant="caption">{item.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
                {item.external_source ? (
                  <Pill label={`via ${item.external_source}`} tint={colors.mutedForeground} borderColor={colors.border} />
                ) : null}
              </View>

              <View style={{ gap: 2 }}>
                <Text variant="caption" uppercase letterSpacing={1}>
                  {isBook ? "Author" : "Creator"}
                </Text>
                <Text variant="small" weight="medium">
                  {item.creator || getMissingCreator(!!isBook)}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <Text variant="caption" uppercase letterSpacing={1}>
              Description
            </Text>
            <Text variant="small" color="mutedForeground">
              {item.description || MISSING_DESCRIPTION}
            </Text>
          </View>

          {getResultTags(item).length > 0 ? (
            <View style={{ gap: 6 }}>
              <Text variant="caption" uppercase letterSpacing={1}>
                Tags
              </Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {getResultTags(item).map((tag) => (
                  <Pill key={tag} label={tag} tint={colors.mutedForeground} borderColor={colors.border} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}
