import { useEffect } from "react";
import { AuthCallbackPage } from "./pages/auth-callback-page.js";
import { AuthLoading, AuthPage } from "./pages/auth-page.js";
import { useAuth } from "./lib/auth.js";
import { HomePage } from "./pages/home-page.js";
import { ProjectPage } from "./pages/project/project-page.js";
import { WorkspacePage } from "./pages/workspace-page.js";
import { usePathname } from "./routing.js";

export function App() {
  const { pathname, navigate } = usePathname();
  const { user, loading } = useAuth();
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  useEffect(() => {
    if (loading || user || pathname === "/" || isAuthRoute) return;
    const redirect = `${pathname}${window.location.search}`;
    navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
  }, [isAuthRoute, loading, navigate, pathname, user]);

  if (loading) return <AuthLoading />;
  if (pathname === "/auth/callback") return <AuthCallbackPage navigate={navigate} />;
  if (pathname === "/auth") return <AuthPage navigate={navigate} />;
  if (!user && pathname !== "/" && !isAuthRoute) return <AuthLoading />;

  if (pathname === "/workspace") return <WorkspacePage navigate={navigate} />;
  if (pathname.startsWith("/projects/")) {
    const projectId = decodeURIComponent(pathname.slice("/projects/".length).split("/")[0] ?? "");
    return <ProjectPage navigate={navigate} projectId={projectId} />;
  }
  return <HomePage navigate={navigate} />;
}
