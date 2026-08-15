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
    if (path === window.location.pathname) return;
    window.history.pushState({}, "", path);
    setPathname(path);
  };

  return { pathname, navigate };
}
