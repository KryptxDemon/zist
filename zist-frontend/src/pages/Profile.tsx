import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  cuteAvatars,
  getCuteAvatarUri,
  getInitials,
  createInitialsAvatar,
} from "@/lib/avatar";
import {
  ArrowLeft,
  Camera,
  Check,
  Globe,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  User as UserIcon,
  WandSparkles,
} from "lucide-react";

const socialFields = [
  { key: "websiteUrl", label: "Website", placeholder: "https://your-site.com" },
  { key: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/username" },
  {
    key: "githubUrl",
    label: "GitHub",
    placeholder: "https://github.com/username",
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/username",
  },
  {
    key: "instagramUrl",
    label: "Instagram",
    placeholder: "https://instagram.com/username",
  },
  {
    key: "youtubeUrl",
    label: "YouTube",
    placeholder: "https://youtube.com/@channel",
  },
] as const;

async function compressImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = source;
  });

  const outputSize = 320;
  const size = Math.min(image.width, image.height);
  const cropX = Math.max(0, (image.width - size) / 2);
  const cropY = Math.max(0, (image.height - size) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to compress image");
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    size,
    size,
    0,
    0,
    outputSize,
    outputSize,
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    websiteUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    instagramUrl: "",
    xUrl: "",
    youtubeUrl: "",
  });

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setBio(user.bio || "");
    setAvatar(user.avatar || "");
    setSocialLinks({
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
    [displayName, firstName, lastName],
  );

  const previewAvatar =
    avatar || user?.avatar || getCuteAvatarUri(cuteAvatars[0].svg);

  const handleCuteAvatarPick = (svg: string, name: string) => {
    setAvatar(getCuteAvatarUri(svg));
    toast({
      title: "Avatar selected",
      description: `You've chosen ${name}! Click Save Changes to keep it.`,
    });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
      toast({
        title: "Image uploaded",
        description: "Your picture was compressed for fast loading.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to process the image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseInitials = () => {
    setAvatar(createInitialsAvatar(initials));
    toast({
      title: "Initials avatar ready",
      description: `Using your initials (${initials}).`,
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast({
        title: "Display name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
        websiteUrl: socialLinks.websiteUrl.trim() || undefined,
        githubUrl: socialLinks.githubUrl.trim() || undefined,
        linkedinUrl: socialLinks.linkedinUrl.trim() || undefined,
        instagramUrl: socialLinks.instagramUrl.trim() || undefined,
        xUrl: socialLinks.xUrl.trim() || undefined,
        youtubeUrl: socialLinks.youtubeUrl.trim() || undefined,
      });

      toast({
        title: "Profile updated",
        description: "Your changes are live everywhere.",
      });
      navigate("/app/profile");
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-12">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app/profile")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Edit Profile
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your identity, cute avatars, and social presence.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>

        {/* 1. Identity Preview Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/15 via-background to-cyan-500/10 p-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="h-24 w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-primary/30 bg-background shadow-xl">
              <img
                src={previewAvatar}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  Live Preview
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground truncate">
                {displayName || "Your Name"}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bio || "Add a short bio below to introduce yourself to friends and learners."}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Cute & Unique Avatar Studio */}
        <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">
                  Cute & Unique Avatars
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick a handcrafted character that matches your personality
              </p>
            </div>
          </div>

          {/* 8 Cute Characters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {cuteAvatars.map((char) => {
              const charUri = getCuteAvatarUri(char.svg);
              const isSelected = avatar === charUri;

              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleCuteAvatarPick(char.svg, char.name)}
                  className={`group relative flex flex-col items-center gap-2 rounded-2xl p-2.5 transition-all text-center border ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40"
                      : "border-border/60 bg-background/50 hover:bg-accent/40 hover:border-primary/40"
                  }`}
                >
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-background/60 shadow-inner">
                    <img
                      src={charUri}
                      alt={char.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate w-full">
                    {char.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate w-full">
                    {char.tag}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Photo Upload & Initials Shortcuts */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Upload Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseInitials}
              className="gap-2"
            >
              <WandSparkles className="h-4 w-4" />
              Use Initials
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleUploadChange}
            />

            <button
              type="button"
              onClick={() => setShowCustomUrlInput((v) => !v)}
              className="text-xs text-primary hover:underline flex items-center gap-1.5 ml-auto self-center"
            >
              <LinkIcon className="h-3 w-3" />
              {showCustomUrlInput ? "Hide image link input" : "Or use custom image URL..."}
            </button>
          </div>

          {showCustomUrlInput && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Custom Avatar URL</Label>
              <Input
                value={avatar.startsWith("data:") ? "" : avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* 3. Personal Information */}
        <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">
              Personal Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="The name people see (e.g. Alex Chen)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium">
                Bio / About You
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cinema enthusiast & CS student exploring storytelling and history."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 4. Social Links */}
        <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Social Links
              </h3>
              <p className="text-xs text-muted-foreground">
                Connect your profiles so friends can discover your work
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {socialFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  value={socialLinks[field.key]}
                  onChange={(e) =>
                    setSocialLinks((current) => ({
                      ...current,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 5. Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/app/profile")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[140px]">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
