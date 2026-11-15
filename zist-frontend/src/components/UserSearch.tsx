import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import { userService } from "@/services/userService";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSearchProps {
  placeholder?: string;
  onUserSelect?: (user: User) => void;
  className?: string;
  renderTrailing?: (user: User) => React.ReactNode;
  showAddFriend?: boolean;
  variant?: "dropdown" | "inline";
  onFriendChange?: () => void;
}

export function UserSearch({
  placeholder = "Search users...",
  onUserSelect,
  className,
  renderTrailing,
  showAddFriend = true,
  variant = "dropdown",
  onFriendChange,
}: UserSearchProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const users = await userService.searchUsers(query);
        setResults(users);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (variant === "inline") return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  const handleSelectUser = (user: User) => {
    if (onUserSelect) {
      onUserSelect(user);
    } else {
      navigate(`/app/user/${user.id}`);
    }
    if (variant === "dropdown") {
      setQuery("");
      setIsOpen(false);
      setResults([]);
    }
  };

  const renderResultsList = () => {
    if (isLoading) {
      return (
        <div className="p-4 text-center text-muted-foreground text-xs sm:text-sm">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Searching...
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-xs sm:text-sm">
          No users found
        </div>
      );
    }

    return (
      <div className="py-1 divide-y divide-border/40">
        {results.map((user) => {
          const isMe = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className="px-3 py-2.5 hover:bg-accent/40 text-left transition-colors flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => handleSelectUser(user)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none"
              >
                <UserAvatar
                  userId={user.id}
                  name={user.displayName}
                  avatarUrl={user.avatar}
                  clickable={false}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">
                      {user.displayName}
                    </p>
                    {isMe && (
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.2 bg-muted rounded">
                        You
                      </span>
                    )}
                  </div>
                  {user.bio ? (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user.bio}
                    </p>
                  ) : null}
                </div>
              </button>

              <div
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {renderTrailing ? (
                  renderTrailing(user)
                ) : showAddFriend && !isMe ? (
                  <FriendActionButton
                    targetUserId={user.id}
                    targetUserName={user.displayName}
                    hideSelf
                    onChange={onFriendChange}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const showResults = (variant === "inline" || isOpen) && query.trim().length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9 text-xs sm:text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {showResults && (
        variant === "inline" ? (
          <div className="mt-2.5 bg-card/60 border border-border/60 rounded-xl overflow-hidden">
            {renderResultsList()}
          </div>
        ) : (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            {renderResultsList()}
          </div>
        )
      )}
    </div>
  );
}
