import React, { useEffect, useState } from "react";
import { Share, View } from "react-native";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Quote,
  Sparkles,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Select,
  Sheet,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
import { quoteService } from "@/services/mediaService";
import { aiService } from "@/services/externalServices";
import { parseTimestamp } from "@/lib/time";
import type { QuoteItem, ThemeConcept } from "@/types";

/** Quotes tab — capture quotes, bookmark, copy/share and generate AI meaning. */
export function QuotesTab({
  mediaId,
  quotes,
  setQuotes,
  themes,
  openAddNonce = 0,
}: {
  mediaId: string;
  quotes: QuoteItem[];
  setQuotes: (next: QuoteItem[]) => void;
  themes: ThemeConcept[];
  /** Increment to programmatically open the "Add Quote" sheet. */
  openAddNonce?: number;
}) {
  const { colors } = useTheme();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newQuote, setNewQuote] = useState({
    text: "",
    speaker: "",
    reference: "",
    themeId: "",
    userMeaning: "",
  });

  useEffect(() => {
    if (openAddNonce > 0) setIsAddOpen(true);
  }, [openAddNonce]);

  const handleAddQuote = async () => {
    if (!newQuote.text.trim()) return;
    setIsAdding(true);
    try {
      const quote = await quoteService.create({
        mediaId,
        text: newQuote.text.trim(),
        speaker: newQuote.speaker.trim() || undefined,
        reference: newQuote.reference.trim() || undefined,
        relatedThemeId: newQuote.themeId || undefined,
        userMeaning: newQuote.userMeaning.trim() || undefined,
        isBookmarked: false,
      });
      setQuotes([...quotes, quote]);
      setNewQuote({
        text: "",
        speaker: "",
        reference: "",
        themeId: "",
        userMeaning: "",
      });
      setIsAddOpen(false);
      toast({ title: "Quote added!" });
    } catch {
      toast({ title: "Failed to add quote", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleGenerateQuotes = async () => {
    setIsGenerating(true);
    try {
      const result = await quoteService.generateForMedia(mediaId, 5);
      const byId = new Map(quotes.map((item) => [item.id, item]));
      for (const item of result.updated) byId.set(item.id, item);
      for (const item of result.created) byId.set(item.id, item);

      setQuotes(
        Array.from(byId.values()).sort(
          (a, b) =>
            (parseTimestamp(b.createdAt)?.getTime() ?? 0) -
            (parseTimestamp(a.createdAt)?.getTime() ?? 0),
        ),
      );

      toast({
        title: result.usedAi ? "Successfully generated" : "Generation failed",
        description: result.usedAi
          ? `Created ${result.created.length}, updated ${result.updated.length}`
          : result.aiError
            ? `AI unavailable: ${result.aiError}. No quotes were created.`
            : "AI generation returned no quotes. Try again in a moment.",
        variant: result.usedAi ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Failed to generate quotes",
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
        <Text variant="h4">Quotes & Meaning</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Button
            size="sm"
            variant="secondary"
            loading={isGenerating}
            icon={
              isGenerating ? undefined : (
                <Sparkles size={16} color={colors.secondaryForeground} />
              )
            }
            label="Generate 5"
            onPress={handleGenerateQuotes}
          />
          <Button
            size="sm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            label="Add Quote"
            onPress={() => setIsAddOpen(true)}
          />
        </View>
      </View>

      {quotes.length === 0 ? (
        <EmptyState
          icon={<Quote size={28} color={colors.mutedForeground} />}
          title="No quotes yet"
          description="Save meaningful quotes and your interpretations."
          action={
            <Button
              icon={<Plus size={16} color={colors.primaryForeground} />}
              label="Add First Quote"
              onPress={() => setIsAddOpen(true)}
            />
          }
        />
      ) : (
        <View style={{ gap: 16 }}>
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              quotes={quotes}
              setQuotes={setQuotes}
              themes={themes}
            />
          ))}
        </View>
      )}

      <Sheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Quote"
        footer={
          <Button
            fullWidth
            loading={isAdding}
            label="Add Quote"
            onPress={() => void handleAddQuote()}
          />
        }
      >
        <Textarea
          label="Quote"
          placeholder="Enter the quote…"
          value={newQuote.text}
          onChangeText={(text) => setNewQuote({ ...newQuote, text })}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Speaker/Character"
              placeholder="Who said it?"
              value={newQuote.speaker}
              onChangeText={(speaker) => setNewQuote({ ...newQuote, speaker })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Reference"
              placeholder="Chapter, scene…"
              value={newQuote.reference}
              onChangeText={(reference) => setNewQuote({ ...newQuote, reference })}
            />
          </View>
        </View>
        <Select
          label="Related Theme"
          placeholder="Select theme…"
          value={newQuote.themeId}
          onChange={(themeId) => setNewQuote({ ...newQuote, themeId })}
          options={themes.map((theme) => ({ value: theme.id, label: theme.title }))}
        />
        <Textarea
          label="What I Think It Means"
          placeholder="Your interpretation…"
          value={newQuote.userMeaning}
          onChangeText={(userMeaning) => setNewQuote({ ...newQuote, userMeaning })}
        />
      </Sheet>
    </View>
  );
}

function QuoteCard({
  quote,
  quotes,
  setQuotes,
  themes,
}: {
  quote: QuoteItem;
  quotes: QuoteItem[];
  setQuotes: (next: QuoteItem[]) => void;
  themes: ThemeConcept[];
}) {
  const { colors, radius } = useTheme();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const relatedTheme = themes.find((t) => t.id === quote.relatedThemeId);

  const handleToggleBookmark = async () => {
    try {
      const updated = await quoteService.update(quote.id, {
        isBookmarked: !quote.isBookmarked,
      });
      setQuotes(quotes.map((q) => (q.id === quote.id ? updated : q)));
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: quote.text });
    } catch {
      toast({ title: "Failed to share quote", variant: "destructive" });
    }
  };

  const handleGenerateAIMeaning = async () => {
    setIsGeneratingAI(true);
    try {
      const aiMeaning = await aiService.generateQuoteMeaning(quote.text);
      const updated = await quoteService.update(quote.id, { aiMeaning });
      setQuotes(quotes.map((q) => (q.id === quote.id ? updated : q)));
      toast({ title: "Successfully generated" });
    } catch {
      toast({ title: "Failed to generate", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
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
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="lead" style={{ fontStyle: "italic" }}>
            “{quote.text}”
          </Text>
          {quote.speaker ? (
            <Text variant="small" color="mutedForeground">
              — {quote.speaker}
            </Text>
          ) : null}
          {relatedTheme ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: colors.primary + "33",
                paddingHorizontal: 8,
                paddingVertical: 1,
                borderRadius: radius.full,
              }}
            >
              <Text variant="caption" tint={colors.primary} weight="medium">
                {relatedTheme.title}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <IconButton size="iconSm" onPress={() => void handleCopy()}>
            <Copy size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" onPress={() => void handleToggleBookmark()}>
            <Bookmark
              size={18}
              color={quote.isBookmarked ? colors.primary : colors.mutedForeground}
              fill={quote.isBookmarked ? colors.primary : "none"}
            />
          </IconButton>
          <IconButton size="iconSm" onPress={() => setIsExpanded((prev) => !prev)}>
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
          {quote.userMeaning ? (
            <View style={{ gap: 2 }}>
              <Text variant="label" color="mutedForeground">
                My Interpretation
              </Text>
              <Text variant="body">{quote.userMeaning}</Text>
            </View>
          ) : null}

          {quote.aiMeaning ? (
            <View style={{ gap: 2 }}>
              <Text variant="label" color="mutedForeground">
                AI Interpretation
              </Text>
              <Text variant="body">{quote.aiMeaning}</Text>
              <Text variant="caption" style={{ fontStyle: "italic" }}>
                AI meaning is a suggestion; verify context.
              </Text>
            </View>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={isGeneratingAI}
              icon={
                isGeneratingAI ? undefined : <Sparkles size={14} color={colors.foreground} />
              }
              label="Generate AI Meaning"
              onPress={() => void handleGenerateAIMeaning()}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
