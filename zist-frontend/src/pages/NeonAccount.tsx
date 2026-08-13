import { Link } from "react-router-dom";
import {
  AccountSettingsCards,
  AuthLoading,
  SignedIn,
  SignedOut,
} from "@neondatabase/neon-js/auth/react/ui";

import { AppLayout } from "@/components/layout/AppLayout";

/**
 * Neon account settings page.
 *
 * Renders the bundled Neon account settings cards (profile, security,
 * sessions, connected providers). When signed out, prompts the user to
 * authenticate through the Neon entry point at `/neon/auth`.
 */
export default function NeonAccount() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 py-10 animate-fade-in">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/90 font-medium">
            Neon Account
          </p>
          <h1 className="font-display text-3xl text-foreground">
            Manage your Neon account
          </h1>
          <p className="text-muted-foreground">
            Profile, security, and connected providers — managed by Neon Auth.
          </p>
        </header>

        <AuthLoading>
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-muted-foreground">
            Loading account…
          </div>
        </AuthLoading>

        <SignedOut>
          <div className="rounded-2xl border border-border/40 bg-card/70 p-6 text-center">
            <p className="text-muted-foreground">
              You are not signed in to Neon.
            </p>
            <Link
              to="/neon/auth"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in with Neon
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <AccountSettingsCards />

          <div className="flex justify-end gap-3">
            <Link
              to="/dashboard"
              className="rounded-md border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Back to dashboard
            </Link>
            <Link
              to="/neon/auth"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Account status
            </Link>
          </div>
        </SignedIn>
      </div>
    </AppLayout>
  );
}
