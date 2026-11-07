import React, { useEffect, useState } from "react";
import { Pressable, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { BookOpen, Check, Copy, Plus, Search, Share2, Sparkles, Trash2 } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  SearchInput,
  Select,
  Sheet,
  Text,
  useToast,
} from "@/components/ui";
import { vocabService } from "@/services/mediaService";
import { aiService, dictionaryService } from "@/services/externalServices";
import type { VocabItem } from "@/types";
import { DetailSection } from "./primitives";

type GeneratedWord = Awaited<
  ReturnType<typeof aiService.generateMediaVocabulary>
>[number];

type VocabFilter = "all" | "learned" | "unlearned";

/** Vocabulary tab — add (with dictionary lookup), AI generate, learn + delete. */
export function VocabTab({
  mediaId,
  mediaTitle,
  mediaOverview,
  vocab,
  setVocab,
  openAddNonce = 0,
}: {
  mediaId: string;
  mediaTitle: string;
  mediaOverview?: string | null;
  vocab: VocabItem[];
  setVocab: (next: VocabItem[]) => void;
  /** Increment to programmatically open the "Add Word" sheet. */
  openAddNonce?: number;
}) {
  const { colors } = useTheme();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);
  const [isGeneratingAndSaving, setIsGeneratingAndSaving] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<GeneratedWord[]>([]);
  const [newWord, setNewWord] = useState({ word: "", whereFound: "", tags: "" });
  const [filter, setFilter] = useState<VocabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (openAddNonce > 0) setIsAddOpen(true);
  }, [openAddNonce]);

  const handleAddWord = async () => {
    if (!newWord.word.trim()) return;
    setIsAdding(true);
    try {
      const { definition, example } = await dictionaryService.getDefinitionAndExample(
        newWord.word,
      );
      const word = await vocabService.create({
        mediaId,
        word: newWord.word.trim(),
        definition,
        exampleSentence: example,
        whereFound: newWord.whereFound.trim() || undefined,
        tags: newWord.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isLearned: false,
      });
      setVocab([...vocab, word]);
      setNewWord({ word: "", whereFound: "", tags: "" });
      setIsAddOpen(false);
      toast({ title: "Word added with definition!" });
    } catch (error) {
      toast({
        title: "Failed to add word",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleGenerateWords = async () => {
    setIsGeneratingWords(true);
    try {
      const items = await aiService.generateMediaVocabulary(
        mediaTitle,
        mediaOverview || undefined,
        5,
      );
      setGeneratedWords(items);
      toast({ title: "Successfully generated" });
    } catch (error) {
      toast({
        title: "Failed to generate words",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWords(false);
    }
  };

  const handleGenerateAndSaveWords = async () => {
    setIsGeneratingAndSaving(true);
    try {
      const result = await vocabService.generateForMedia(mediaId, 8);
      const merged = new Map(vocab.map((item) => [item.id, item]));
      for (const item of result.updated) merged.set(item.id, item);
      for (const item of result.created) merged.set(item.id, item);
      setVocab(Array.from(merged.values()));

      const totalAdded = result.created.length + result.updated.length;
      toast({
        title: result.usedAi
          ? totalAdded > 0
            ? `Added ${totalAdded} words`
            : "No new words to add"
          : "Generation failed",
        description: result.usedAi
          ? `Created ${result.created.length}, updated ${result.updated.length}.`
          : result.aiError
            ? `AI unavailable: ${result.aiError}. Try again in a moment.`
            : "AI generation is unavailable right now.",
        variant: result.usedAi && totalAdded > 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Failed to generate words",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAndSaving(false);
    }
  };

  const handleAddGeneratedWord = async (item: GeneratedWord) => {
    try {
      const created = await vocabService.create({
        mediaId,
        word: item.word,
        definition: item.definition,
        exampleSentence: item.example_sentence,
        whereFound: item.why_relevant || undefined,
        tags: ["generated", "media-specific"],
        isLearned: false,
      });
      setVocab([created, ...vocab]);
      setGeneratedWords((prev) => prev.filter((word) => word.word !== item.word));
      toast({ title: "Word added" });
    } catch (error) {
      toast({
        title: "Failed to add word",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredVocab = vocab
    .filter((v) => {
      if (filter === "learned") return v.isLearned;
      if (filter === "unlearned") return !v.isLearned;
      return true;
    })
    .filter((v) =>
      searchQuery ? v.word.toLowerCase().includes(searchQuery.toLowerCase()) : true,
    );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <Text variant="h4">Vocabulary Tracker</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            size="sm"
            variant="secondary"
            loading={isGeneratingWords}
            disabled={isGeneratingWords || isGeneratingAndSaving}
            icon={
              isGeneratingWords ? undefined : (
                <Sparkles size={16} color={colors.secondaryForeground} />
              )
            }
            label="Generate Media Words"
            onPress={() => void handleGenerateWords()}
          />
          <Button
            size="sm"
            loading={isGeneratingAndSaving}
            disabled={isGeneratingWords || isGeneratingAndSaving}
            icon={
              isGeneratingAndSaving ? undefined : (
                <Sparkles size={16} color={colors.primaryForeground} />
              )
            }
            label="Generate & Save"
            onPress={() => void handleGenerateAndSaveWords()}
          />
          <Button
            size="sm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            label="Add Word"
            onPress={() => setIsAddOpen(true)}
          />
        </View>
      </View>

      {generatedWords.length > 0 ? (
        <DetailSection title="Generated media words">
          <Text variant="caption">
            Words chosen for this title, with definitions and examples ready to save.
          </Text>
          <View style={{ gap: 12 }}>
            {generatedWords.map((item) => (
              <View
                key={item.word}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text variant="label" weight="semibold">
                  {item.word}
                </Text>
                <Text variant="small" color="mutedForeground">
                  {item.definition}
                </Text>
                <Text variant="caption">{item.example_sentence}</Text>
                <Button
                  size="sm"
                  label="Add"
                  onPress={() => void handleAddGeneratedWord(item)}
                />
              </View>
            ))}
          </View>
        </DetailSection>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search words…"
            icon={<Search size={18} color={colors.mutedForeground} />}
          />
        </View>
        <View style={{ width: 150 }}>
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All Words" },
              { value: "learned", label: "Learned" },
              { value: "unlearned", label: "Unlearned" },
            ]}
          />
        </View>
      </View>

      {vocab.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} color={colors.mutedForeground} />}
          title="No vocabulary yet"
          description="Add new words you encounter while consuming this media."
          action={
            <Button
              icon={<Plus size={16} color={colors.primaryForeground} />}
              label="Add First Word"
              onPress={() => setIsAddOpen(true)}
            />
          }
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {filteredVocab.map((word) => (
            <VocabCard key={word.id} word={word} vocab={vocab} setVocab={setVocab} />
          ))}
        </View>
      )}

      <Sheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Word"
        footer={
          <Button
            fullWidth
            loading={isAdding}
            icon={isAdding ? undefined : <Sparkles size={16} color={colors.primaryForeground} />}
            label="Add & Fetch Definition"
            onPress={() => void handleAddWord()}
          />
        }
      >
        <Input
          label="Word"
          placeholder="e.g., apostate"
          value={newWord.word}
          onChangeText={(word) => setNewWord({ ...newWord, word })}
          autoFocus
        />
        <Input
          label="Where Found (optional)"
          placeholder="e.g., Chapter 3, Scene 5"
          value={newWord.whereFound}
          onChangeText={(whereFound) => setNewWord({ ...newWord, whereFound })}
        />
        <Input
          label="Tags (comma-separated)"
          placeholder="religious, philosophy"
          value={newWord.tags}
          onChangeText={(tags) => setNewWord({ ...newWord, tags })}
        />
      </Sheet>
    </View>
  );
}

function VocabCard({
  word,
  vocab,
  setVocab,
}: {
  word: VocabItem;
  vocab: VocabItem[];
  setVocab: (next: VocabItem[]) => void;
}) {
  const { colors, radius } = useTheme();
  const { toast } = useToast();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleToggleLearned = async () => {
    try {
      const updated = await vocabService.update(word.id, {
        isLearned: !word.isLearned,
      });
      setVocab(vocab.map((v) => (v.id === word.id ? updated : v)));
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    try {
      const text = word.definition ? `${word.word}: ${word.definition}` : word.word;
      await Clipboard.setStringAsync(text);
      toast({ title: "Word copied to clipboard!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      const text = word.definition ? `${word.word} — ${word.definition}` : word.word;
      await Share.share({ message: text });
    } catch {
      // Dismissed
    }
  };

  const handleDeleteWord = async () => {
    try {
      await vocabService.delete(word.id);
      setVocab(vocab.filter((v) => v.id !== word.id));
      toast({ title: "Word deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete word",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "45%",
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: word.isLearned ? "#22c55e4d" : colors.border,
        backgroundColor: colors.card,
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text variant="h4" style={{ flex: 1 }}>
          {word.word}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <IconButton size="iconSm" accessibilityLabel="Copy word" onPress={() => void handleCopy()}>
            <Copy size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Share word" onPress={() => void handleShare()}>
            <Share2 size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" accessibilityLabel="Delete word" onPress={() => setConfirmVisible(true)}>
            <Trash2 size={18} color={colors.mutedForeground} />
          </IconButton>
          <Pressable
            onPress={() => void handleToggleLearned()}
            hitSlop={6}
            style={{
              padding: 6,
              borderRadius: radius.md,
              backgroundColor: word.isLearned ? "#22c55e33" : colors.muted,
            }}
          >
            <Check
              size={18}
              color={word.isLearned ? "#34d399" : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      {word.definition ? (
        <Text variant="small" color="mutedForeground">
          {word.definition}
        </Text>
      ) : null}
      {word.exampleSentence ? (
        <Text variant="small" style={{ fontStyle: "italic" }}>
          “{word.exampleSentence}”
        </Text>
      ) : null}
      {word.tags.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {word.tags.map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.full,
                backgroundColor: colors.accent,
              }}
            >
              <Text variant="caption">{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete word"
        description={`Delete word "${word.word}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmVisible(false);
          void handleDeleteWord();
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}
