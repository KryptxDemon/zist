import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { Button, Input, Select, Sheet, StarRating, Text } from "@/components/ui";
import type { MediaItem, MediaStatus } from "@/types";

export interface MediaEditValues {
  title: string;
  creator?: string;
  year?: number;
  status: MediaStatus;
  rating?: number;
}

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

/** Bottom sheet form for editing a media item's core metadata. */
export function EditMediaSheet({
  visible,
  media,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  media: MediaItem;
  onClose: () => void;
  onSubmit: (values: MediaEditValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(media.title);
  const [creator, setCreator] = useState(media.creator ?? "");
  const [year, setYear] = useState(media.year ? String(media.year) : "");
  const [status, setStatus] = useState<MediaStatus>(media.status);
  const [rating, setRating] = useState(media.rating ?? 0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(media.title);
    setCreator(media.creator ?? "");
    setYear(media.year ? String(media.year) : "");
    setStatus(media.status);
    setRating(media.rating ?? 0);
    setIsSaving(false);
  }, [visible, media]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const parsedYear = Number.parseInt(year.trim(), 10);
      await onSubmit({
        title: title.trim(),
        creator: creator.trim() || undefined,
        year: Number.isNaN(parsedYear) ? undefined : parsedYear,
        status,
        rating: rating > 0 ? rating : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit media"
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button variant="outline" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
          <Button
            label="Save"
            loading={isSaving}
            disabled={!title.trim()}
            onPress={() => void handleSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Title" />
      <Input
        label="Creator"
        value={creator}
        onChangeText={setCreator}
        placeholder="Director, author…"
      />
      <Input
        label="Year"
        value={year}
        onChangeText={setYear}
        placeholder="e.g., 2019"
        keyboardType="number-pad"
        maxLength={4}
      />
      <Select
        label="Status"
        value={status}
        onChange={setStatus}
        options={STATUS_OPTIONS}
      />
      <View style={{ gap: 6 }}>
        <Text variant="label" weight="medium">
          Rating
        </Text>
        <StarRating value={rating} size={26} onChange={setRating} />
      </View>
    </Sheet>
  );
}
