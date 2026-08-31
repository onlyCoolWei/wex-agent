import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Brand } from "../components/brand.js";
import { useAuth } from "../lib/auth.js";
import type { Navigate } from "../routing.js";

type AuthStep = "credentials" | "confirmation";

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

function friendlyEmail(email: string): string {
  const [name, domain] = email.split("@");
  return name && domain ? `${name.slice(0, 1)}***@${domain}` : email;
}

export function AuthPage({ navigate }: { navigate: Navigate }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const rawRedirect = params.get("redirect");
  const redirect = validRedirect(rawRedirect);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const { user, loading, configured, signIn, startSignUp, resendSignUp, signInWithGoogle } =
    useAuth();

  useEffect(() => {
    if (rawRedirect && redirect !== rawRedirect) {
      window.history.replaceState({}, "", "/auth");
    }
  }, [rawRedirect, redirect]);

  useEffect(() => {
    if (!loading && user) navigate(redirect);
  }, [loading, navigate, redirect, user]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 个字符");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    const loginResult = await signIn(normalizedEmail, password);
    // Supabase intentionally does not expose account existence. Try password login
    // first, then start email-confirmed signup when the credentials are unknown.
    const result: { error: string | null; needsConfirmation?: boolean } =
      loginResult.error === "邮箱或密码错误"
        ? await startSignUp(normalizedEmail, password, redirect)
        : loginResult;
    if (result.error) {
      setError(result.error);
    } else if (result.needsConfirmation) {
      setEmail(normalizedEmail);
      setStep("confirmation");
      setResendSeconds(60);
      setNotice("确认邮件已发送，请点击邮件中的确认链接");
    } else {
      navigate(redirect);
    }
    setBusy(false);
  };

  const resend = async () => {
    if (busy || resendSeconds > 0) return;
    setBusy(true);
    setError(null);
    const result = await resendSignUp(email);
    if (result.error) setError(result.error);
    else {
      setResendSeconds(60);
      setNotice("新的确认邮件已发送");
    }
    setBusy(false);
  };

  const googleLogin = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle(redirect);
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  };

  if (loading || user) {
    return <AuthLoading />;
  }

  return (
    <main className="min-h-dvh bg-[#f4f6f1] text-ink">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1280px] grid-cols-1 lg:grid-cols-[minmax(0,0.88fr)_minmax(430px,1.12fr)]">
        <section className="relative hidden overflow-hidden border-r border-[#d8ddd4] bg-[#25322b] p-10 text-[#f5f7ef] lg:flex lg:flex-col lg:justify-between">
          <Brand
            className="relative z-10 gap-3 text-[18px] text-[#f5f7ef]"
            logoClassName="size-8"
          />
          <div className="relative z-10 max-w-[390px] pb-12">
            <p className="mb-5 font-mono text-[10px] tracking-[0.18em] text-[#b2c5ae]">
              YOUR NEXT BUILD STARTS HERE
            </p>
            <h1 className="font-display text-[52px] leading-[1.04] font-normal">
              把想法，
              <br />
              <em className="text-lime">变成真实的站点。</em>
            </h1>
            <p className="mt-6 max-w-[330px] text-[14px] leading-7 text-[#c4cdc2]">
              登录 Wex，继续你的创作。每一个项目都从一次清晰的对话开始。
            </p>
          </div>
          <div
            className="absolute -right-20 top-1/2 size-[420px] -translate-y-1/2 rotate-45 border border-[#586a5d]"
            aria-hidden="true"
          />
          <div
            className="absolute -right-6 top-1/2 size-[280px] -translate-y-1/2 rotate-45 border border-[#586a5d]"
            aria-hidden="true"
          />
          <div className="absolute bottom-10 left-10 right-10 flex justify-between font-mono text-[9px] tracking-[0.18em] text-[#879889]">
            <span>DESIGN</span>
            <span>BUILD</span>
            <span>ITERATE</span>
          </div>
        </section>

        <section className="flex flex-col px-5 py-6 sm:px-12 sm:py-10 lg:px-20 lg:py-14">
          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 text-[12px] text-muted transition-colors hover:text-ink lg:hidden"
              type="button"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={15} /> 返回首页
            </button>
            <span className="font-mono text-[10px] tracking-[0.16em] text-[#899188] lg:ml-auto">
              ACCOUNT ACCESS / 01
            </span>
          </div>
          <div className="mx-auto flex w-full max-w-[450px] flex-1 flex-col justify-center py-12">
            <div className="mb-9 lg:hidden">
              <Brand className="mb-7 gap-2 text-[18px] text-ink" logoClassName="size-8" />
            </div>
            <div className="mb-8">
              <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.17em] text-forest">
                WELCOME BACK
              </p>
              <h2 className="font-display text-[40px] leading-none font-normal">
                {step === "confirmation" ? "确认你的邮箱" : "继续创作"}
              </h2>
              <p className="mt-4 text-[14px] leading-6 text-muted">
                {step === "confirmation"
                  ? `确认邮件已发送至 ${friendlyEmail(email)}`
                  : "使用邮箱或 Google 账户安全登录 Wex。首次使用的邮箱会收到确认邮件。"}
              </p>
            </div>

            {step === "credentials" ? (
              <>
                <form className="space-y-4" onSubmit={submitCredentials}>
                  <label className="block">
                    <span className="mb-2 block text-[12px] font-medium text-[#4f594f]">
                      邮箱地址
                    </span>
                    <span className="relative block">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49a]"
                        size={16}
                      />
                      <input
                        className="h-12 w-full border border-[#cfd6cb] bg-white pl-10 pr-3 text-[14px] outline-none transition-colors placeholder:text-[#aab2a8] focus:border-forest"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        disabled={busy}
                      />
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[12px] font-medium text-[#4f594f]">密码</span>
                    <span className="relative block">
                      <input
                        className="h-12 w-full border border-[#cfd6cb] bg-white px-3 pr-11 text-[14px] outline-none transition-colors placeholder:text-[#aab2a8] focus:border-forest"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="至少 6 个字符"
                        disabled={busy}
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#899389] hover:text-ink"
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                  {error && <ErrorMessage message={error} />}
                  {!configured && (
                    <ErrorMessage message="认证服务尚未配置，请在环境变量中设置 SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。" />
                  )}
                  <button
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 bg-ink text-[13px] font-semibold text-paper transition-colors hover:bg-[#354038] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={busy || !configured}
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <ArrowRight size={17} />
                    )}
                    {busy ? "正在处理" : "登录"}
                  </button>
                </form>
                <Divider />
                <button
                  className="flex h-12 w-full items-center justify-center gap-3 border border-[#cfd6cb] bg-white text-[13px] font-medium text-ink transition-colors hover:bg-[#f8faf6] disabled:opacity-60"
                  type="button"
                  onClick={googleLogin}
                  disabled={busy || !configured}
                >
                  <span className="grid size-5 place-items-center rounded-full border border-[#d4d9d2] text-[13px] font-semibold">
                    G
                  </span>
                  使用 Google 登录
                </button>
              </>
            ) : (
              <section className="space-y-5">
                <div className="border border-[#d9e2d5] bg-[#f9fbf7] px-5 py-6 text-center">
                  <Mail className="mx-auto text-forest" size={28} />
                  <p className="mt-4 text-[14px] font-medium text-ink">请打开邮件并点击确认链接</p>
                  <p className="mt-2 text-[12px] leading-5 text-muted">
                    完成确认后，页面会自动登录并进入工作台。
                  </p>
                  <p className="mt-3 break-all font-mono text-[11px] text-[#667064]">{email}</p>
                </div>
                {notice && (
                  <p className="flex items-center gap-2 text-[12px] text-forest">
                    <Check size={15} />
                    {notice}
                  </p>
                )}
                {error && <ErrorMessage message={error} />}
                <div className="flex items-center justify-between text-[12px] text-muted">
                  <button
                    className="inline-flex items-center gap-1.5 hover:text-ink"
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setError(null);
                    }}
                  >
                    <ArrowLeft size={14} />
                    返回修改
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    onClick={resend}
                    disabled={busy || resendSeconds > 0}
                  >
                    {resendSeconds > 0 ? (
                      <span>{resendSeconds}s 后可重发</span>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        重新发送邮件
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}
            {step === "credentials" && (
              <p className="mt-8 text-center text-[11px] leading-5 text-[#899188]">
                继续即表示你同意 Wex 的服务条款与隐私政策。
              </p>
            )}
          </div>
          <p className="text-center font-mono text-[9px] tracking-[0.15em] text-[#9aa39a] lg:text-right">
            WEX / CREATIVE WORKSPACE
          </p>
        </section>
      </div>
    </main>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 border-l-2 border-danger bg-[#fff8f7] px-3 py-2.5 text-[12px] leading-5 text-danger"
      role="alert"
    >
      <CircleAlert className="mt-0.5 shrink-0" size={15} />
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[10px] tracking-[0.12em] text-[#9aa39a]">
      <span className="h-px flex-1 bg-[#dce1d9]" />
      <span>OR</span>
      <span className="h-px flex-1 bg-[#dce1d9]" />
    </div>
  );
}

export function AuthLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f6f1]">
      <LoaderCircle className="animate-spin text-forest" size={22} aria-label="正在确认登录状态" />
    </main>
  );
}
