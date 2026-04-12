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
- Python 3.13+
- Docker Desktop (optional, for containerized run)

### Project Layout

- `zist-frontend/` - React + Vite frontend
- `zist-backend/` - FastAPI backend

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

## Deploy Notes

After splitting frontend and backend into separate folders, deploy each service independently (or use Docker).

- Frontend deployment root: `zist-frontend/`
- Backend deployment root: `zist-backend/`

## Project Structure

```
zist-frontend/
├── src/
├── public/
├── package.json
└── vite.config.ts

zist-backend/
├── app/
├── requirements.txt
└── .env
```

## License

MIT
