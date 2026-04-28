import { FRONTEND_VIEW_MODE } from "./frontendViewMode";
import { ApiError, apiClient } from "./services/apiClient";
import { authService } from "./services/authService";

type HtmlPageKey =
  | "landing"
  | "login"
  | "signup"
  | "app"
  | "library"
  | "vocabulary"
  | "insights"
  | "quiz"
  | "profile";

type HtmlPageContent = { title: string; body: string };

const PUBLIC_HTML_PAGES: Record<
  "landing" | "login" | "signup",
  HtmlPageContent
> = {
  landing: {
    title: "ZIST - Landing",
    body: `
      <header>
        <h1>ZIST</h1>
        <p>Your learning compass for capturing and revisiting what matters.</p>
      </header>
      <nav aria-label="Primary">
        <a href="/index.html">Home</a> |
        <a href="/pages/login.html">Login</a> |
        <a href="/pages/signup.html">Signup</a> |
        <a href="/pages/app.html">Dashboard</a>
      </nav>
      <main>
        <section>
          <h2>Why ZIST</h2>
          <ul>
            <li>Capture ideas from books, videos, podcasts, and articles.</li>
            <li>Organize notes into themes, quotes, and vocabulary.</li>
            <li>Turn what you save into quick quiz sessions.</li>
          </ul>
        </section>
      </main>
    `,
  },
  login: {
    title: "ZIST - Login",
    body: `
      <header>
        <h1>Login</h1>
        <p>Welcome back. Sign in to continue your learning journey.</p>
      </header>
      <main>
        <form id="html-login-form">
          <p>
            <label for="email">Email</label><br />
            <input id="email" type="email" name="email" autocomplete="email" required />
          </p>
          <p>
            <label for="password">Password</label><br />
            <input id="password" type="password" name="password" autocomplete="current-password" required />
          </p>
          <p>
            <label>
              <input type="checkbox" name="remember" /> Remember me
            </label>
          </p>
          <button id="html-login-submit" type="submit">Sign In</button>
          <p id="html-login-message" aria-live="polite"></p>
        </form>
        <p>No account yet? <a href="/pages/signup.html">Create one</a></p>
      </main>
    `,
  },
  signup: {
    title: "ZIST - Signup",
    body: `
      <header>
        <h1>Create Account</h1>
        <p>Build your personal system for learning and retention.</p>
      </header>
      <main>
        <form id="html-signup-form">
          <p>
            <label for="name">Display Name</label><br />
            <input id="name" type="text" name="name" required />
          </p>
          <p>
            <label for="signup-email">Email</label><br />
            <input id="signup-email" type="email" name="email" autocomplete="email" required />
          </p>
          <p>
            <label for="signup-password">Password</label><br />
            <input id="signup-password" type="password" name="password" autocomplete="new-password" required />
          </p>
          <button id="html-signup-submit" type="submit">Create Account</button>
          <p id="html-signup-message" aria-live="polite"></p>
        </form>
        <p>Already registered? <a href="/pages/login.html">Login</a></p>
      </main>
    `,
  },
};

const PROTECTED_PAGES = new Set<HtmlPageKey>([
  "app",
  "library",
  "vocabulary",
  "insights",
  "quiz",
  "profile",
]);

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appNav(): string {
  return `
    <nav aria-label="App">
      <a href="/pages/app.html">Dashboard</a> |
      <a href="/pages/library.html">Library</a> |
      <a href="/pages/vocabulary.html">Vocabulary</a> |
      <a href="/pages/insights.html">Insights</a> |
      <a href="/pages/quiz.html">Quiz</a> |
      <a href="/pages/profile.html">Profile</a>
    </nav>
  `;
}

