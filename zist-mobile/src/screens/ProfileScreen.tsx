import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import {
  ArrowLeft,
  Camera,
  Check,
  Globe,
  Link as LinkIcon,
  Sparkles,
  User as UserIcon,
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
  createInitialsAvatar,
  cuteAvatars,
  defaultInitialsPreset,
  getCuteAvatarUri,
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
  { key: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/username" },
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
const DATA_IMAGE_URI = /^data:image\//i;

/**
 * Clean, well-organized profile edit screen.
 * Groups editing into clear sections:
 *  1. Live Identity Preview
 *  2. Cute Avatars Studio + Photo Upload
 *  3. Personal Information (Display name, names, bio)
 *  4. Social Links & Presence
 *  5. Prominent Save Actions
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
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

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
    avatar || user?.avatar || getCuteAvatarUri(cuteAvatars[0].svg);

  const handleCuteAvatarPick = (charSvg: string, charName: string) => {
    setAvatar(getCuteAvatarUri(charSvg));
    toast({
      title: "Avatar selected",
      description: `You've chosen ${charName}! Save changes to keep it.`,
    });
  };

  const handleUseInitials = () => {
    setAvatar(createInitialsAvatar(initials, defaultInitialsPreset.colors));
    toast({
      title: "Initials avatar applied",
      description: `Using your initials (${initials}).`,
    });
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const compressed = await pickAvatarImage();
      if (!compressed) return;
      setAvatar(compressed);
      toast({
        title: "Photo uploaded",
        description: "Your custom photo is ready. Tap Save to apply.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unable to select image.",
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
        description: "Your profile has been saved.",
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
      {/* Top Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Button
            variant="ghost"
            size="iconSm"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
            accessibilityLabel="Back"
            icon={<ArrowLeft size={18} color={colors.foreground} />}
          />
          <View>
            <Text variant="h2" weight="bold">
              Edit Profile
            </Text>
            <Text variant="muted">Manage your identity, avatar, and links</Text>
          </View>
        </View>

        <Button
          size="sm"
          label={isSaving ? "Saving..." : "Save"}
          onPress={handleSave}
          loading={isSaving}
        />
      </View>

      {/* 1. Identity Preview Card */}
      <Card
        variant="glass"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          padding: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
        }}
      >
        <Avatar
          name={displayName || initials}
          avatarUrl={previewAvatar}
          size="2xl"
          clickable={false}
          ring
        />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color={colors.primary} />
            <Text variant="caption" weight="semibold" uppercase letterSpacing={1.5} color="primary">
              Live Preview
            </Text>
          </View>
          <Text variant="h3" weight="bold" numberOfLines={1}>
            {displayName || "Your Name"}
          </Text>
          <Text variant="small" color="mutedForeground" numberOfLines={2}>
            {bio || "Add a bio below to tell people what you're learning & watching."}
          </Text>
        </View>
      </Card>

      {/* 2. Avatar Studio */}
      <Card
        variant="glass"
        style={{
          gap: 16,
          padding: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color={colors.primary} />
              <Text variant="h4" weight="semibold">
                Cute & Unique Avatars
              </Text>
            </View>
            <Text variant="caption" color="mutedForeground">
              Pick a character that matches your personality
            </Text>
          </View>
        </View>

        {/* 8 Cute Handcrafted Avatars Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {cuteAvatars.map((char) => {
            const charUri = getCuteAvatarUri(char.svg);
            const isSelected = avatar === charUri;

            return (
              <Pressable
                key={char.id}
                onPress={() => handleCuteAvatarPick(char.svg, char.name)}
                style={({ pressed }) => ({
                  flexGrow: 1,
                  flexBasis: "22%",
                  minWidth: 74,
                  alignItems: "center",
                  padding: 8,
                  borderRadius: 16,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary + "18" : colors.background,
                  opacity: pressed ? 0.8 : 1,
                  gap: 4,
                })}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden" }}>
                  <SvgXml xml={char.svg} width={48} height={48} />
                </View>
                <Text variant="caption" weight={isSelected ? "bold" : "medium"} numberOfLines={1}>
                  {char.name}
                </Text>
                <Text
                  variant="caption"
                  tint={isSelected ? colors.primary : colors.mutedForeground}
                  style={{ fontSize: 9 }}
                  numberOfLines={1}
                >
                  {char.tag}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={10} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Studio Action Shortcuts */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Button
            variant="outline"
            size="sm"
            label={isUploading ? "Uploading..." : "Upload Photo"}
            icon={<Camera size={14} color={colors.foreground} />}
            onPress={handleUpload}
            loading={isUploading}
            style={{ flex: 1 }}
          />
          <Button
            variant="outline"
            size="sm"
            label="Use Initials"
            icon={<WandSparkles size={14} color={colors.foreground} />}
            onPress={handleUseInitials}
            style={{ flex: 1 }}
          />
        </View>

        {/* Optional Custom Image URL */}
        <Pressable
          onPress={() => setShowCustomUrlInput((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 2 }}
        >
          <LinkIcon size={12} color={colors.primary} />
          <Text variant="caption" color="primary" weight="medium">
            {showCustomUrlInput ? "Hide custom image link" : "Or use custom image URL..."}
          </Text>
        </Pressable>

        {showCustomUrlInput && (
          <Field
            label="Custom Avatar URL"
            hint="Link directly to a publicly hosted PNG, JPG, or SVG image"
            error={errors.avatar}
          >
            <Input
              value={avatar.startsWith("data:") ? "" : avatar}
              onChangeText={setAvatar}
              placeholder="https://example.com/avatar.png"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              error={errors.avatar}
            />
          </Field>
        )}
      </Card>

      {/* 3. Basic Information */}
      <Card
        variant="glass"
        style={{
          gap: 16,
          padding: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <UserIcon size={16} color={colors.primary} />
          <Text variant="h4" weight="semibold">
            Personal Information
          </Text>
        </View>

        <Field label="Display Name *" hint="Your public handle across the community" error={errors.displayName}>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="The name people see (e.g. Alex Chen)"
            error={errors.displayName}
          />
        </Field>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Field label="First Name" style={{ flex: 1 }}>
            <Input
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
            />
          </Field>
          <Field label="Last Name" style={{ flex: 1 }}>
            <Input
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
            />
          </Field>
        </View>

        <Field label="Bio / About You" hint="Tell fellow learners about your interests, study lists, or current obsessions">
          <Textarea
            value={bio}
            onChangeText={setBio}
            placeholder="e.g. Cinema enthusiast & computer science student exploring storytelling."
          />
        </Field>
      </Card>

      {/* 4. Social Links */}
      <Card
        variant="glass"
        style={{
          gap: 16,
          padding: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Globe size={16} color={colors.primary} />
          <View>
            <Text variant="h4" weight="semibold">
              Social Links
            </Text>
            <Text variant="caption" color="mutedForeground">
              Add your profiles to let friends discover your work
            </Text>
          </View>
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

      {/* 5. Bottom Save / Cancel Actions */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 24 }}>
        <Button
          variant="outline"
          label="Cancel"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
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
