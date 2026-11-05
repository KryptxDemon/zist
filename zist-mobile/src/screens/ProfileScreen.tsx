import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  ImagePlus,
  Palette,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react-native";

import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Screen,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  avatarPresets,
  createInitialsAvatar,
  defaultInitialsPreset,
  getInitials,
  pickAvatarImage,
} from "@/lib/avatar";
import { useTheme } from "@/theme";
import type { User } from "@/types";

type SocialKey =
  | "websiteUrl"
  | "githubUrl"
  | "linkedinUrl"
  | "instagramUrl"
  | "xUrl"
  | "youtubeUrl";

const socialFields: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "websiteUrl", label: "Website", placeholder: "https://your-site.com" },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "xUrl", label: "X", placeholder: "https://x.com/username" },
  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@channel" },
];

const emptySocial: Record<SocialKey, string> = {
  websiteUrl: "",
  githubUrl: "",
  linkedinUrl: "",
  instagramUrl: "",
  xUrl: "",
  youtubeUrl: "",
};

const HTTP_URL = /^https?:\/\/\S+$/i;

/** A `data:image/...` avatar produced by the studio (SVG initials or JPEG upload). */
const DATA_IMAGE_URI = /^data:image\//i;

/**
 * Edit-profile form: display name, names, avatar, bio and social links.
 * Ported from the web `Profile.tsx` (profile *edit* page).
 *
 * The avatar studio mirrors the web exactly: upload a photo (centre-cropped
 * and compressed to a JPEG data URI) or pick one of eight gradient initials
 * tiles. Both are stored in the same format the web app writes, so avatars
 * are portable between the two clients.
 */
