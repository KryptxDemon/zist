import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";

import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle } from "@/lib/googleAuth";
import { brandColors } from "@/theme/brandTokens";
import { Button, Input, Sheet, Text, useToast } from "@/components/ui";
import { AuthScaffold, OrDivider } from "@/components/auth/AuthScaffold";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  getCandidateBaseUrls,
  getCustomApiUrl,
  setCustomApiUrl,
  testServerConnection,
} from "@/services/apiClient";
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

  // Server host configuration
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(
    () => getCustomApiUrl() || getCandidateBaseUrls()[0] || "http://192.168.0.110:8000/api/v1",
  );
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  const activeServerUrl = getCandidateBaseUrls()[0] || serverUrlInput;

  const handleTestConnection = async () => {
    setIsTestingServer(true);
    setTestResult(null);
    try {
      const res = await testServerConnection(serverUrlInput);
      if (res.ok) {
        setTestResult({ ok: true, message: "FastAPI server reached successfully!" });
      } else {
        setTestResult({
          ok: false,
          message: `Connection failed: ${res.error || `HTTP ${res.status}`}. Ensure server is running and firewall allows port 8000.`,
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: `Connection failed: ${e?.message || "Unknown error"}`,
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleSaveServerUrl = () => {
    setCustomApiUrl(serverUrlInput.trim() || null);
    setShowServerConfig(false);
    toast({
      title: "Server URL updated",
      description: `Active server: ${serverUrlInput.trim() || "Default"}`,
    });
  };

  const handleResetServerUrl = () => {
    setCustomApiUrl(null);
    const def = getCandidateBaseUrls()[0] || "http://192.168.0.110:8000/api/v1";
    setServerUrlInput(def);
    setTestResult(null);
    setShowServerConfig(false);
    toast({
      title: "Server reset",
      description: `Reset to default candidates: ${def}`,
    });
  };

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

          <Pressable
            onPress={() => {
              setTestResult(null);
              setShowServerConfig(true);
            }}
            style={{
              marginTop: 18,
              alignSelf: "center",
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <Text tint={brandColors.soft} style={{ fontSize: 11, fontFamily: "GeistMono_400Regular" }}>
              ⚙️ Server: {activeServerUrl.replace(/^https?:\/\//, "").replace(/\/api\/v1$/, "")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet
        visible={showServerConfig}
        onClose={() => setShowServerConfig(false)}
        presentation="dialog"
        title="Backend Server Configuration"
        description="Set the API host URL reachable from your mobile device."
      >
        <View style={{ gap: 14, paddingVertical: 8 }}>
          <Input
            label="FastAPI Base URL"
            value={serverUrlInput}
            onChangeText={(text) => {
              setServerUrlInput(text);
              setTestResult(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            hint="e.g. http://192.168.0.110:8000/api/v1 or https://<tunnel>.loca.lt/api/v1"
          />

          {testResult ? (
            <View
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: testResult.ok
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
                borderWidth: 1,
                borderColor: testResult.ok
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(239, 68, 68, 0.3)",
              }}
            >
              <Text
                tint={testResult.ok ? "#4ade80" : "#f87171"}
                style={{ fontSize: 12, lineHeight: 18 }}
              >
                {testResult.message}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Button
              variant="outline"
              size="sm"
              label="Test Ping"
              loading={isTestingServer}
              onPress={handleTestConnection}
              style={{ flex: 1 }}
            />
            <Button
              variant="outline"
              size="sm"
              label="Reset"
              onPress={handleResetServerUrl}
            />
            <Button
              variant="default"
              size="sm"
              label="Save"
              onPress={handleSaveServerUrl}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Sheet>
    </AuthScaffold>
  );
}
