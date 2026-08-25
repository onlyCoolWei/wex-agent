import { ChevronRight, CircleUserRound, LogOut, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth.js";
import type { Navigate } from "../routing.js";

function Brand() {
  return (
    <span className="flex items-center gap-[9px] font-display text-[17px] font-semibold text-ink">
      <span
        className="grid size-[27px] place-items-center bg-ink text-[15px] text-[#f9faf6]"
        aria-hidden="true"
      >
        W
      </span>
      <span>Wex</span>
    </span>
  );
}

export function AppHeader({ page, navigate }: { page?: string; navigate: Navigate }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const email = user?.email ?? "";
  const initials = (email.split("@")[0]?.slice(0, 1) || "W").toUpperCase();

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const result = await signOut();
    if (!result.error) {
      setMenuOpen(false);
      navigate("/");
    } else setSignOutError("退出失败，请重试");
    setSigningOut(false);
  };

  return (
    <header className="h-14 border-b border-line bg-paper/90">
      <div className="mx-auto flex h-full w-full max-w-[1264px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-[9px] text-[13px] text-[#777d75]">
          <button onClick={() => navigate("/")} type="button" aria-label="返回首页">
            <Brand />
          </button>
          {page && (
            <>
              <ChevronRight size={14} aria-hidden="true" />
              <span>{page}</span>
            </>
          )}
        </div>
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              className="relative grid size-9 place-items-center rounded-full border border-line bg-white text-[12px] font-semibold hover:bg-[#f1f3ee]"
              type="button"
              aria-label="账户菜单"
              title="账户菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  className="size-full rounded-full object-cover"
                  src={String(user.user_metadata.avatar_url)}
                  alt=""
                />
              ) : (
                <>
                  {initials}
                  <span
                    className="absolute bottom-0.5 right-0.5 size-2 rounded-full border-2 border-white bg-[#65a776]"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-11 z-30 w-52 border border-line bg-white p-2 shadow-[0_12px_28px_rgba(32,35,31,0.12)]"
                role="menu"
              >
                <div className="border-b border-soft-line px-3 py-2.5">
                  <p className="truncate text-[12px] font-semibold text-ink">
                    {user.user_metadata?.full_name
                      ? String(user.user_metadata.full_name)
                      : "Wex 用户"}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted">{email}</p>
                </div>
                {signOutError && (
                  <p className="px-3 pt-2 text-[11px] text-danger" role="alert">
                    {signOutError}
                  </p>
                )}
                <button
                  className="mt-1 flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] text-[#59635a] hover:bg-[#f2f5ef] hover:text-ink disabled:opacity-50"
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <LoaderCircle className="animate-spin" size={15} />
                  ) : (
                    <LogOut size={15} />
                  )}
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="inline-flex h-9 items-center gap-2 border border-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-[#f1f3ee]"
            type="button"
            onClick={() => navigate("/auth")}
          >
            <CircleUserRound size={16} />
            登录
          </button>
        )}
      </div>
    </header>
  );
}
