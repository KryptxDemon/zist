import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { TrendingUp } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Skeleton, Text } from "@/components/ui";
import { TMDB_API_KEY } from "@/lib/env";
import { fallbackCover } from "./covers";

interface TrendingItem {
  id: number;
  title: string;
  subtitle?: string;
  poster: string | null;
}

/**
 * Optional "Trending this week" rail backed by TMDb.
 *
 * The web Dashboard has no such rail, but the mobile brief asks for it when a
 * key is available. It hides itself completely (returns `null`) when
 * `TMDB_API_KEY` is missing or the request fails, so a keyless build never
 * shows a broken/empty section.
 */
export function TrendingRail() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = TMDB_API_KEY;
    if (!key) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/all/week?api_key=${encodeURIComponent(key)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          results?: Array<{
            id: number;
            title?: string;
            name?: string;
            media_type?: string;
            poster_path?: string | null;
          }>;
        };
        if (cancelled) return;

        const mapped: TrendingItem[] = (data.results ?? [])
          .filter((entry) => Boolean(entry.poster_path))
          .slice(0, 14)
          .map((entry) => ({
            id: entry.id,
            title: entry.title ?? entry.name ?? "Untitled",
            subtitle: entry.media_type === "tv" ? "TV" : "Movie",
            poster: entry.poster_path
              ? `https://image.tmdb.org/t/p/w500${entry.poster_path}`
              : null,
          }));

        setItems(mapped);
      } catch {
        // Fail quietly — the rail simply does not render.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!TMDB_API_KEY) return null;
  if (loading) {
    return (
      <View style={{ gap: 12 }}>
        <Text variant="h3">Trending this week</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Skeleton width={130} height={190} rounded={radius.xl} />
          <Skeleton width={130} height={190} rounded={radius.xl} />
          <Skeleton width={130} height={190} rounded={radius.xl} />
        </View>
      </View>
    );
  }
  if (!items.length) return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 }}>
        <TrendingUp size={18} color={colors.primary} />
        <Text variant="h3">Trending this week</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 2, paddingBottom: 4 }}
      >
        {items.map((item) => (
          <Pressable
            key={`${item.subtitle}-${item.id}`}
            onPress={() =>
              router.push({ pathname: "/add", params: { q: item.title } })
            }
            style={{ width: 130, gap: 6 }}
          >
            <Image
              source={{ uri: item.poster ?? fallbackCover("movie") }}
              style={{
                height: 190,
                width: 130,
                borderRadius: radius.xl,
                backgroundColor: colors.muted,
              }}
              resizeMode="cover"
            />
            <Text variant="caption" numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
