import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { Search, UserRound } from "lucide-react-native";

import { Avatar, Card, EmptyState, SearchInput, Text } from "@/components/ui";
import { useTheme } from "@/theme";
import { userService } from "@/services/userService";
import type { User } from "@/types";

interface UserSearchProps {
  placeholder?: string;
  /** Override the default "push to /user/:id" behaviour. */
  onUserSelect?: (user: User) => void;
  /** Rendered to the right of each result row (e.g. a FriendActionButton). */
  renderTrailing?: (user: User) => React.ReactNode;
  style?: ViewStyle;
}

/**
 * Debounced user search backed by `userService.searchUsers`.
 *
 * The web version rendered an absolutely-positioned dropdown; on mobile we
 * render the results inline below the field (there is no click-outside event
 * in React Native).
 */
export function UserSearch({
  placeholder = "Search users…",
  onUserSelect,
  renderTrailing,
  style,
}: UserSearchProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Guards against out-of-order responses from slow requests.
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      requestId.current += 1;
      setResults([]);
      setIsLoading(false);
      return;
    }

    const current = requestId.current + 1;
    requestId.current = current;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const users = await userService.searchUsers(trimmed);
        if (requestId.current === current) setResults(users);
      } catch {
        if (requestId.current === current) setResults([]);
      } finally {
        if (requestId.current === current) setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = (user: User) => {
    if (onUserSelect) {
      onUserSelect(user);
    } else {
      router.push(`/user/${user.id}`);
    }
    setQuery("");
    setResults([]);
  };

  const showResults = query.trim().length > 0;

  return (
    <View style={[{ gap: 12 }, style]}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        icon={<Search size={18} color={colors.mutedForeground} />}
      />

      {showResults ? (
        isLoading ? (
          <Card style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="muted">Searching…</Text>
          </Card>
        ) : results.length > 0 ? (
          <View style={{ gap: 8 }}>
            {results.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => handleSelectUser(user)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Avatar
                  userId={user.id}
                  name={user.displayName}
                  avatarUrl={user.avatar}
                  clickable={false}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" weight="semibold" numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  {user.bio ? (
                    <Text variant="caption" numberOfLines={1}>
                      {user.bio}
                    </Text>
                  ) : null}
                </View>
                {renderTrailing ? renderTrailing(user) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<UserRound size={24} color={colors.primary} />}
            title="No users found"
            description="Try a different name or check the spelling."
          />
        )
      ) : null}
    </View>
  );
}
