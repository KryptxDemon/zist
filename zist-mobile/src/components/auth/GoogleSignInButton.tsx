import React from "react";
import { Button } from "@/components/ui";
import { authButtonLabel, authOutline } from "./authKit";
import { GoogleMark } from "./AuthScaffold";

/**
 * "Sign in with Google" button used on the login and signup screens.
 * Matches the web's `.login-btn-google`: a transparent pill with a hairline
 * border and an uppercase Geist Mono label.
 */
export function GoogleSignInButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      fullWidth
      loading={loading}
      icon={<GoogleMark />}
      label={loading ? "Redirecting…" : label}
      onPress={onPress}
      style={authOutline}
      textStyle={authButtonLabel}
    />
  );
}
