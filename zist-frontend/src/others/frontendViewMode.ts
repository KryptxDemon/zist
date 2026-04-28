export type FrontendViewMode = "html-only" | "html-css-only" | "all";

// Change this single value to switch what the frontend renders.
// 1) "html-only"     -> Static HTML output only. React is not loaded.
// 2) "html-css-only" -> Full React app logic with CSS loaded.
// 3) "all"           -> Same as html-css-only (full app + CSS).
export const FRONTEND_VIEW_MODE: FrontendViewMode = "all";
