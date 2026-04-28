import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname, "./html"),
  publicDir: path.resolve(__dirname, "./public"),
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Allow serving files from the project root when root is ./html.
      allow: [path.resolve(__dirname)],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "./dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "./html/index.html"),
        login: path.resolve(__dirname, "./html/pages/login.html"),
        signup: path.resolve(__dirname, "./html/pages/signup.html"),
        app: path.resolve(__dirname, "./html/pages/app.html"),
        library: path.resolve(__dirname, "./html/pages/library.html"),
        vocabulary: path.resolve(__dirname, "./html/pages/vocabulary.html"),
        insights: path.resolve(__dirname, "./html/pages/insights.html"),
        quiz: path.resolve(__dirname, "./html/pages/quiz.html"),
        profile: path.resolve(__dirname, "./html/pages/profile.html"),
      },
    },
  },
  resolve: {
    alias: {
      "/src": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src/others"),
      "@css": path.resolve(__dirname, "./src/css"),
    },
  },
}));
