import { Link } from "expo-router";
import { View } from "react-native";

import { Button, EmptyState, Screen } from "@/components/ui";
import { Compass } from "lucide-react-native";
import { useTheme } from "@/theme";

export default function NotFound() {
  const { colors } = useTheme();
  return (
    <Screen scroll={false} contentContainerStyle={{ justifyContent: "center" }}>
      <EmptyState
        icon={<Compass size={28} color={colors.mutedForeground} />}
        title="Page not found"
        description="The screen you were looking for doesn't exist in the app."
        action={
          <Link href="/" asChild>
            <Button label="Back to dashboard" />
          </Link>
        }
      />
    </Screen>
  );
}
