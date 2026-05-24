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
  ArrowLeft,
  ImagePlus,
  Loader2,
  Palette,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";

const avatarPresets = [
  { name: "Aurora", colors: ["#0ea5e9", "#1d4ed8"] },
  { name: "Sunset", colors: ["#fb7185", "#f97316"] },
  { name: "Forest", colors: ["#22c55e", "#166534"] },
  { name: "Midnight", colors: ["#1f2937", "#4f46e5"] },
  { name: "Candy", colors: ["#ec4899", "#8b5cf6"] },
  { name: "Citrus", colors: ["#f59e0b", "#eab308"] },
  { name: "Ocean", colors: ["#06b6d4", "#0f766e"] },
  { name: "Slate", colors: ["#334155", "#0f172a"] },
] as const;

const socialFields = [
  { key: "websiteUrl", label: "Website", placeholder: "https://your-site.com" },
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
  { key: "xUrl", label: "X", placeholder: "https://x.com/username" },
  {
    key: "youtubeUrl",
    label: "YouTube",
    placeholder: "https://youtube.com/@channel",
  },
] as const;

function getInitials(
  firstName: string,
  lastName: string,
  displayName: string,
): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  if (first || last) return `${first}${last}`.trim().toUpperCase();

  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }

  return (displayName.trim().charAt(0) || "U").toUpperCase();
}

function createInitialsAvatar(
  initials: string,
  colors: readonly [string, string],
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="100%" stop-color="${colors[1]}" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bg)" />
      <circle cx="256" cy="256" r="176" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="54%" text-anchor="middle" font-family="Arial, sans-serif" font-size="164" font-weight="700" fill="white" dominant-baseline="middle">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

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
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
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

  const handleAvatarPick = (colors: readonly [string, string]) => {
    setAvatar(createInitialsAvatar(initials, colors));
    toast({
      title: "Avatar updated",
      description: "A new avatar style is ready.",
    });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
      toast({
        title: "Image uploaded",
        description: "Your picture was compressed for faster loading.",
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
    }
  };

  const handleUseInitials = () => {
    setAvatar(createInitialsAvatar(initials, avatarPresets[3].colors));
    toast({
      title: "Initials avatar ready",
      description: "Your profile picture now uses your initials.",
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateProfile({
        displayName,
        firstName,
        lastName,
        bio,
        avatar: avatar || undefined,
        websiteUrl: socialLinks.websiteUrl || undefined,
        githubUrl: socialLinks.githubUrl || undefined,
        linkedinUrl: socialLinks.linkedinUrl || undefined,
        instagramUrl: socialLinks.instagramUrl || undefined,
        xUrl: socialLinks.xUrl || undefined,
        youtubeUrl: socialLinks.youtubeUrl || undefined,
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

  const previewAvatar =
    avatar ||
    user?.avatar ||
    createInitialsAvatar(initials, avatarPresets[0].colors);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Edit Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              Refresh your avatar, socials, and bio.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/app/profile")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-6">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-br from-primary/15 via-background to-cyan-500/10 p-6">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="h-24 w-24 rounded-[1.5rem] overflow-hidden border border-white/10 bg-background shadow-xl">
                  <img
                    src={previewAvatar}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Profile preview
                  </p>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {displayName || "Your name"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {bio ||
                      "Add a short bio that introduces your learning style."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Avatar studio</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={handleUploadClick}
                  className="justify-start gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload image
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUseInitials}
                  className="justify-start gap-2"
                >
                  <WandSparkles className="h-4 w-4" />
                  Use initials
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUploadChange}
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAvatarPick(preset.colors)}
                    className="group rounded-2xl border border-border/60 bg-background/70 p-3 text-left transition-all hover:border-primary/40 hover:shadow-lg"
                  >
                    <div
                      className="mb-3 h-16 w-16 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                      }}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {preset.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to apply
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Profile details
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="The name people see"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people what you learn, watch, or obsess over."
                  rows={5}
                />
              </div>
            </div>

            <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Social links
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {socialFields.map((field) => (
                  <div key={field.key} className="space-y-2 sm:col-span-1">
                    <Label htmlFor={field.key}>{field.label}</Label>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Your avatar and links update across the app after saving.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/app/profile")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-w-36"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
