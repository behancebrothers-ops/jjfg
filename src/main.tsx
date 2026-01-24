import { createRoot } from "react-dom/client";
import { AbilityProvider } from "./contexts/AbilityContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { initSentry } from "./lib/sentry";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
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
