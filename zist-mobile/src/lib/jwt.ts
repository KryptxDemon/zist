/**
 * Reads the `exp` claim out of a backend access token.
 *
 * The backend signs **60-minute** access tokens (`ACCESS_TOKEN_EXPIRE_MINUTES`)
 * and exposes no `/auth/refresh` endpoint, so an expired token is not
 * recoverable — the only way back is to sign in again. Detecting that locally
 * lets the app say "your session ended, please sign in" *before* it starts
 * firing requests the server will reject with `401`, which is what used to
 * surface as a screen full of "Not authenticated" errors.
 *
 * React Native has no `atob`, and only the payload is needed, so base64url is
 * decoded by hand.
 *
 * A token we cannot parse is reported as *unknown*, never as expired: the
 * server stays the authority on what it accepts.
 */

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlToUtf8(segment: string): string | null {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const value = BASE64_ALPHABET.indexOf(normalized[i]);
    if (value === -1) continue; // padding / stray characters
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  if (bytes.length === 0) return null;

  // Minimal UTF-8 → UTF-16 decode. JWT payloads are JSON; the only non-ASCII
  // we can realistically meet is a name or an email address.
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    if (byte < 0x80) {
      out += String.fromCharCode(byte);
      i += 1;
    } else if (byte >= 0xc0 && byte < 0xe0) {
      out += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (byte >= 0xe0 && byte < 0xf0) {
      out += String.fromCharCode(
        ((byte & 0x0f) << 12) |
          ((bytes[i + 1] & 0x3f) << 6) |
          (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else {
      const codePoint =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const adjusted = codePoint - 0x10000;
      out += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
      i += 4;
    }
  }
  return out;
}

/** Expiry of a JWT in epoch milliseconds, or `null` when it cannot be read. */
export function getTokenExpiryMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  const json = base64UrlToUtf8(payload);
  if (!json) return null;

  try {
    const claims = JSON.parse(json) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Whether a token carries an `exp` that has already passed.
 *
 * `skewMs` absorbs small clock differences between the phone and the server so
 * a token that is about to expire within the next few seconds counts as dead.
 * Tokens with no readable `exp` are never reported as expired.
 */
export function isTokenExpired(token: string, skewMs = 30_000): boolean {
  const expiry = getTokenExpiryMs(token);
  if (expiry == null) return false;
  return expiry <= Date.now() + skewMs;
}
