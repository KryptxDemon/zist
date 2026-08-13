# ZIST - Your Learning Compass

A personal learning management application to organize, track, and enhance your educational journey.

## Features

- 📚 **Media Library** - Organize your learning resources (books, videos, podcasts, articles)
- 📊 **Dashboard** - Track your learning progress at a glance
- 🧠 **Quiz Hub** - Test your knowledge with interactive quizzes
- 📰 **Feed** - Stay updated with your learning activities
- 👤 **User Profiles** - Personalize your learning experience
- 🔐 **Neon Auth (passwordless)** - Magic-link sign-in via Neon Auth, with email/password and Google sign-in as alternatives
- 🔑 **JWKS-verified JWTs** - Backend verifies RS256 tokens from Neon against the JWKS endpoint, with HS256 app-secret fallback

## Technologies Used

- **Vite** - Next-generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **React** - UI component library
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **FastAPI** - Python backend framework
- **SQLAlchemy** - ORM for the data layer
- **Neon Auth** - Identity provider (Auth.js / NextAuth under the hood)
- **Neon Serverless Postgres** - Managed database
- **JWT / JWKS** - Token verification (RS256 via JWKS, HS256 via app secret)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.13+
- Docker Desktop (optional, for containerized run)
- A Neon project (for the database and Neon Auth)

### Project Layout

- `zist-frontend/` - React + Vite frontend
- `zist-backend/` - FastAPI backend

### Configure Backend

Copy `zist-backend/.env.example` to `zist-backend/.env` and fill in:

- `DATABASE_URL` - Neon serverless Postgres connection string
- `SECRET_KEY` - App secret used for HS256 token verification
- `JWKS_URL` - Neon Auth JWKS endpoint (e.g. `https://your-neon-project.neonauth.com/.well-known/jwks.json`)
- `GROQ_API_KEY`, `TMDB_API_KEY`, etc. - Optional third-party service keys

When `JWKS_URL` is unset, the backend falls back to pure HS256 (app-secret)
verification. When it is set, RS256 tokens from Neon are accepted alongside
HS256 tokens, with a 5-minute TTL cache and force-refresh on unknown `kid`.

### Run Locally (without Docker)

Frontend:

```sh
cd zist-frontend
npm install
npm run dev
```

Backend:

```sh
cd zist-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend app runs on `http://localhost:8080` and backend on `http://localhost:8000`.

### Run Backend Tests

```sh
cd zist-backend
.\.venv\Scripts\python.exe -m pytest tests/test_auth_jwks.py -v
```

Expected: 7/7 tests pass.

## Neon Auth

The frontend uses `@neondatabase/neon-js` to render passwordless authentication
flows. Two entry points are wired in:

- `/neon/auth` — sign-in / sign-up entry point with magic-link callbacks
- `/neon/account` — account settings (profile, sessions, sign-out)

`VITE_NEON_AUTH_URL` in `zist-frontend/.env` controls the Neon Auth URL. The
backend independently verifies tokens by fetching the JWKS at `JWKS_URL`, so
the frontend never has to share the signing secret.

To disable Neon Auth, simply leave `VITE_NEON_AUTH_URL` blank — the existing
email/password and Google sign-in flows continue to work.

## Docker

Run frontend and backend together from repository root:

```sh
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`

Notes:

- Backend reads environment variables from `zist-backend/.env`.
- Frontend container is built from `zist-frontend/Dockerfile`.

## Deployment

This project is deployed across three providers:

- **Netlify** — frontend hosting (`zist-frontend/`)
- **Render** — backend hosting (`zist-backend/`)
- **Neon** — database and identity (Auth + Postgres)

Vercel is **disconnected** from this project. A teardown checklist for
removing the Vercel GitHub App, disconnecting projects, and rotating any
leftover tokens lives in [`docs/VERCEL_DISCONNECT.md`](docs/VERCEL_DISCONNECT.md).

### Frontend (Netlify)

- Build root: `zist-frontend/`
- Build command: `npm run build`
- Publish directory: `zist-frontend/dist`
- Config: `zist-frontend/netlify.toml`
- Required env vars: `VITE_API_URL`, `VITE_NEON_AUTH_URL`

### Backend (Render)

- Root: `zist-backend/`
- Dockerfile: `zist-backend/Dockerfile`
- Manifest: `zist-backend/render.yaml`
- Required env vars: `DATABASE_URL`, `SECRET_KEY`, `JWKS_URL`

### Database / Identity (Neon)

- Provision a Neon project.
- Copy the serverless Postgres connection string into `DATABASE_URL`.
- Provision Neon Auth on the same project; copy the JWKS URL into `JWKS_URL`
  and the auth URL into `VITE_NEON_AUTH_URL`.

## Project Structure

```
zist-frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── NeonAuth.tsx       # Neon passwordless entry point
│   │   └── NeonAccount.tsx    # Neon account settings
│   ├── contexts/
│   └── services/
├── public/
├── package.json
└── vite.config.ts

zist-backend/
├── app/
│   ├── core/
│   │   ├── deps.py            # JWT verification (HS256 + JWKS)
│   │   └── config.py          # JWKS_URL setting
│   ├── models/
│   ├── schemas/
│   └── services/
├── tests/
│   └── test_auth_jwks.py      # 7 tests for JWKS verification
├── requirements.txt
└── .env.example
```

## License

MIT
