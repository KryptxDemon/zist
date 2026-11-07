import React, { useEffect, useState } from "react";
import { Pressable, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Lightbulb,
  Plus,
  Rss,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";

import { useTheme } from "@/theme";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Sheet,
  Text,
  useToast,
} from "@/components/ui";
import { themeService } from "@/services/mediaService";
import { wikiService } from "@/services/externalServices";
import {
  DirectShareFeedModal,
  type DirectShareItem,
} from "@/components/feed/DirectShareFeedModal";
import { parseTimestamp } from "@/lib/time";
import type { ThemeConcept } from "@/types";
import { DetailSection } from "./primitives";

/** Themes tab — create (with Wikipedia summary), generate, save-for-later, delete. */
export function ThemesTab({
  mediaId,
  mediaTitle,
  themes,
  setThemes,
  openAddNonce = 0,
}: {
  mediaId: string;
  mediaTitle: string;
  themes: ThemeConcept[];
  setThemes: (next: ThemeConcept[]) => void;
  /** Increment to programmatically open the "Add Theme" sheet. */
  openAddNonce?: number;
}) {
  const { colors } = useTheme();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  const [feedShareItem, setFeedShareItem] = useState<DirectShareItem | null>(null);

  useEffect(() => {
    if (openAddNonce > 0) setIsAddOpen(true);
  }, [openAddNonce]);

  useEffect(() => {
    let canceled = false;

    const loadExamples = async () => {
      setIsLoadingExamples(true);
      try {
        const items = await wikiService.suggestThemes(mediaTitle);
        if (canceled) return;
        const existing = new Set(themes.map((theme) => theme.title.toLowerCase()));
        const unique = Array.from(
          new Set(items.map((item) => item.trim()).filter(Boolean)),
        ).filter((item) => !existing.has(item.toLowerCase()));
        setExamples(unique.slice(0, 8));
      } catch {
        if (!canceled) setExamples([]);
      } finally {
        if (!canceled) setIsLoadingExamples(false);
      }
    };

    void loadExamples();
    return () => {
      canceled = true;
    };
  }, [mediaTitle, themes]);

  const createThemeWithSummary = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const exists = themes.some(
      (theme) => theme.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast({ title: "Theme already exists" });
      return;
    }

    setIsAdding(true);
    try {
      const { summary, sourceUrl } = await wikiService.getSummaryByTopic(trimmed);
      const created = await themeService.create({
        mediaId,
        title: trimmed,
        summary,
        sourceUrl,
        savedForLater: false,
      });

      setThemes([created, ...themes]);
      setExamples((prev) =>
        prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      );
      toast({ title: "Theme added with summary" });
    } catch (error) {
      toast({
        title: "Failed to add theme",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddTheme = async () => {
    const title = newTheme.trim();
    if (!title) return;
    await createThemeWithSummary(title);
    setNewTheme("");
    setIsAddOpen(false);
  };

  const handleGenerateThemes = async () => {
    setIsGenerating(true);
    try {
      const result = await themeService.generateForMedia(mediaId, 5);
      const byId = new Map(themes.map((item) => [item.id, item]));
      for (const item of result.updated) byId.set(item.id, item);
      for (const item of result.created) byId.set(item.id, item);

      setThemes(
        Array.from(byId.values()).sort(
          (a, b) =>
            (parseTimestamp(b.updatedAt)?.getTime() ?? 0) -
            (parseTimestamp(a.updatedAt)?.getTime() ?? 0),
        ),
      );

      toast({
        title: result.usedAi ? "Successfully generated" : "Generated with fallback",
        description: result.usedAi
          ? `Created ${result.created.length}, updated ${result.updated.length}`
          : result.aiError
            ? `AI unavailable: ${result.aiError}. Showing fallback content.`
            : "Showing fallback content because AI generation is unavailable.",
        variant: result.usedAi ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Failed to generate themes",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text variant="h4">Themes & Concepts</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Button
            size="sm"
            variant="secondary"
            loading={isGenerating}
            icon={
              isGenerating ? undefined : <Sparkles size={16} color={colors.secondaryForeground} />
            }
            label="Generate 5"
            onPress={handleGenerateThemes}
          />
          <Button
            size="sm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            label="Add Theme"
            onPress={() => setIsAddOpen(true)}
          />
        </View>
      </View>

      <DetailSection>
        <Text variant="label">Wikipedia examples for this title</Text>
        {isLoadingExamples ? (
          <Text variant="caption">Loading suggestions…</Text>
        ) : examples.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {examples.map((item) => (
              <Button
                key={item}
                size="sm"
                variant="outline"
                disabled={isAdding}
                label={item}
                onPress={() => void createThemeWithSummary(item)}
              />
            ))}
          </View>
        ) : (
          <Text variant="caption">
            No clear themes found automatically. You can add a theme manually and we will
            fetch its summary from Wikipedia.
          </Text>
        )}
      </DetailSection>

      {themes.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={28} color={colors.mutedForeground} />}
          title="No themes yet"
          description="Add themes and concepts you've learned from this media."
          action={
            <Button
              icon={<Plus size={16} color={colors.primaryForeground} />}
              label="Add First Theme"
              onPress={() => setIsAddOpen(true)}
            />
          }
        />
      ) : (
        <View style={{ gap: 16 }}>
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              themes={themes}
              setThemes={setThemes}
              mediaTitle={mediaTitle}
              onShareToFeed={(item) => setFeedShareItem(item)}
            />
          ))}
        </View>
      )}

      <Sheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Theme"
        footer={
          <Button
            fullWidth
            loading={isAdding}
            label="Add Theme"
            onPress={() => void handleAddTheme()}
          />
        }
      >
        <Input
          label="Theme Title"
          placeholder="e.g., Religious Extremism"
          value={newTheme}
          onChangeText={setNewTheme}
          autoFocus
        />
      </Sheet>

      <DirectShareFeedModal
        visible={!!feedShareItem}
        onClose={() => setFeedShareItem(null)}
        item={feedShareItem}
      />
    </View>
  );
}

