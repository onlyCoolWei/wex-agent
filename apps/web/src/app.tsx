import { HomePage } from "./pages/home-page.js";
import { ProjectPage } from "./pages/project/project-page.js";
import { WorkspacePage } from "./pages/workspace-page.js";
import { usePathname } from "./routing.js";

export function App() {
  const { pathname, navigate } = usePathname();

  if (pathname === "/workspace") return <WorkspacePage navigate={navigate} />;
  if (pathname.startsWith("/projects/")) {
    const projectId = decodeURIComponent(pathname.slice("/projects/".length).split("/")[0] ?? "");
    return <ProjectPage navigate={navigate} projectId={projectId} />;
  }
  return <HomePage navigate={navigate} />;
}
