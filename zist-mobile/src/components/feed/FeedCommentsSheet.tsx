import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Send } from "lucide-react-native";

import { useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, IconButton, Input, Sheet, Spinner, Text, useToast } from "@/components/ui";
import { feedService } from "@/services/feedService";
import { formatRelativeTime } from "@/lib/time";
import type { FeedComment } from "@/types";

/**
 * Comment list + composer shown when a feed post's comment count is tapped.
 *
 * Ported from the comments section of the web `FeedPostCard`: loads comments
 * lazily on open, supports adding a comment and deleting your own, and reports
 * counts back so the post can keep its `commentsCount` in sync.
 */
export interface FeedCommentsSheetProps {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

export function FeedCommentsSheet({
  postId,
  visible,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: FeedCommentsSheetProps) {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const data = await feedService.getComments(id);
        setComments(data);
      } catch {
        toast({ title: "Failed to load comments", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (visible && postId) {
      setCommentText("");
      void loadComments(postId);
    }
  }, [visible, postId, loadComments]);

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body || !postId) return;

    setIsSubmitting(true);
    try {
      const comment = await feedService.addComment(postId, body);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
      onCommentAdded();
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await feedService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentDeleted();
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      presentation="sheet"
      title="Comments"
      description={comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : undefined}
      scrollable={false}
      maxHeightRatio={0.85}
    >
      <View style={{ maxHeight: 360 }}>
        {isLoading ? (
          <Spinner />
        ) : comments.length === 0 ? (
          <View style={{ paddingVertical: 32 }}>
            <Text variant="small" color="mutedForeground" align="center">
              No comments yet. Start the conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push(`/user/${item.userId}`);
                  }}
                >
                  <Avatar
                    userId={item.userId}
                    name={item.authorName}
                    avatarUrl={item.authorAvatar}
                    size="sm"
                    clickable={false}
                  />
                </Pressable>
                <View style={{ flex: 1, gap: 4 }}>
                  <View
                    style={{
                      borderRadius: radius.lg,
                      backgroundColor: colors.accent,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      gap: 2,
                    }}
                  >
                    <Text
                      variant="label"
                      weight="semibold"
                      onPress={() => {
                        onClose();
                        router.push(`/user/${item.userId}`);
                      }}
                    >
                      {item.authorName}
                    </Text>
                    <Text variant="small">{item.body}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 }}>
                    <Text variant="caption">{formatRelativeTime(item.createdAt)}</Text>
                    {user?.id === item.userId ? (
                      <Text
                        variant="caption"
                        tint={colors.destructive}
                        onPress={() => handleDeleteComment(item.id)}
                      >
                        Delete
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Avatar
          userId={user?.id}
          name={user?.displayName || "You"}
          avatarUrl={user?.avatar}
          size="sm"
          clickable={false}
        />
        <Input
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment…"
          returnKeyType="send"
          onSubmitEditing={handleAddComment}
          containerStyle={{ flex: 1 }}
        />
        <IconButton
          onPress={handleAddComment}
          disabled={isSubmitting || !commentText.trim()}
          accessibilityLabel="Post comment"
        >
          <Send size={18} color={colors.primaryForeground} />
        </IconButton>
      </View>
    </Sheet>
  );
}
