import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import AddMedia from "./pages/AddMedia";
import MediaDetail from "./pages/MediaDetail";
import QuizHub from "./pages/QuizHub";
import QuizSession from "./pages/QuizSession";
import Vocabulary from "./pages/Vocabulary";
import Insights from "./pages/Insights";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/index.html" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login.html" element={<Login />} />
              <Route path="/pages/login.html" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/signup.html" element={<Signup />} />
              <Route path="/pages/signup.html" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app.html"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/app.html"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/library"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library.html"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/library.html"
                element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/media/new"
                element={
                  <ProtectedRoute>
                    <AddMedia />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/media/:id"
                element={
                  <ProtectedRoute>
                    <MediaDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/quiz"
                element={
                  <ProtectedRoute>
                    <QuizHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz.html"
                element={
                  <ProtectedRoute>
                    <QuizHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/quiz.html"
                element={
                  <ProtectedRoute>
                    <QuizHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/quiz/:mediaId"
                element={
                  <ProtectedRoute>
                    <QuizSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/insights"
                element={
                  <ProtectedRoute>
                    <Insights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/insights.html"
                element={
                  <ProtectedRoute>
                    <Insights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/insights.html"
                element={
                  <ProtectedRoute>
                    <Insights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/vocabulary"
                element={
                  <ProtectedRoute>
                    <Vocabulary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vocabulary.html"
                element={
                  <ProtectedRoute>
                    <Vocabulary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/vocabulary.html"
                element={
                  <ProtectedRoute>
                    <Vocabulary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile.html"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pages/profile.html"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/user/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
