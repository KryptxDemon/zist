import { Link } from "react-router-dom";
import {
  AuthLoading,
  RedirectToSignIn,
  RedirectToSignUp,
  SignedIn,
  SignedOut,
  UserButton,
} from "@neondatabase/neon-js/auth/react/ui";

import { AppLayout } from "@/components/layout/AppLayout";

/**
 * Neon Auth entry point.
 *
 * Mounts the Neon-hosted sign-in / sign-up UI for users who prefer the
 * passwordless / passkey flow. Once authenticated, the user is redirected
 * through the standard AuthContext flow that calls `/api/v1/auth/google/callback`
 * or the equivalent Neon callback on the backend.
 */
export default function NeonAuth() {
  const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL ?? "";

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl space-y-6 py-10 animate-fade-in">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/90 font-medium">
            Neon Auth
          </p>
          <h1 className="font-display text-3xl text-foreground">
            Sign in with Neon
          </h1>
          <p className="text-muted-foreground">
            Passwordless authentication backed by Neon Auth. Tokens are
            verified on the backend via JWKS.
          </p>
        </header>

        <AuthLoading>
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-center text-muted-foreground">
            Loading auth state…
          </div>
        </AuthLoading>

        <SignedOut>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-card/70 p-6">
              <h2 className="font-display text-xl text-foreground">Sign in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Continue with an existing Neon account.
              </p>
              <div className="mt-4">
                <RedirectToSignIn />
              </div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/70 p-6">
              <h2 className="font-display text-xl text-foreground">Create account</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                New here? Get started with a passwordless account.
              </p>
              <div className="mt-4">
                <RedirectToSignUp />
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Or{" "}
            <Link to="/login" className="underline">
              use email and password
            </Link>
            .
          </p>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-card/70 p-6">
            <p className="text-sm text-muted-foreground">Signed in</p>
            <UserButton />
            <div className="flex gap-3">
              <Link
                to="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Go to dashboard
              </Link>
              <Link
                to="/neon/account"
                className="rounded-md border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Manage Neon account
              </Link>
            </div>
          </div>
        </SignedIn>

        <footer className="text-center text-xs text-muted-foreground">
          Neon Auth URL: <code>{neonAuthUrl || "(not configured)"}</code>
        </footer>
      </div>
    </AppLayout>
  );
}
