import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";

import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle } from "@/lib/googleAuth";
import { brandColors } from "@/theme/brandTokens";
import { Button, Text, useToast } from "@/components/ui";
import { AuthScaffold, OrDivider } from "@/components/auth/AuthScaffold";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  AuthField,
  AuthInput,
  authButtonLabel,
  authFootnote,
  authMono,
  authPill,
  authTitle,
} from "@/components/auth/authKit";

/** Native port of the web `Login` page. */
export function LoginScreen() {
  const { login, reload } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast({
        title: "Missing details",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      router.replace("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await signInWithGoogle("login");
      if (!user) {
        setIsGoogleLoading(false);
        return;
      }
      await reload();
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      router.replace("/");
    } catch (error) {
      setIsGoogleLoading(false);
      toast({
        title: "Google sign-in unavailable",
        description: error instanceof Error ? error.message : "Unable to start Google sign-in.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthScaffold>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 40,
            gap: 19,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={authTitle}>Welcome Back</Text>
            <Text tint={brandColors.soft} style={{ fontSize: 16, lineHeight: 24 }}>
              Welcome back! Please enter your details.
            </Text>
          </View>

          <View style={{ gap: 19 }}>
            <AuthField label="Email">
              <AuthInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </AuthField>

            <AuthField label="Password">
              <AuthInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit()}
                trailing={
                  <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={brandColors.soft} />
                    ) : (
                      <Eye size={18} color={brandColors.soft} />
                    )}
                  </Pressable>
                }
              />
            </AuthField>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ true: brandColors.accent, false: brandColors.line }}
                  thumbColor="#ffffff"
                />
                <Text tint={brandColors.soft} style={{ fontSize: 13 }}>
                  Remember me
                </Text>
              </View>
              <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8}>
                <Text tint={brandColors.accent} style={authMono}>
                  Forgot password
                </Text>
              </Pressable>
            </View>

            <Button
              variant="default"
              size="lg"
              fullWidth
              label="Sign in"
              loading={isLoading}
              onPress={handleSubmit}
              style={authPill}
              textStyle={authButtonLabel}
            />
          </View>

          <OrDivider />

          <GoogleSignInButton
            label="Sign in with Google"
            loading={isGoogleLoading}
            onPress={handleGoogleLogin}
          />

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <Text style={authFootnote}>{"Don't have an account?"}</Text>
            <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
              <Text tint={brandColors.accent} weight="semibold" style={{ fontSize: 14 }}>
                Sign up for free!
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScaffold>
  );
}
