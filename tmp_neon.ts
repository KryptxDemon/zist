import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

/**
 * The Neon Auth client (Better Auth React adapter).
 *
 * We do NOT use `createClient` from `@neondatabase/neon-js` here because that
 * factory requires both `auth` and `dataApi` URL configs. Our backend is a
 * separate FastAPI service, so we only need the auth half — `createAuthClient`
 * returns a Better Auth React client that exposes signIn, getSession, etc.
 * directly.
 *
 * The `baseURL` is injected into the adapter by Neon at runtime from the
 * `url` argument, so we just pass the Neon Auth endpoint and the adapter.
 */
export const neonAuth = createAuthClient(
  import.meta.env.VITE_NEON_AUTH_URL,
  {
    adapter: BetterAuthReactAdapter(),
  },
);
