import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Eye, EyeOff, X } from "lucide-react-native";

import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { signInWithGoogle } from "@/lib/googleAuth";
import { brandColors } from "@/theme/brandTokens";
import { Button, Progress, Text, useToast } from "@/components/ui";
import { AuthScaffold, OrDivider } from "@/components/auth/AuthScaffold";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  AuthField,
  AuthInput,
  authButtonLabel,
  authFootnote,
  authPill,
  authTitle,
} from "@/components/auth/authKit";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#dc2626" };
  if (score <= 2) return { score, label: "Fair", color: "#f97316" };
  if (score <= 3) return { score, label: "Good", color: "#7c6fe0" };
  return { score, label: "Strong", color: "#9f5ddb" };
}

interface DisplayNameStatus {
  available: boolean | null;
  suggestions: string[];
  checked: string;
  loading: boolean;
}

const EMPTY_STATUS: DisplayNameStatus = { available: null, suggestions: [], checked: "", loading: false };

/** Native port of the web `Signup` page (incl. display-name availability check). */
export function SignupScreen() {
  const { signup, reload } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const lastNameRef = useRef<any>(null);
  const displayNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [displayNameStatus, setDisplayNameStatus] = useState<DisplayNameStatus>(EMPTY_STATUS);

  useEffect(() => {
    if (!displayName.trim()) {
      setDisplayNameStatus(EMPTY_STATUS);
      return;
    }

    const handle = setTimeout(async () => {
      setDisplayNameStatus((current) => ({ ...current, loading: true }));
      try {
        const result = await authService.checkDisplayName(displayName.trim());
        setDisplayNameStatus({
          available: result.available,
          suggestions: result.suggestions,
          checked: result.display_name,
          loading: false,
        });
      } catch {
        setDisplayNameStatus((current) => ({ ...current, loading: false }));
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [displayName]);

  const strength = getPasswordStrength(password);
  const requirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
    { met: /[^A-Za-z0-9]/.test(password), text: "One special character" },
  ];

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !displayName.trim() || !email.trim() || !password) {
      toast({ title: "Missing details", description: "Please fill in every field.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password, displayName, firstName, lastName);
      toast({ title: "Welcome to Zist!", description: "Your account has been created successfully." });
      router.replace("/");
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Signup failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const user = await signInWithGoogle("signup");
      if (!user) {
        setIsGoogleLoading(false);
        return;
      }
      await reload();
      toast({ title: "Welcome to Zist!", description: "Your account has been created successfully." });
      router.replace("/");
    } catch (error) {
      setIsGoogleLoading(false);
      toast({
        title: "Google sign-up unavailable",
        description: error instanceof Error ? error.message : "Unable to start Google sign-up.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthScaffold>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 40,
            gap: 16,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={authTitle}>Create Account</Text>
            <Text tint={brandColors.soft} style={{ fontSize: 16, lineHeight: 24 }}>
              Join us and start learning today
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <AuthField label="First Name" style={{ flex: 1 }}>
                <AuthInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </AuthField>
              <AuthField label="Last Name" style={{ flex: 1 }}>
                <AuthInput
                  ref={lastNameRef}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  textContentType="familyName"
                  autoComplete="family-name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => displayNameRef.current?.focus()}
                />
              </AuthField>
            </View>

            <AuthField
              label="Display Name"
              hint={
                displayNameStatus.loading
                  ? "Checking availability…"
                  : displayNameStatus.available === true
                    ? "Display name is available."
                    : displayNameStatus.available === false
                      ? "Display name is already taken. Try one of the suggestions below."
                      : "Use 2–100 characters. Availability will be checked automatically."
              }
            >
              <AuthInput
                ref={displayNameRef}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="nickname"
                autoComplete="username-new"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </AuthField>

            {displayNameStatus.available === false && displayNameStatus.suggestions.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {displayNameStatus.suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => setDisplayName(suggestion)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: brandColors.accent + "55",
                      backgroundColor: brandColors.accent + "14",
                    }}
                  >
                    <Text variant="small" tint={brandColors.accent} weight="medium">
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <AuthField label="Email">
              <AuthInput
                ref={emailRef}
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
                textContentType="newPassword"
                autoComplete="new-password"
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

            {password ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Progress value={(strength.score / 5) * 100} color={strength.color} height={6} />
                  </View>
                  <Text variant="caption" tint={strength.color} weight="semibold">
                    {strength.label}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
                  {requirements.map((req) => (
                    <View
                      key={req.text}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, width: "50%" }}
                    >
                      {req.met ? (
                        <Check size={14} color="#16a34a" />
                      ) : (
                        <X size={14} color={brandColors.soft} />
                      )}
                      <Text variant="caption" tint={req.met ? brandColors.paper : brandColors.soft}>
                        {req.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Button
              variant="default"
              size="lg"
              fullWidth
              label="Sign up"
              loading={isLoading}
              onPress={handleSubmit}
              style={authPill}
              textStyle={authButtonLabel}
            />
          </View>

          <OrDivider />

          <GoogleSignInButton
            label="Sign up with Google"
            loading={isGoogleLoading}
            onPress={handleGoogleSignup}
          />

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <Text style={authFootnote}>Already have an account?</Text>
            <Pressable onPress={() => router.push("/login")} hitSlop={8}>
              <Text tint={brandColors.accent} weight="semibold" style={{ fontSize: 14 }}>
                Sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScaffold>
  );
}
