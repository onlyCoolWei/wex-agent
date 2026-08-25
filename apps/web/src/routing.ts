import { useEffect, useState } from "react";

export type Navigate = (path: string) => void;

export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate: Navigate = (path) => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (path === currentPath) return;
    window.history.pushState({}, "", path);
    setPathname(new URL(path, window.location.origin).pathname);
  };

  return { pathname, navigate };
}