function toHumanDate(value: string | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

async function buildDashboardPage(): Promise<HtmlPageContent> {
  const data = await apiClient.get<any>("/insights/dashboard");
  const topThemes = Array.isArray(data?.top_themes) ? data.top_themes : [];
  const recentActivity = Array.isArray(data?.recent_activity)
    ? data.recent_activity
    : [];
  const recentMedia = Array.isArray(data?.recent_media)
    ? data.recent_media
    : [];

  return {
    title: "ZIST - Dashboard",
    body: `
      <header>
        <h1>Dashboard</h1>
        <p>Overview of your current learning activity.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <h2>Snapshot</h2>
          <ul>
            <li>Media tracked: ${escapeHtml(data?.total_media ?? 0)}</li>
            <li>Vocabulary saved: ${escapeHtml(data?.total_vocab ?? 0)}</li>
            <li>Themes captured: ${escapeHtml(data?.total_themes ?? 0)}</li>
            <li>Quotes captured: ${escapeHtml(data?.total_quotes ?? 0)}</li>
            <li>Quiz sessions: ${escapeHtml(data?.total_quizzes ?? 0)}</li>
          </ul>
        </section>
        <section>
          <h2>Top Themes</h2>
          <ul>
            ${
              topThemes.length
                ? topThemes
                    .map(
                      (t: any) =>
                        `<li>${escapeHtml(t?.title)} (${escapeHtml(t?.count)})</li>`,
                    )
                    .join("")
                : "<li>No themes yet.</li>"
            }
          </ul>
        </section>
        <section>
          <h2>Recent Media</h2>
          <ul>
            ${
              recentMedia.length
                ? recentMedia
                    .map(
                      (m: any) =>
                        `<li>${escapeHtml(m?.title)} (${escapeHtml(m?.type)})</li>`,
                    )
                    .join("")
                : "<li>No media yet.</li>"
            }
          </ul>
        </section>
        <section>
          <h2>Recent Activity</h2>
          <ol>
            ${
              recentActivity.length
                ? recentActivity
                    .map(
                      (a: any) =>
                        `<li>${escapeHtml(a?.type)}: ${escapeHtml(a?.title)} (${escapeHtml(toHumanDate(a?.timestamp))})</li>`,
                    )
                    .join("")
                : "<li>No recent activity.</li>"
            }
          </ol>
        </section>
      </main>
    `,
  };
}

async function buildLibraryPage(): Promise<HtmlPageContent> {
  const response = await apiClient.get<any>("/media", {
    params: { page: 1, limit: 50 },
  });
  const items = Array.isArray(response?.items) ? response.items : [];

  return {
    title: "ZIST - Library",
    body: `
      <header>
        <h1>Library</h1>
        <p>All your saved media with attached learning artifacts.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <h2>Collection</h2>
          <p>Total items: ${escapeHtml(response?.total ?? 0)}</p>
          ${
            items.length
              ? `<table>
                  <thead>
                    <tr><th>Title</th><th>Type</th><th>Status</th><th>Creator</th><th>Year</th></tr>
                  </thead>
                  <tbody>
                    ${items
                      .map(
                        (m: any) =>
                          `<tr>
                            <td>${escapeHtml(m?.title)}</td>
                            <td>${escapeHtml(m?.type)}</td>
                            <td>${escapeHtml(m?.status)}</td>
                            <td>${escapeHtml(m?.creator)}</td>
                            <td>${escapeHtml(m?.year ?? "-")}</td>
                          </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>`
              : "<p>No media found.</p>"
          }
        </section>
      </main>
    `,
  };
}

async function buildVocabularyPage(): Promise<HtmlPageContent> {
  const response = await apiClient.get<any>("/vocabulary", {
    params: { page: 1, limit: 100 },
  });
  const items = Array.isArray(response?.items) ? response.items : [];
  const learnedCount = items.filter((item: any) => item?.is_learned).length;

  return {
    title: "ZIST - Vocabulary",
    body: `
      <header>
        <h1>Vocabulary</h1>
        <p>Words and phrases captured from your reading and listening.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <p>Total words: ${escapeHtml(response?.total ?? 0)}</p>
          <p>Learned: ${escapeHtml(learnedCount)} | Need review: ${escapeHtml(items.length - learnedCount)}</p>
          ${
            items.length
              ? `<table>
                  <thead>
                    <tr><th>Word</th><th>Meaning</th><th>Where Found</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${items
                      .map(
                        (v: any) =>
                          `<tr>
                            <td>${escapeHtml(v?.word)}</td>
                            <td>${escapeHtml(v?.definition ?? "-")}</td>
                            <td>${escapeHtml(v?.where_found ?? "-")}</td>
                            <td>${escapeHtml(v?.is_learned ? "Learned" : "Learning")}</td>
                          </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>`
              : "<p>No vocabulary found.</p>"
          }
        </section>
      </main>
    `,
  };
}

async function buildInsightsPage(): Promise<HtmlPageContent> {
  const [dashboard, profileSummary] = await Promise.all([
    apiClient.get<any>("/insights/dashboard"),
    apiClient.get<any>("/insights/profile-summary"),
  ]);
  const topThemes = Array.isArray(dashboard?.top_themes)
    ? dashboard.top_themes
    : [];
  const mediaDistribution = Array.isArray(
    profileSummary?.media_distribution_by_type,
  )
    ? profileSummary.media_distribution_by_type
    : [];
  const statuses = Array.isArray(profileSummary?.most_common_statuses)
    ? profileSummary.most_common_statuses
    : [];

  return {
    title: "ZIST - Insights",
    body: `
      <header>
        <h1>Insights</h1>
        <p>Learning analytics from your real backend data.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <h2>Top Themes</h2>
          <ul>
            ${
              topThemes.length
                ? topThemes
                    .map(
                      (t: any) =>
                        `<li>${escapeHtml(t?.title)} (${escapeHtml(t?.count)})</li>`,
                    )
                    .join("")
                : "<li>No theme data available.</li>"
            }
          </ul>
        </section>
        <section>
          <h2>Media Distribution</h2>
          <ul>
            ${
              mediaDistribution.length
                ? mediaDistribution
                    .map(
                      (m: any) =>
                        `<li>${escapeHtml(m?.type)}: ${escapeHtml(m?.count)}</li>`,
                    )
                    .join("")
                : "<li>No media distribution available.</li>"
            }
          </ul>
        </section>
        <section>
          <h2>Status Breakdown</h2>
          <ul>
            ${
              statuses.length
                ? statuses
                    .map(
                      (s: any) =>
                        `<li>${escapeHtml(s?.status)}: ${escapeHtml(s?.count)}</li>`,
                    )
                    .join("")
                : "<li>No status data available.</li>"
            }
          </ul>
        </section>
      </main>
    `,
  };
}

async function buildQuizPage(): Promise<HtmlPageContent> {
  const [stats, history] = await Promise.all([
    apiClient.get<any>("/quiz/stats"),
    apiClient.get<any>("/quiz/history", { params: { page: 1, limit: 20 } }),
  ]);
  const items = Array.isArray(history?.items) ? history.items : [];

  return {
    title: "ZIST - Quiz",
    body: `
      <header>
        <h1>Quiz Hub</h1>
        <p>Recent performance and history.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <h2>Performance Summary</h2>
          <ul>
            <li>Total quizzes: ${escapeHtml(stats?.total_quizzes ?? 0)}</li>
            <li>Average accuracy: ${escapeHtml(stats?.average_accuracy ?? 0)}%</li>
            <li>Weakest quiz type: ${escapeHtml(stats?.weakest_quiz_type ?? "-")}</li>
          </ul>
        </section>
        <section>
          <h2>Recent Attempts</h2>
          ${
            items.length
              ? `<table>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Score</th><th>Accuracy</th></tr>
                  </thead>
                  <tbody>
                    ${items
                      .map(
                        (i: any) =>
                          `<tr>
                            <td>${escapeHtml(toHumanDate(i?.created_at))}</td>
                            <td>${escapeHtml(i?.quiz_type)}</td>
                            <td>${escapeHtml(i?.score)}/${escapeHtml(i?.total_questions)}</td>
                            <td>${escapeHtml(i?.accuracy)}%</td>
                          </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>`
              : "<p>No quiz attempts yet.</p>"
          }
        </section>
      </main>
    `,
  };
}

async function buildProfilePage(): Promise<HtmlPageContent> {
  const [me, profileSummary] = await Promise.all([
    apiClient.get<any>("/auth/me"),
    apiClient.get<any>("/insights/profile-summary"),
  ]);
  const quizSummary = profileSummary?.quiz_performance_summary ?? {};

  return {
    title: "ZIST - Profile",
    body: `
      <header>
        <h1>Profile</h1>
        <p>Account and learning preferences.</p>
      </header>
      ${appNav()}
      <main>
        <section>
          <h2>Account</h2>
          <p>Name: ${escapeHtml(me?.display_name)}</p>
          <p>Email: ${escapeHtml(me?.email)}</p>
          <p>Bio: ${escapeHtml(me?.bio ?? "-")}</p>
        </section>
        <section>
          <h2>Network</h2>
          <p>Followers: ${escapeHtml(profileSummary?.followers_count ?? 0)}</p>
          <p>Following: ${escapeHtml(profileSummary?.following_count ?? 0)}</p>
        </section>
        <section>
          <h2>Quiz Performance</h2>
          <p>Total attempts: ${escapeHtml(quizSummary?.total_attempts ?? 0)}</p>
          <p>Average accuracy: ${escapeHtml(quizSummary?.average_accuracy ?? 0)}%</p>
        </section>
      </main>
    `,
  };
}

async function buildProtectedPage(page: HtmlPageKey): Promise<HtmlPageContent> {
  if (page === "app") return buildDashboardPage();
  if (page === "library") return buildLibraryPage();
  if (page === "vocabulary") return buildVocabularyPage();
  if (page === "insights") return buildInsightsPage();
  if (page === "quiz") return buildQuizPage();
  return buildProfilePage();
}

function resolveHtmlPage(pathname: string): HtmlPageKey {
  if (pathname.includes("login")) return "login";
  if (pathname.includes("signup")) return "signup";
  if (pathname.includes("app")) return "app";
  if (pathname.includes("library")) return "library";
  if (pathname.includes("vocabulary")) return "vocabulary";
  if (pathname.includes("insights")) return "insights";
  if (pathname.includes("quiz")) return "quiz";
  if (pathname.includes("profile")) return "profile";
  return "landing";
}

function isAuthenticatedForHtmlMode(): boolean {
  const token =
    localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const user = localStorage.getItem("user") || sessionStorage.getItem("user");
  return Boolean(token && user);
}

function isProtectedHtmlPage(page: HtmlPageKey): boolean {
  return PROTECTED_PAGES.has(page);
}

function getHtmlLoginPath(pathname: string): string {
  return pathname.startsWith("/pages/") ? "/pages/login.html" : "/login.html";
}

function getHtmlAppPath(pathname: string): string {
  return pathname.startsWith("/pages/") ? "/pages/app.html" : "/app.html";
}

function wireHtmlAuthForms(page: HtmlPageKey): void {
  if (page === "login") {
    const form = document.getElementById(
      "html-login-form",
    ) as HTMLFormElement | null;
    if (!form) return;
    const message = document.getElementById("html-login-message");
    const submit = document.getElementById(
      "html-login-submit",
    ) as HTMLButtonElement | null;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");
      const remember = Boolean(formData.get("remember"));

      if (submit) submit.disabled = true;
      if (message) message.textContent = "Signing in...";

      try {
        await authService.login(email, password, remember);
        window.location.replace(getHtmlAppPath(window.location.pathname));
      } catch (error) {
        if (message) {
          message.textContent =
            error instanceof Error ? error.message : "Login failed";
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
    return;
  }

  if (page === "signup") {
    const form = document.getElementById(
      "html-signup-form",
    ) as HTMLFormElement | null;
    if (!form) return;
    const message = document.getElementById("html-signup-message");
    const submit = document.getElementById(
      "html-signup-submit",
    ) as HTMLButtonElement | null;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      if (submit) submit.disabled = true;
      if (message) message.textContent = "Creating account...";

      try {
        await authService.signup(email, password, name);
        window.location.replace(getHtmlAppPath(window.location.pathname));
      } catch (error) {
        if (message) {
          message.textContent =
            error instanceof Error ? error.message : "Signup failed";
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }
}

async function renderHtmlOnlyPage(): Promise<void> {
  const pageKey = resolveHtmlPage(window.location.pathname);
  if (isProtectedHtmlPage(pageKey) && !isAuthenticatedForHtmlMode()) {
    window.location.replace(getHtmlLoginPath(window.location.pathname));
    return;
  }

  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `<main><p>Loading...</p></main>`;

  try {
    const page =
      pageKey === "landing" || pageKey === "login" || pageKey === "signup"
        ? PUBLIC_HTML_PAGES[pageKey]
        : await buildProtectedPage(pageKey);

    document.title = page.title;
    root.innerHTML = `<main>${page.body}</main>`;
    wireHtmlAuthForms(pageKey);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      window.location.replace(getHtmlLoginPath(window.location.pathname));
      return;
    }

    const message =
      error instanceof Error ? error.message : "Failed to load page data.";
    root.innerHTML = `
      <main>
        <header><h1>Unable to Load Data</h1></header>
        <p>${escapeHtml(message)}</p>
        <p><a href="${escapeHtml(window.location.pathname)}">Retry</a></p>
      </main>
    `;
  }
}

async function bootstrap() {
  if (FRONTEND_VIEW_MODE === "html-only") {
    await renderHtmlOnlyPage();
    return;
  }

  await import("@css/index.css");

  const [{ createRoot }, { default: App }] = await Promise.all([
    import("react-dom/client"),
    import("./App.tsx"),
  ]);

  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}

void bootstrap();
