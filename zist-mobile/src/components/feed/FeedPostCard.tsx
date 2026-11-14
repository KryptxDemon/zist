import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  type TextStyle,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Film,
  Globe,
  Heart,
  Lightbulb,
  MessageCircle,
  Quote,
  Share2,
  Star,
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

const TYPE_CONFIG = {
  media: {
    Icon: Film,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.20)",
    label: "Media",
  },
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

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const config = TYPE_CONFIG[localPost.type] || TYPE_CONFIG.theme;
  const isOwner = user?.id === localPost.userId;
  const coverImage = localPost.imageUrl || localPost.mediaCoverUrl;

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
      updatePost(current);
      toast({ title: "Failed to like post", variant: "destructive" });
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
      toast({
        title: result.active ? "Saved to bookmarks" : "Removed from bookmarks",
      });
    } catch {
      updatePost(current);
      toast({ title: "Failed to save post", variant: "destructive" });
    } finally {
      setSavePending(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${localPost.caption || localPost.mediaTitle || "Check out this post on Zist"}\nhttps://zist-media.netlify.app/app/feed`,
      });
    } catch {
      // User dismissed
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
    if (localPost.type === "media") {
      return (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={{
                  width: 72,
                  height: 108,
                  borderRadius: radius.md,
                  backgroundColor: colors.border,
                }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="h4" numberOfLines={2}>
                {localPost.mediaTitle || localPost.content?.title || "Media"}
              </Text>
              {localPost.mediaCreator ? (
                <Text variant="caption" color="mutedForeground">
                  by {localPost.mediaCreator}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                {localPost.mediaYear ? (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: radius.sm,
                      backgroundColor: colors.border,
                    }}
                  >
                    <Text variant="caption" weight="medium">
                      {localPost.mediaYear}
                    </Text>
                  </View>
                ) : null}
                {localPost.mediaRating !== undefined && localPost.mediaRating !== null ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: radius.sm,
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                    }}
                  >
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text variant="caption" tint="#f59e0b" weight="semibold">
                      {localPost.mediaRating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          {localPost.content?.review ? (
            <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
              <ExpandableText
                text={localPost.content.review}
                variant="small"
                color="mutedForeground"
                italic
                prefix="“"
                suffix="”"
                wordLimit={35}
              />
            </View>
          ) : null}
        </View>
      );
    }

    if (localPost.type === "theme") {
      const content = localPost.content as ThemeConcept;
      return (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
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
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={{ width: 44, height: 64, borderRadius: radius.sm }}
                resizeMode="cover"
              />
            ) : null}
          </View>
        </View>
      );
    }

    if (localPost.type === "vocab") {
      const content = localPost.content as VocabItem;
      return (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="h4" tint="#34d399">
                {content.word}
              </Text>
              {content.definition ? (
                <ExpandableText
                  text={content.definition}
                  variant="small"
                  color="mutedForeground"
                  wordLimit={40}
                  charLimit={180}
                />
              ) : null}
              {content.exampleSentence ? (
                <Text variant="caption" color="mutedForeground" style={{ fontStyle: "italic", marginTop: 4 }}>
                  “{content.exampleSentence}”
                </Text>
              ) : null}
            </View>
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={{ width: 44, height: 64, borderRadius: radius.sm }}
                resizeMode="cover"
              />
            ) : null}
          </View>
        </View>
      );
    }

    const content = localPost.content as QuoteItem;
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
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
              <Text variant="small" tint="#a78bfa" weight="medium">
                {`— ${content.speaker}`}
              </Text>
            ) : null}
          </View>
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={{ width: 44, height: 64, borderRadius: radius.sm }}
              resizeMode="cover"
            />
          ) : null}
        </View>
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
          gap: 14,
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
                <Text variant="caption" numberOfLines={1} style={{ maxWidth: 160 }}>
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
                <Globe size={11} color="#38bdf8" />
              ) : (
                <Users size={11} color={colors.primary} />
              )}
              <Text
                variant="caption"
                tint={localPost.visibility === "global" ? "#38bdf8" : colors.primary}
              >
                {localPost.visibility === "global" ? "Public" : "Friends"}
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
          <Text variant="caption" tint={config.color} weight="semibold">
            {localPost.type === "media"
              ? localPost.mediaType
                ? localPost.mediaType.toUpperCase()
                : "MEDIA"
              : config.label}
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
          padding: 14,
        }}
      >
        {renderContent()}
      </View>

      {/* Actions Row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <Pressable
            onPress={handleLike}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Heart
              size={18}
              color={localPost.isLiked ? LIKED_COLOR : colors.mutedForeground}
              fill={localPost.isLiked ? LIKED_COLOR : "none"}
            />
            <Text variant="small" tint={localPost.isLiked ? LIKED_COLOR : colors.mutedForeground} weight="medium">
              {localPost.likes}
            </Text>
          </Pressable>

          {!compact ? (
            <>
              <Pressable
                onPress={() => setCommentsOpen(true)}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MessageCircle size={18} color={colors.mutedForeground} />
                <Text variant="small" color="mutedForeground" weight="medium">
                  {localPost.commentsCount}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Bookmark
                  size={18}
                  color={localPost.isSaved ? colors.primary : colors.mutedForeground}
                  fill={localPost.isSaved ? colors.primary : "none"}
                />
                <Text variant="small" tint={localPost.isSaved ? colors.primary : colors.mutedForeground} weight="medium">
                  {localPost.isSaved ? "Saved" : "Save"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Share2 size={18} color={colors.mutedForeground} />
          </Pressable>

          {isOwner ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center" }}
              accessibilityLabel="Delete post"
            >
              <Trash2 size={18} color={colors.destructive} />
            </Pressable>
          ) : null}
        </View>
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
