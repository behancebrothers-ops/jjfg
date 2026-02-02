import { createRoot } from "react-dom/client";
import { AbilityProvider } from "./contexts/AbilityContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { initSentry } from "./lib/sentry";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";

// Import premium fonts
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/lato/300.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";

import "./index.css";

// Initialize Sentry for error tracking
initSentry();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AuthProvider>
      <AbilityProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </AbilityProvider>
    </AuthProvider>
  </ErrorBoundary>
);
