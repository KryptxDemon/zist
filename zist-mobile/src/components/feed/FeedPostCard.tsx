import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, type TextStyle, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Globe,
  Heart,
  Lightbulb,
  MessageCircle,
  Quote,
  Trash2,
  Users,
} from "lucide-react-native";

import { type ThemeColors, useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, Text, useToast } from "@/components/ui";
import { feedService } from "@/services/feedService";
import { formatRelativeTime } from "@/lib/time";
import type { FeedPost, QuoteItem, ThemeConcept, VocabItem } from "@/types";
import { FeedCommentsSheet } from "./FeedCommentsSheet";

/**
 * Feed post card — author header, shared content payload (theme / vocab /
 * quote), engagement row and the comment sheet.
 *
 * Ported from `zist-frontend/src/components/feed/FeedPostCard.tsx`. Like and
 * save are optimistic on mobile (the web awaited the service first); both revert
 * and surface a toast when the request fails.
 */

const TYPE_CONFIG = {
  theme: {
    Icon: Lightbulb,
    color: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.20)",
    label: "Theme",
  },
  vocab: {
    Icon: BookOpen,
    color: "#34d399",
    bg: "rgba(16, 185, 129, 0.20)",
    label: "Vocabulary",
  },
  quote: {
    Icon: Quote,
    color: "#a78bfa",
    bg: "rgba(139, 92, 246, 0.20)",
    label: "Quote",
  },
} as const;

const LIKED_COLOR = "#fb7185";

interface ExpandableTextProps {
  text: string;
  wordLimit?: number;
  charLimit?: number;
  variant?: "body" | "small" | "caption";
  color?: keyof ThemeColors;
  tint?: string;
  style?: TextStyle;
  italic?: boolean;
  prefix?: string;
  suffix?: string;
}

function ExpandableText({
  text,
  wordLimit = 55,
  charLimit = 260,
  variant = "body",
  color,
  tint,
  style,
  italic = false,
  prefix = "",
  suffix = "",
}: ExpandableTextProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const words = useMemo(() => text.trim().split(/\s+/), [text]);
  const isTooLong = words.length > wordLimit || text.length > charLimit;

  const displayText = useMemo(() => {
    if (!isTooLong || expanded) return text;
    const truncated = words.slice(0, wordLimit).join(" ");
    return truncated.trim() + "…";
  }, [text, words, isTooLong, expanded, wordLimit]);

  return (
    <View style={{ gap: 4 }}>
      <Text
        variant={variant}
        color={color}
        tint={tint}
        style={[{ fontStyle: italic ? "italic" : "normal" }, style]}
      >
        {prefix}{displayText}{suffix}
      </Text>
      {isTooLong && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 2,
          }}
        >
          <Text variant="caption" tint={colors.primary} weight="semibold">
            {expanded ? "See less" : "See more"}
          </Text>
          {expanded ? (
            <ChevronUp size={13} color={colors.primary} />
          ) : (
            <ChevronDown size={13} color={colors.primary} />
          )}
        </Pressable>
      )}
    </View>
  );
}

export interface FeedPostCardProps {
  post: FeedPost;
  onUpdate?: (post: FeedPost) => void;
  onDelete?: (postId: string) => void;
  compact?: boolean;
}

