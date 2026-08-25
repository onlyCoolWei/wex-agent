import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ""
).trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      })
    : null;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  startSignUp: (
    email: string,
    password: string,
    redirect: string,
  ) => Promise<{ needsConfirmation: boolean; error: string | null }>;
  resendSignUp: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirect: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthError(error: { message: string } | null): string | null {
  if (!error) return null;
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials") || message.includes("already registered")) {
    return "邮箱或密码错误";
  }
  if (message.includes("rate limit") || message.includes("too many"))
    return "尝试次数过多，请稍后再试";
  if (message.includes("expired")) return "验证码已过期，请重新发送";
  if (message.includes("invalid") && message.includes("token")) return "验证码错误";
  if (message.includes("network") || message.includes("fetch")) return "网络异常，请稍后重试";
  return error.message || "认证失败，请重试";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 2500);
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setLoading(false);
        }
      })
      .finally(() => window.clearTimeout(timeoutId));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: Boolean(supabase),
      async signIn(email, password) {
        if (!supabase) return { error: "认证服务尚未配置，请联系管理员" };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (data.session) setSession(data.session);
        return { error: mapAuthError(error) };
      },
      async startSignUp(email, password, redirect) {
        if (!supabase) return { needsConfirmation: false, error: "认证服务尚未配置，请联系管理员" };
        sessionStorage.setItem("wex-auth-redirect", redirect);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (data.session) setSession(data.session);
        return { needsConfirmation: !error && !data.session, error: mapAuthError(error) };
      },
      async resendSignUp(email) {
        if (!supabase) return { error: "认证服务尚未配置，请联系管理员" };
        const { error } = await supabase.auth.resend({ type: "signup", email });
        return { error: mapAuthError(error) };
      },
      async signInWithGoogle(redirect) {
        if (!supabase) return { error: "认证服务尚未配置，请联系管理员" };
        sessionStorage.setItem("wex-auth-redirect", redirect);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        return { error: mapAuthError(error) };
      },
      async signOut() {
        if (!supabase) return { error: "认证服务尚未配置，请联系管理员" };
        const { error } = await supabase.auth.signOut();
        return { error: mapAuthError(error) };
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
