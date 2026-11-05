/**
 * One-shot message handed from the auth layer to whichever screen the user
 * lands on after their session ends.
 *
 * `AuthProvider` has no toaster of its own (it mounts *above* `ToastProvider`,
 * because the toast UI is part of the themed surface), so it drops a note here
 * and the landing page — where a session-less user always ends up — picks it up
 * and shows it. Without this the user is silently dumped on the marketing page
 * and reasonably concludes the app is broken.
 */

let pendingNotice: string | null = null;

export function setSessionNotice(message: string): void {
  pendingNotice = message;
}

/** Returns the pending notice and clears it, so it is shown at most once. */
export function consumeSessionNotice(): string | null {
  const notice = pendingNotice;
  pendingNotice = null;
  return notice;
}
