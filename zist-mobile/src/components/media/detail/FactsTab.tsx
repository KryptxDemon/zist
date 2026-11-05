import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Info, Plus } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  EmptyState,
  Input,
  Select,
  Sheet,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
import { factService } from "@/services/mediaService";
import type { FactItem } from "@/types";
import { DetailSection } from "./primitives";

const CATEGORY_LABELS: Record<FactItem["category"], string> = {
  misconception: "Common Misconception",
  reference: "Reference/Influence",
  context: "Context & Background",
};

const CATEGORY_ORDER: FactItem["category"][] = [
  "misconception",
  "reference",
  "context",
];

/** Facts tab — context, references and misconceptions grouped by category. */
export function FactsTab({
  mediaId,
  facts,
  setFacts,
  openAddNonce = 0,
}: {
  mediaId: string;
  facts: FactItem[];
  setFacts: (next: FactItem[]) => void;
  /** Increment to programmatically open the "Add Fact" sheet. */
  openAddNonce?: number;
}) {
  const { colors } = useTheme();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newFact, setNewFact] = useState<{
    content: string;
    category: FactItem["category"];
    source: string;
  }>({ content: "", category: "context", source: "" });

  useEffect(() => {
    if (openAddNonce > 0) setIsAddOpen(true);
  }, [openAddNonce]);

  const handleAddFact = async () => {
    if (!newFact.content.trim()) return;
    setIsAdding(true);
    try {
      const fact = await factService.create({
        mediaId,
        content: newFact.content.trim(),
        category: newFact.category,
        source: newFact.source.trim() || undefined,
        order: facts.length,
      });
      setFacts([...facts, fact]);
      setNewFact({ content: "", category: "context", source: "" });
      setIsAddOpen(false);
      toast({ title: "Fact added!" });
    } catch {
      toast({ title: "Failed to add fact", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: facts.filter((fact) => fact.category === category),
  })).filter((group) => group.items.length > 0);

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
        <Text variant="h4">Facts & Context</Text>
        <Button
          size="sm"
          icon={<Plus size={16} color={colors.primaryForeground} />}
          label="Add Fact"
          onPress={() => setIsAddOpen(true)}
        />
      </View>

      {facts.length === 0 ? (
        <EmptyState
          icon={<Info size={28} color={colors.mutedForeground} />}
          title="No facts yet"
          description="Add facts, misconceptions, and context about this media."
          action={
            <Button
              icon={<Plus size={16} color={colors.primaryForeground} />}
              label="Add First Fact"
              onPress={() => setIsAddOpen(true)}
            />
          }
        />
      ) : (
        <View style={{ gap: 20 }}>
          {grouped.map((group) => (
            <View key={group.category} style={{ gap: 10 }}>
              <Text variant="label" color="mutedForeground" uppercase letterSpacing={0.6}>
                {CATEGORY_LABELS[group.category]}
              </Text>
              {group.items.map((fact) => (
                <DetailSection key={fact.id}>
                  <Text variant="body">{fact.content}</Text>
                  {fact.source ? (
                    <Text variant="small" color="mutedForeground">
                      Source: {fact.source}
                    </Text>
                  ) : null}
                </DetailSection>
              ))}
            </View>
          ))}
        </View>
      )}

      <Sheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Fact"
        footer={
          <Button
            fullWidth
            loading={isAdding}
            label="Add Fact"
            onPress={() => void handleAddFact()}
          />
        }
      >
        <Select
          label="Category"
          value={newFact.category}
          onChange={(value) => setNewFact({ ...newFact, category: value })}
          options={CATEGORY_ORDER.map((category) => ({
            value: category,
            label: CATEGORY_LABELS[category],
          }))}
        />
        <Textarea
          label="Content"
          placeholder="Enter the fact…"
          value={newFact.content}
          onChangeText={(content) => setNewFact({ ...newFact, content })}
        />
        <Input
          label="Source (optional)"
          placeholder="e.g., Wikipedia"
          value={newFact.source}
          onChangeText={(source) => setNewFact({ ...newFact, source })}
        />
      </Sheet>
    </View>
  );
}
