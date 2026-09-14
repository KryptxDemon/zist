import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Google OAuth via a popup window.
 *
 * Flow:
 *  1. Ask the backend for a signed /authorize URL (GET /auth/google/start).
 *  2. Open it in a popup. The user consents on accounts.google.com.
 *  3. Google redirects the popup to our BACKEND callback, which exchanges the
 *     code, upserts the Zist user, mints our own HS256 tokens, and renders a
 *     tiny HTML page that postMessages the payload back to this window.
 *  4. We persist the session and the caller navigates.
 *
 * Why a popup and not a full-page redirect: the popup keeps the SPA mounted,
 * so there is no bootstrap race on return — the token arrives directly in the
 * already-running app rather than needing to be re-read from a URL param.
 */

const MESSAGE_TYPE = "zist-google-auth";
const ERROR_MESSAGE_TYPE = "zist-google-auth-error";

interface UseGoogleAuthOptions {
  /** Called after the session is persisted. Use it to navigate. */
  onSuccess: () => void;
  /** Called with a human-readable message on any failure. */
  onError: (message: string) => void;
}

/**
 * Origins we will accept a postMessage from. The popup document is served by
 * the BACKEND (the callback route renders the HTML), so the message origin is
 * the backend origin — not the frontend's. When VITE_API_URL is a relative
 * proxy path, getBackendOrigin() returns the frontend origin, so we allow both.
 */
function getAllowedOrigins(): string[] {
  const allowed = new Set<string>();
  const explicit = import.meta.env.VITE_BACKEND_ORIGIN as string | undefined;
  if (explicit?.trim()) {
    allowed.add(explicit.trim().replace(/\/+$/, ""));
  }
  allowed.add(authService.getBackendOrigin().replace(/\/+$/, ""));
  allowed.add(window.location.origin.replace(/\/+$/, ""));
  return Array.from(allowed);
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const { completeGoogleAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    popupRef.current = null;
  }, []);

  // Tear down the poller if the component unmounts mid-flight.
  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    const allowedOrigins = getAllowedOrigins();

    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin.replace(/\/+$/, "");
      if (!allowedOrigins.includes(origin)) return;

      const data = event.data as
        | { type?: string; payload?: unknown }
        | undefined;
      if (!data?.type) return;

      if (data.type === ERROR_MESSAGE_TYPE) {
        settledRef.current = true;
        cleanup();
        setIsLoading(false);
        const payload = data.payload as { error?: string } | undefined;
        onError(payload?.error || "Google sign-in failed.");
        return;
      }

      if (data.type !== MESSAGE_TYPE) return;

      settledRef.current = true;
      cleanup();
      try {
        await completeGoogleAuth(
          data.payload as Parameters<typeof completeGoogleAuth>[0],
        );
        setIsLoading(false);
        onSuccess();
      } catch (err) {
        setIsLoading(false);
        onError(
          err instanceof Error ? err.message : "Could not finish signing in.",
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [completeGoogleAuth, cleanup, onSuccess, onError]);

  const signInWithGoogle = useCallback(
    async (source: "login" | "signup") => {
      if (isLoading) return;
      setIsLoading(true);
      settledRef.current = false;

      // Open the popup synchronously, before any await. Browsers only treat a
      // window.open as user-initiated inside the click handler's own task;
      // opening it after an awaited fetch trips the popup blocker.
      const width = 500;
      const height = 640;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        "about:blank",
        "zist-google-auth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!popup) {
        setIsLoading(false);
        onError(
          "Your browser blocked the sign-in window. Allow popups for this site and try again.",
        );
        return;
      }

      popupRef.current = popup;

      try {
        const authUrl = await authService.startGoogleAuth(source);
        popup.location.href = authUrl;
      } catch (err) {
        popup.close();
        cleanup();
        setIsLoading(false);
        onError(
          err instanceof Error
            ? err.message
            : "Could not start Google sign-in.",
        );
        return;
      }

      // If the user closes the popup manually we never get a message, so poll
      // for it and reset the button rather than leaving a stuck spinner.
      pollRef.current = window.setInterval(() => {
        if (popupRef.current?.closed) {
          cleanup();
          if (!settledRef.current) {
            setIsLoading(false);
            onError("Sign-in was cancelled.");
          }
        }
      }, 500);
    },
    [isLoading, cleanup, onError],
  );

  return { signInWithGoogle, isGoogleLoading: isLoading };
}
