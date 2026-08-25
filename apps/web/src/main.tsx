import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { AuthProvider } from "./lib/auth.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