export function FeedPostCard({
  post,
  onUpdate,
  onDelete,
  compact = false,
}: FeedPostCardProps) {
  const { colors, radius, shadow } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [localPost, setLocalPost] = useState(post);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const localPostRef = useRef(localPost);
  useEffect(() => {
    localPostRef.current = localPost;
  }, [localPost]);

  // Keep in sync when the parent replaces the post (reload / refresh).
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const config = TYPE_CONFIG[localPost.type];
  const isOwner = user?.id === localPost.userId;

  const updatePost = (next: FeedPost) => {
    localPostRef.current = next;
    setLocalPost(next);
    onUpdate?.(next);
  };

  const handleLike = async () => {
    if (likePending) return;
    const current = localPostRef.current;
    const nextLiked = !current.isLiked;
    const optimistic: FeedPost = {
      ...current,
      isLiked: nextLiked,
      likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)),
    };
    updatePost(optimistic);
    setLikePending(true);
    try {
      const result = await feedService.likePost(current.id);
      updatePost({ ...optimistic, isLiked: result.active, likes: result.count });
    } catch {
      updatePost(current); // revert
      toast({ title: "Failed to upvote", variant: "destructive" });
    } finally {
      setLikePending(false);
    }
  };

  const handleSave = async () => {
    if (savePending) return;
    const current = localPostRef.current;
    const optimistic: FeedPost = { ...current, isSaved: !current.isSaved };
    updatePost(optimistic);
    setSavePending(true);
    try {
      const result = await feedService.savePost(current.id);
      updatePost({ ...optimistic, isSaved: result.active });
    } catch {
      updatePost(current); // revert
      toast({ title: "Failed to save post", variant: "destructive" });
    } finally {
      setSavePending(false);
    }
  };

  const handleDelete = async () => {
    try {
      await feedService.deletePost(localPostRef.current.id);
      onDelete?.(localPostRef.current.id);
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const bumpComments = (delta: number) => {
    const current = localPostRef.current;
    updatePost({
      ...current,
      commentsCount: Math.max(0, current.commentsCount + delta),
    });
  };

  const renderContent = () => {
    if (localPost.type === "theme") {
      const content = localPost.content as ThemeConcept;
      return (
        <View style={{ gap: 4 }}>
          <Text variant="h4">{content.title}</Text>
          {content.summary ? (
            <ExpandableText
              text={content.summary}
              variant="small"
              color="mutedForeground"
              wordLimit={40}
              charLimit={180}
            />
          ) : null}
        </View>
      );
    }

    if (localPost.type === "vocab") {
      const content = localPost.content as VocabItem;
      return (
        <View style={{ gap: 4 }}>
          <Text variant="h4">{content.word}</Text>
          {content.definition ? (
            <ExpandableText
              text={content.definition}
              variant="small"
              color="mutedForeground"
              wordLimit={40}
              charLimit={180}
            />
          ) : null}
        </View>
      );
    }

    const content = localPost.content as QuoteItem;
    return (
      <View style={{ gap: 8 }}>
        <ExpandableText
          text={content.text}
          variant="body"
          italic
          prefix={`\u201C`}
          suffix={`\u201D`}
          wordLimit={45}
          charLimit={200}
        />
        {content.speaker ? (
          <Text variant="small" color="mutedForeground">
            {`— ${content.speaker}`}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={[
        {
          borderRadius: radius["2xl"],
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 16,
          gap: 16,
        },
        shadow("sm"),
      ]}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Avatar
          userId={localPost.userId}
          name={localPost.authorName}
          avatarUrl={localPost.authorAvatar}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            variant="label"
            weight="semibold"
            onPress={() => router.push(`/user/${localPost.userId}`)}
          >
            {localPost.authorName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text variant="caption">{formatRelativeTime(localPost.createdAt)}</Text>
            {localPost.mediaTitle ? (
              <>
                <Text variant="caption">·</Text>
                <Text variant="caption" numberOfLines={1} style={{ maxWidth: 180 }}>
                  {localPost.mediaTitle}
                </Text>
              </>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor:
                  localPost.visibility === "global"
                    ? "rgba(14, 165, 233, 0.15)"
                    : colors.primary + "26",
              }}
            >
              {localPost.visibility === "global" ? (
                <Globe size={12} color="#38bdf8" />
              ) : (
                <Users size={12} color={colors.primary} />
              )}
              <Text
                variant="caption"
                tint={localPost.visibility === "global" ? "#38bdf8" : colors.primary}
              >
                {localPost.visibility === "global" ? "Global" : "Friends"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: config.bg,
          }}
        >
          <config.Icon size={12} color={config.color} />
          <Text variant="caption" tint={config.color} weight="medium">
            {config.label}
          </Text>
        </View>
      </View>

      {/* Caption with word-based clamping */}
      {localPost.caption ? (
        <ExpandableText
          text={localPost.caption}
          variant="body"
          wordLimit={50}
          charLimit={240}
        />
      ) : null}

      {/* Shared content payload */}
      <View
        style={{
          backgroundColor: colors.accent,
          borderRadius: radius.xl,
          padding: 16,
        }}
      >
        {renderContent()}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <Pressable
          onPress={handleLike}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Heart
            size={16}
            color={localPost.isLiked ? LIKED_COLOR : colors.mutedForeground}
            fill={localPost.isLiked ? LIKED_COLOR : "none"}
          />
          <Text variant="small" tint={localPost.isLiked ? LIKED_COLOR : colors.mutedForeground}>
            {localPost.likes}
          </Text>
        </Pressable>

        {!compact ? (
          <>
            <Pressable
              onPress={handleSave}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Bookmark
                size={16}
                color={localPost.isSaved ? colors.primary : colors.mutedForeground}
                fill={localPost.isSaved ? colors.primary : "none"}
              />
              <Text variant="small" tint={localPost.isSaved ? colors.primary : colors.mutedForeground}>
                Save
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCommentsOpen(true)}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MessageCircle size={16} color={colors.mutedForeground} />
              <Text variant="small" color="mutedForeground">
                {localPost.commentsCount}
              </Text>
            </Pressable>
          </>
        ) : null}

        {isOwner ? (
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}
            accessibilityLabel="Delete post"
          >
            <Trash2 size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {!compact ? (
        <FeedCommentsSheet
          postId={localPost.id}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => bumpComments(1)}
          onCommentDeleted={() => bumpComments(-1)}
        />
      ) : null}
    </View>
  );
}

export const feedPostStyles = StyleSheet.create({});
