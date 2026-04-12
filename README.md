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
