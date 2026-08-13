# Disconnecting Vercel

Vercel is no longer used to host this project. Use this checklist to remove
the Vercel integration and revoke any tokens it was given.

## 1. Remove the Vercel GitHub App

1. Open https://github.com/settings/installations and locate the
   **Vercel** installation entry.
2. Click **Configure** → scroll to **Repository access**.
3. Either:
   - Untick the `zist` repository, or
   - Click **Uninstall** to remove the installation entirely.
4. Confirm by visiting https://github.com/zist/settings/installations — Vercel
   should no longer appear.

## 2. Disconnect projects (if any still exist)

For every Vercel project that points at this repo:

1. Open https://vercel.com/dashboard.
2. Select the project → **Settings** → **Git**.
3. Click **Disconnect** (or **Remove** under **Git Integration**).
4. Optionally delete the project from **Settings** → **General** →
   **Delete Project**.

## 3. Rotate any leaked Vercel tokens

If a `VERCEL_TOKEN`, `VERCEL_ORG_ID`, or `VERCEL_PROJECT_ID` was ever copied
elsewhere (CI config, dashboards, scripts), rotate it now:

1. https://vercel.com/account/tokens → **Revoke** the token.
2. Update any external secret store if it referenced the old value.
3. Confirm with a `git grep -nE "VERCEL_(TOKEN|ORG_ID|PROJECT_ID)"` from the
   repo root — there should be no hits.

## 4. Confirm the repository no longer references Vercel

```sh
git grep -i vercel
```

Expected: no production code references. Documentation in
`docs/VERCEL_DISCONNECT.md` (this file) is the only allowed mention.

## 5. Update DNS / domain pointers

If a custom domain previously pointed at Vercel, repoint it to the Netlify
deployment URL before DNS TTL expires.

---

Once these steps are complete, Vercel is fully detached from the project.
The frontend lives on **Netlify**, the backend on **Render**, and identity
+ database on **Neon**.