export function ProfileScreen() {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [social, setSocial] = useState<Record<SocialKey, string>>(emptySocial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setBio(user.bio || "");
    setAvatar(user.avatar || "");
    setSocial({
      websiteUrl: user.websiteUrl || "",
      githubUrl: user.githubUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      instagramUrl: user.instagramUrl || "",
      xUrl: user.xUrl || "",
      youtubeUrl: user.youtubeUrl || "",
    });
  }, [user]);

  const initials = useMemo(
    () => getInitials(firstName, lastName, displayName),
    [firstName, lastName, displayName],
  );

  const previewAvatar =
    avatar || user?.avatar || createInitialsAvatar(initials, avatarPresets[0].colors);

  const handleAvatarPick = (presetColors: readonly [string, string]) => {
    setAvatar(createInitialsAvatar(initials, presetColors));
    toast({
      title: "Avatar updated",
      description: "A new avatar style is ready.",
    });
  };

  const handleUseInitials = () => {
    setAvatar(createInitialsAvatar(initials, defaultInitialsPreset.colors));
    toast({
      title: "Initials avatar ready",
      description: "Your profile picture now uses your initials.",
    });
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const compressed = await pickAvatarImage();
      if (!compressed) return;
      setAvatar(compressed);
      toast({
        title: "Image uploaded",
        description: "Your picture was compressed for faster loading.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unable to process the image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = "Display name is required.";

    const trimmedAvatar = avatar.trim();
    if (
      trimmedAvatar &&
      !DATA_IMAGE_URI.test(trimmedAvatar) &&
      !HTTP_URL.test(trimmedAvatar)
    ) {
      next.avatar = "Enter a valid image URL starting with http(s)://";
    }

    socialFields.forEach((field) => {
      const value = social[field.key].trim();
      if (value && !HTTP_URL.test(value)) {
        next[field.key] = "Enter a valid URL starting with http(s)://";
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validate()) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        displayName: displayName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
        websiteUrl: social.websiteUrl.trim() || undefined,
        githubUrl: social.githubUrl.trim() || undefined,
        linkedinUrl: social.linkedinUrl.trim() || undefined,
        instagramUrl: social.instagramUrl.trim() || undefined,
        xUrl: social.xUrl.trim() || undefined,
        youtubeUrl: social.youtubeUrl.trim() || undefined,
      };
      await updateProfile(updates);
      toast({
        title: "Profile updated",
        description: "Your changes are live everywhere.",
      });
      router.back();
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Button
          variant="ghost"
          size="iconSm"
          onPress={() => router.back()}
          accessibilityLabel="Back"
          icon={<ArrowLeft size={18} color={colors.foreground} />}
        />
        <View style={{ flex: 1 }}>
          <Text variant="h2" weight="bold">
            Edit Profile
          </Text>
          <Text variant="muted">Refresh your avatar, socials, and bio.</Text>
        </View>
      </View>

      <Card variant="glass" style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Avatar
            name={displayName || initials}
            avatarUrl={previewAvatar}
            size="2xl"
            clickable={false}
            ring
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption" uppercase letterSpacing={2}>
              Profile preview
            </Text>
            <Text variant="h3" weight="bold" numberOfLines={1}>
              {displayName || "Your name"}
            </Text>
            <Text variant="small" numberOfLines={2}>
              {bio || "Add a short bio that introduces your learning style."}
            </Text>
          </View>
        </View>

        <Field
          label="Avatar URL"
          hint="Paste a link to an image, or build one in the avatar studio below."
          error={errors.avatar}
        >
          <Input
            value={avatar.startsWith("data:") ? "" : avatar}
            onChangeText={setAvatar}
            placeholder={
              avatar.startsWith("data:")
                ? "Generated avatar in use"
                : "https://example.com/avatar.png"
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={errors.avatar}
          />
        </Field>
      </Card>

      <Card variant="glass" style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ImagePlus size={16} color={colors.primary} />
          <Text variant="h4" weight="semibold">
            Avatar studio
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button
            variant="outline"
            label="Upload image"
            icon={<Upload size={16} color={colors.foreground} />}
            onPress={handleUpload}
            loading={isUploading}
            style={{ flex: 1 }}
          />
          <Button
            variant="outline"
            label="Use initials"
            icon={<WandSparkles size={16} color={colors.foreground} />}
            onPress={handleUseInitials}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {avatarPresets.map((preset) => (
            <Pressable
              key={preset.name}
              onPress={() => handleAvatarPick(preset.colors)}
              style={{
                flexGrow: 1,
                flexBasis: "45%",
                gap: 6,
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background + "b3",
              }}
            >
              <LinearGradient
                colors={preset.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 6 }}
              />
              <Text variant="small" weight="medium">
                {preset.name}
              </Text>
              <Text variant="caption">Tap to apply</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card variant="glass" style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} color={colors.primary} />
          <Text variant="h4" weight="semibold">
            Profile details
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Field label="First Name" style={{ flex: 1 }}>
            <Input
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your first name"
            />
          </Field>
          <Field label="Last Name" style={{ flex: 1 }}>
            <Input
              value={lastName}
              onChangeText={setLastName}
              placeholder="Your last name"
            />
          </Field>
        </View>

        <Field label="Display Name" error={errors.displayName}>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="The name people see"
            error={errors.displayName}
          />
        </Field>

        <Field label="Bio">
          <Textarea
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people what you learn, watch, or obsess over."
          />
        </Field>
      </Card>

      <Card variant="glass" style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Palette size={16} color={colors.primary} />
          <Text variant="h4" weight="semibold">
            Social links
          </Text>
        </View>

        {socialFields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            error={errors[field.key]}
          >
            <Input
              value={social[field.key]}
              onChangeText={(value) =>
                setSocial((current) => ({ ...current, [field.key]: value }))
              }
              placeholder={field.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              error={errors[field.key]}
            />
          </Field>
        ))}
      </Card>

      <Text variant="muted">
        Your avatar and links update across the app after saving.
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Button
          variant="outline"
          label="Cancel"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <Button
          label="Save Changes"
          onPress={handleSave}
          loading={isSaving}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
