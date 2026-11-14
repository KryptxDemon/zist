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
  Github,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  User as UserIcon,
  WandSparkles,
} from "lucide-react";

const socialFields = [
  { key: "websiteUrl", label: "Website", placeholder: "https://your-site.com", icon: Globe },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/username", icon: Github },
  { key: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/username", icon: Twitter },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/username", icon: Linkedin },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/username", icon: Instagram },
  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@channel", icon: Youtube },
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
  return canvas.toDataURL("image/jpeg", 0.85);
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
      description: `Selected ${name}! Remember to save your changes.`,
    });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
      toast({
        title: "Photo updated",
        description: "Image compressed and ready to save.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to process the image.",
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
        description: "Your changes are now live.",
      });
      navigate("/app/profile");
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
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-12">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app/profile")}
              className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Edit Profile
              </h1>
              <p className="text-xs text-muted-foreground">
                Update your avatar, personal info, and links.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/profile")}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 rounded-xl"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Two-Column Editor Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT: Avatar Studio (4 cols) */}
          <div className="md:col-span-5 space-y-5">
            <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Your Avatar
                </h3>
              </div>

              {/* Big Preview */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 border border-border/40">
                <div className="relative h-28 w-28 rounded-2xl overflow-hidden ring-4 ring-background border-2 border-primary/30 shadow-lg bg-background">
                  <img
                    src={previewAvatar}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-xs font-semibold text-foreground mt-3">
                  {displayName || "Your Name"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Preview in app & community
                </span>
              </div>

              {/* Upload & Initials buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseInitials}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  <WandSparkles className="h-3.5 w-3.5" />
                  Initials
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUploadChange}
                />
              </div>

              {/* Cute Avatars Grid */}
              <div className="space-y-2.5 pt-2 border-t border-border/50">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Or pick a cute character:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {cuteAvatars.map((char) => {
                    const charUri = getCuteAvatarUri(char.svg);
                    const isSelected = avatar === charUri;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleCuteAvatarPick(char.svg, char.name)}
                        className={`group relative rounded-xl p-1.5 transition-all border ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                            : "border-border/50 bg-background/50 hover:border-primary/40"
                        }`}
                        title={char.name}
                      >
                        <div className="h-10 w-10 mx-auto overflow-hidden rounded-lg bg-background/80">
                          <img
                            src={charUri}
                            alt={char.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        {isSelected && (
                          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-2 w-2" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL option */}
              <div className="pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowCustomUrlInput((v) => !v)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <LinkIcon className="h-3 w-3" />
                  {showCustomUrlInput ? "Hide image URL" : "Custom image URL..."}
                </button>
                {showCustomUrlInput && (
                  <div className="mt-2 space-y-1">
                    <Input
                      value={avatar.startsWith("data:") ? "" : avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="text-xs h-8 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Profile Information & Socials (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            {/* Identity Form */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7 space-y-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Personal Details
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Display Name <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your public name (e.g. Alex Chen)"
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Bio
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {bio.length}/280
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    maxLength={280}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Briefly tell fellow learners what you are reading, watching, or passionate about..."
                    rows={3}
                    className="rounded-xl resize-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Social Presence */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7 space-y-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Connected Links
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add your profiles so friends can discover your work
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {socialFields.map(({ key, label, placeholder, icon: Icon }) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{label}</span>
                    </Label>
                    <Input
                      id={key}
                      value={socialLinks[key]}
                      onChange={(e) =>
                        setSocialLinks((current) => ({
                          ...current,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="rounded-xl text-xs h-9"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
