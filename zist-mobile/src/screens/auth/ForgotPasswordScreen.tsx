import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Card, Field, Input, Text, useToast } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";

/** Native port of the web `ForgotPassword` page. */
export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // The backend has no reset endpoint yet; the web app simulates the call.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubmitted(true);
    toast({
      title: "Reset link sent",
      description: "Check your email for password reset instructions.",
    });
  };

  return (
    <AuthScaffold variant="app">
      <View style={{ flex: 1, padding: 20, paddingTop: 40, gap: 24 }}>
        <View style={{ alignItems: "center", gap: 14 }}>
          <View
            style={{
              height: 48,
              width: 48,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="h3" tint={colors.primaryForeground} weight="bold">
              Z
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text variant="h2" align="center">
              Reset your password
            </Text>
            <Text variant="muted" align="center">
              {"We'll send you a link to reset it"}
            </Text>
          </View>
        </View>

        <Card variant="glass" style={{ padding: 24 }}>
          {isSubmitted ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <View
                style={{
                  height: 64,
                  width: 64,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "1a",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail size={28} color={colors.primary} />
              </View>
              <Text variant="h4" align="center">
                Check your inbox
              </Text>
              <Text variant="muted" align="center">
                {"We've sent a password reset link to "}
                <Text variant="small" weight="semibold" tint={colors.foreground}>
                  {email}
                </Text>
              </Text>
              <Button
                variant="outline"
                label="Back to login"
                icon={<ArrowLeft size={16} color={colors.foreground} />}
                onPress={() => router.replace("/login")}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <Field label="Email">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </Field>

              <Button size="lg" fullWidth label="Send reset link" loading={isLoading} onPress={handleSubmit} />

              <Pressable
                onPress={() => router.replace("/login")}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <ArrowLeft size={14} color={colors.mutedForeground} />
                <Text variant="small">Back to login</Text>
              </Pressable>
            </View>
          )}
        </Card>
      </View>
    </AuthScaffold>
  );
}