function ThemeCard({
  theme,
  themes,
  setThemes,
  mediaTitle,
  onShareToFeed,
}: {
  theme: ThemeConcept;
  themes: ThemeConcept[];
  setThemes: (next: ThemeConcept[]) => void;
  mediaTitle?: string;
  onShareToFeed: (item: DirectShareItem) => void;
}) {
  const { colors, radius } = useTheme();
  const { toast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [userUnderstanding, setUserUnderstanding] = useState(
    theme.userUnderstanding || "",
  );

  const handleFetchSummary = async () => {
    setIsFetching(true);
    try {
      const { summary, sourceUrl } = await wikiService.getSummaryByTopic(theme.title);
      const updated = await themeService.update(theme.id, { summary, sourceUrl });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
      toast({ title: "Summary fetched!" });
    } catch {
      toast({ title: "Failed to fetch summary", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveUnderstanding = async () => {
    try {
      const updated = await themeService.update(theme.id, { userUnderstanding });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
      toast({ title: "Saved!" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleToggleSave = async () => {
    try {
      const updated = await themeService.update(theme.id, {
        savedForLater: !theme.savedForLater,
      });
      setThemes(themes.map((t) => (t.id === theme.id ? updated : t)));
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy = theme.summary ? `${theme.title}\n${theme.summary}` : theme.title;
      await Clipboard.setStringAsync(textToCopy);
      toast({ title: "Theme copied to clipboard!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      const textToShare = theme.summary ? `${theme.title} — ${theme.summary}` : theme.title;
      await Share.share({ message: textToShare });
    } catch {
      // Dismissed
    }
  };

  const handleDeleteTheme = async () => {
    try {
      await themeService.delete(theme.id);
      setThemes(themes.filter((t) => t.id !== theme.id));
      toast({ title: "Theme deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete theme",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <View
      style={{
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="h4" style={{ flexShrink: 1 }}>
              {theme.title}
            </Text>
            {theme.savedForLater ? (
              <View
                style={{
                  backgroundColor: colors.primary + "33",
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                  borderRadius: radius.full,
                }}
              >
                <Text variant="caption" tint={colors.primary} weight="medium">
                  Saved
                </Text>
              </View>
            ) : null}
          </View>
          {theme.summary ? (
            <Text variant="small" color="mutedForeground">
              {theme.summary}
            </Text>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={isFetching}
              icon={isFetching ? undefined : <Sparkles size={14} color={colors.foreground} />}
              label="Fetch Summary"
              onPress={() => void handleFetchSummary()}
            />
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <IconButton
            size="iconSm"
            accessibilityLabel="Share to feed"
            onPress={() =>
              onShareToFeed({
                type: "theme",
                id: theme.id,
                title: theme.title,
                subtitle: theme.summary,
                mediaTitle,
              })
            }
          >
            <Rss size={18} color={colors.primary} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Copy theme" onPress={() => void handleCopy()}>
            <Copy size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Share theme" onPress={() => void handleShare()}>
            <Share2 size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Bookmark theme" onPress={() => void handleToggleSave()}>
            <Bookmark
              size={18}
              color={theme.savedForLater ? colors.primary : colors.mutedForeground}
              fill={theme.savedForLater ? colors.primary : "none"}
            />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Delete theme" onPress={() => setConfirmVisible(true)}>
            <Trash2 size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Toggle summary" onPress={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.mutedForeground} />
            ) : (
              <ChevronDown size={18} color={colors.mutedForeground} />
            )}
          </IconButton>
        </View>
      </View>

      {isExpanded ? (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: 12,
            gap: 12,
          }}
        >
          {theme.sourceUrl ? (
            <Pressable
              onPress={() => void WebBrowser.openBrowserAsync(String(theme.sourceUrl))}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <ExternalLink size={14} color={colors.primary} />
              <Text variant="small" tint={colors.primary}>
                Source
              </Text>
            </Pressable>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text variant="label">My Understanding</Text>
            <Input
              multiline
              numberOfLines={3}
              placeholder="Write your understanding of this theme…"
              value={userUnderstanding}
              onChangeText={setUserUnderstanding}
            />
            <Button
              size="sm"
              label="Save"
              onPress={() => void handleSaveUnderstanding()}
            />
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete theme"
        description={`Delete theme "${theme.title}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmVisible(false);
          void handleDeleteTheme();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}
