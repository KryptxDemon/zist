import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { User, UserProfile, FeedPost } from "@/types";
import {
  Users,
  UserPlus,
  Mail,
  Calendar,
  Share2,
  Heart,
  Bookmark,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);

  // If no userId provided and user is logged in, show their own profile
  const displayUserId = userId || currentUser?.id;

  useEffect(() => {
    if (!displayUserId) return;
    loadProfile();
  }, [displayUserId]);

  async function loadProfile() {
    setIsLoading(true);
    try {
      // Get profile data
      const profileData = await userService.getUserProfile(displayUserId!);
      if (profileData) {
        setProfile(profileData);

        // Get user's posts
        const userPosts = await userService.getUserPosts(displayUserId!);
        setPosts(userPosts);

        // Check if current user follows this profile
        if (currentUser && displayUserId !== currentUser.id) {
          const following = await userService.isFollowing(
            currentUser.id,
            displayUserId!,
          );
          setIsFollowing(following);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({ title: "Failed to load profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !displayUserId || displayUserId === currentUser.id)
      return;

    setIsLoadingFollow(true);
    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.id, displayUserId);
        setIsFollowing(false);
        toast({ title: "Unfollowed" });
      } else {
        await userService.followUser(currentUser.id, displayUserId);
        setIsFollowing(true);
        toast({ title: "Following" });
      }
      // Reload profile to update stats
      await loadProfile();
    } catch (error) {
      toast({
        title: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const isOwnProfile = currentUser?.id === displayUserId;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
          <FeedPostSkeleton count={3} />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <EmptyState
          icon={Users}
          title="User not found"
          description="This user profile doesn't exist or has been deleted."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-0">
        {/* Profile Header */}
        <div className="glass grain rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-4xl md:text-5xl font-display font-bold text-primary">
                {profile.displayName[0]?.toUpperCase() || "U"}
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {profile.displayName}
                </h1>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </p>
              </div>

              {profile.bio && (
                <p className="text-foreground text-sm md:text-base max-w-lg">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </div>

              {/* Action Button */}
              {!isOwnProfile && currentUser && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={isLoadingFollow}
                  variant={isFollowing ? "outline" : "default"}
                  className="mt-4"
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-border">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {profile.stats?.mediaItems || 0}
              </p>
              <p className="text-xs text-muted-foreground">Media Items</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {profile.stats?.sharedPosts || 0}
              </p>
              <p className="text-xs text-muted-foreground">Shared Posts</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {profile.stats?.followers || 0}
              </p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {profile.stats?.following || 0}
              </p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Recent Shares</h2>
          </div>

          {posts.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="No shared content yet"
              description={
                isOwnProfile
                  ? "Start sharing your learning highlights!"
                  : "This user hasn't shared any content yet."
              }
            />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} isSaved={post.isSaved} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Helper component for rendering a single post
function PostCard({ post, isSaved }: { post: FeedPost; isSaved: boolean }) {
  const getContentPreview = () => {
    switch (post.type) {
      case "theme":
        return {
          title: (post.content as any).title,
          text: (post.content as any).summary,
        };
      case "vocab":
        return {
          title: (post.content as any).word,
          text: (post.content as any).definition,
        };
      case "quote":
        return {
          title: "Quote",
          text: (post.content as any).text,
        };
      default:
        return { title: "Content", text: "" };
    }
  };

  const content = getContentPreview();

  return (
    <div className="glass grain rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary uppercase tracking-wide">
            {post.type}
          </p>
          <h3 className="font-semibold text-foreground">{content.title}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaved && (
            <Bookmark className="h-4 w-4 fill-primary text-primary" />
          )}
        </div>
      </div>

      {content.text && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {content.text}
        </p>
      )}

      {post.caption && (
        <p className="text-sm text-foreground italic">"{post.caption}"</p>
      )}

      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Heart className="h-4 w-4" />
          <span>{post.likes}</span>
        </div>
        <span>
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
