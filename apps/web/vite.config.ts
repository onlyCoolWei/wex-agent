import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const envDir = path.resolve(import.meta.dirname, "../..");
  const env = loadEnv(mode, envDir, "");

  return {
    envDir,
    plugins: [
      command === "serve" && codeInspectorPlugin({ bundler: "vite" }),
      react(),
      tailwindcss(),
    ],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "",
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:3001",
      },
    },
  };
});
