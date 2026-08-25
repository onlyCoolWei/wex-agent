import { CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, useAuth } from "../lib/auth.js";
import type { Navigate } from "../routing.js";

function validRedirect(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value === "/auth" ||
    value.startsWith("/auth/")
  )
    return "/workspace";
  return value;
}

export function AuthCallbackPage({ navigate }: { navigate: Navigate }) {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const finish = async () => {
      if (!supabase) {
        setError("认证服务尚未配置，请联系管理员");
        return;
      }
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("确认登录失败，请重新发送确认邮件或重试");
          return;
        }
      }
      const target = validRedirect(sessionStorage.getItem("wex-auth-redirect"));
      sessionStorage.removeItem("wex-auth-redirect");
      if (active) navigate(target);
    };
    void finish();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!loading && user && !error) {
      const target = validRedirect(sessionStorage.getItem("wex-auth-redirect"));
      sessionStorage.removeItem("wex-auth-redirect");
      navigate(target);
    }
  }, [error, loading, navigate, user]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f6f1] px-6">
      <section className="w-full max-w-[390px] border border-[#d8ddd4] bg-white p-8 text-center shadow-[0_14px_50px_rgba(32,35,31,0.06)]">
        {error ? (
          <>
            <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#fff1ef] text-danger">
              <CircleAlert size={21} />
            </div>
            <h1 className="mt-5 font-display text-[25px] font-normal">确认登录失败</h1>
            <p className="mt-2 text-[13px] leading-6 text-muted">{error}</p>
            <button
              className="mt-6 h-11 w-full bg-ink text-[13px] font-semibold text-paper"
              type="button"
              onClick={() => navigate("/auth")}
            >
              返回登录
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto animate-spin text-forest" size={24} />
            <h1 className="mt-5 font-display text-[25px] font-normal">正在完成登录</h1>
            <p className="mt-2 text-[13px] text-muted">请稍候，我们正在确认你的账户。</p>
          </>
        )}
      </section>
    </main>
  );
}
