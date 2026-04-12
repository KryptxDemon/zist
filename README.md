# ZIST - Your Learning Compass

A personal learning management application to organize, track, and enhance your educational journey.

## Features

- 📚 **Media Library** - Organize your learning resources (books, videos, podcasts, articles)
- 📊 **Dashboard** - Track your learning progress at a glance
- 🧠 **Quiz Hub** - Test your knowledge with interactive quizzes
- 📰 **Feed** - Stay updated with your learning activities
- 👤 **User Profiles** - Personalize your learning experience

## Technologies Used

- **Vite** - Next-generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **React** - UI component library
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd zist-your-learning-compass

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Docker

Run frontend and backend together:

```sh
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000`

Notes:

- Backend reads environment variables from `backend/.env`.
- Keep secrets in `backend/.env` only (they are not copied into the frontend image).

## Deploy To Vercel (Frontend + Backend Together)

This repo is configured to deploy both the React frontend and FastAPI backend in one Vercel project:

- Frontend is served as static build output (`dist`).
- Backend is served as a Vercel Python Function via `api/index.py`.
- API calls use `/api/v1/...` and are routed to FastAPI.

### 1. Import project in Vercel

- Import this repository in Vercel.
- Framework can stay on auto-detect (build is driven by `vercel.json`).

### 2. Configure Environment Variables (Project Settings -> Environment Variables)

Set at minimum:

- `DATABASE_URL` (your Neon/PostgreSQL URL)
- `SECRET_KEY`
- `ALGORITHM` (e.g. `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `BACKEND_CORS_ORIGINS` (include your Vercel domain)

Optional API integrations:

- `TMDB_API_KEY`
- `TMDB_BASE_URL`
- `OPENLIBRARY_BASE_URL`
- `WIKIPEDIA_API_BASE`
- `DICTIONARY_API_BASE`

### 3. Deploy

Push to your default branch, or click **Deploy** from Vercel dashboard.

### 4. Verify

- Frontend loads from your Vercel URL.
- API health endpoint works: `https://<your-vercel-domain>/api/health`

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── pages/          # Application pages
├── services/       # API and data services
└── types/          # TypeScript type definitions
```

## License

MIT
