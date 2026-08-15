import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleUserRound,
  Globe2,
  LoaderCircle,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./components/ui/button.js";
import { Textarea } from "./components/ui/textarea.js";

type Navigate = (path: string) => void;
type PreviewState = "idle" | "starting" | "ready" | "error";
type MobilePanel = "chat" | "preview";

const promptSuggestions = [
  "为独立设计工作室创建一个首页",
  "做一个简洁的 SaaS 产品落地页",
  "设计一页摄影作品集",
];

function usePathname() {
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

function AppHeader({ page, navigate }: { page?: string; navigate: Navigate }) {
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
        <button
          className="relative grid size-9 place-items-center rounded-full border border-line bg-white hover:bg-[#f1f3ee]"
          type="button"
          aria-label="账户菜单"
          title="账户菜单"
        >
          <span
            className="absolute bottom-0.5 right-0.5 size-2 rounded-full border-2 border-white bg-[#65a776]"
            aria-hidden="true"
          />
          <CircleUserRound size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function HomePage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="min-h-dvh overflow-hidden bg-paper">
      <AppHeader navigate={navigate} />
      <section className="relative grid min-h-[calc(100dvh-56px)] place-items-center overflow-hidden bg-[radial-gradient(#d3d7d0_0.65px,transparent_0.65px)] bg-size-[22px_22px] px-6 py-[54px] pb-[92px] before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-line before:opacity-40 after:absolute after:inset-x-0 after:top-[52%] after:h-px after:bg-line after:opacity-40">
        <div className="relative z-10 flex max-w-[760px] flex-col items-center text-center">
          <div
            className="mb-[30px] flex items-center gap-2.5 font-display text-[11px] text-[#959b93]"
            aria-hidden="true"
          >
            <span>W</span>
            <i className="h-px w-12 bg-[#b9beb7]" />
            <span>X</span>
          </div>
          <p className="mb-5 flex items-center gap-[7px] text-[11px] font-bold tracking-[0.1em] text-forest uppercase">
            <Sparkles size={14} /> AI 网站创作空间
          </p>
          <h1 className="font-display text-5xl leading-[1.07] font-normal sm:text-[64px] lg:text-[78px]">
            用对话，构建你的站点。
          </h1>
          <p className="mt-6 max-w-[500px] text-[15px] leading-[1.8] text-[#666d65]">
            从一个想法开始，和 Wex 一起把它变成可预览、可迭代的网站。
          </p>
          <Button
            className="mt-[34px] h-[46px] px-[21px]"
            type="button"
            onClick={() => navigate("/workspace")}
          >
            进入工作台 <ArrowRight size={17} />
          </Button>
        </div>
        <div
          className="absolute inset-x-4 bottom-[23px] flex justify-between font-mono text-[9px] tracking-[0.16em] text-[#9ca19a] sm:inset-x-8"
          aria-hidden="true"
        >
          <span>DESIGN</span>
          <span>BUILD</span>
          <span>ITERATE</span>
        </div>
      </section>
    </main>
  );
}

function WorkspacePage({ navigate }: { navigate: Navigate }) {
  const [creating, setCreating] = useState(false);
  const createProject = () => {
    if (!creating) {
      setCreating(true);
      window.setTimeout(() => navigate(`/projects/${crypto.randomUUID()}`), 650);
    }
  };
  return (
    <main className="min-h-dvh bg-[#f7f8f5]">
      <AppHeader page="工作台" navigate={navigate} />
      <section className="mx-auto w-[calc(100%-32px)] max-w-[1200px] py-[42px] sm:w-[calc(100%-64px)] sm:py-[70px]">
        <div className="flex items-end justify-between border-b border-line pb-[30px]">
          <div>
            <p className="mb-2.5 font-mono text-[9px] font-bold tracking-[0.16em] text-[#7c8479]">
              WORKSPACE
            </p>
            <h1 className="font-display text-[38px] font-normal">项目</h1>
            <p className="mt-2 text-[13px] text-muted">管理你创建的网站</p>
          </div>
          <Button type="button" onClick={createProject} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
            {creating ? "正在创建" : "创建项目"}
          </Button>
        </div>
        <section
          className="flex min-h-[430px] flex-col items-center justify-center border-b border-line text-center"
          aria-labelledby="empty-title"
        >
          <div className="relative mb-[25px] size-[118px]" aria-hidden="true">
            <div className="absolute left-1.5 top-1 size-[102px] border border-[#bfc5bc] bg-white p-[11px] shadow-[9px_9px_0_#e5e8e1]">
              <div className="flex gap-1">
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
                <i className="size-1 rounded-full bg-[#aeb5ac]" />
              </div>
              <i className="mx-auto mt-4 block h-[25px] w-[58px] bg-[repeating-linear-gradient(135deg,#e7eae4_0_5px,#f6f7f4_5px_10px)]" />
            </div>
            <div className="absolute bottom-0 right-0 grid size-[27px] place-items-center rounded-full border border-[#afdc4e] bg-lime text-ink rotate-[-35deg]">
              <ArrowRight size={14} />
            </div>
          </div>
          <h2 id="empty-title" className="font-display text-[23px] font-normal">
            从第一个想法开始
          </h2>
          <p className="mb-[22px] mt-[9px] text-[13px] text-muted">你创建的项目会出现在这里。</p>
          <Button variant="outline" type="button" onClick={createProject} disabled={creating}>
            {creating ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
            {creating ? "正在准备工作区" : "创建第一个项目"}
          </Button>
        </section>
      </section>
    </main>
  );
}

function ChatPanel({
  navigate,
  onGenerate,
}: {
  navigate: Navigate;
  onGenerate: (prompt: string) => void;
}) {
  const [input, setInput] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = (value = input) => {
    const prompt = value.trim();
    if (!prompt || submitting) return;
    setInput("");
    setSubmittedPrompt(prompt);
    setSubmitting(true);
    onGenerate(prompt);
    window.setTimeout(() => setSubmitting(false), 1600);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };
  return (
    <section
      className="grid size-full grid-rows-[52px_minmax(0,1fr)_auto] bg-paper"
      aria-label="对话面板"
    >
      <header className="flex h-[52px] items-center border-b border-line bg-paper/95 px-[14px]">
        <Button
          variant="ghost"
          type="button"
          onClick={() => navigate("/workspace")}
          aria-label="返回工作台"
          title="返回工作台"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="ml-[7px] min-w-0">
          <span className="block truncate text-[13px] font-semibold">未命名项目</span>
          <small className="mt-0.5 flex items-center gap-1 text-[9px] text-[#858c83]">
            <i className="size-[5px] rounded-full bg-[#d2a84e]" />
            草稿
          </small>
        </div>
      </header>
      <div className="overflow-y-auto overscroll-contain">
        {!submittedPrompt ? (
          <div className="mx-auto flex min-h-full w-[calc(100%-40px)] max-w-[400px] flex-col justify-center py-8 sm:py-[52px]">
            <span className="grid size-[30px] place-items-center rounded-full border border-[#b7c1b4] bg-[#eff3eb] text-[#28352c]">
              <Sparkles size={16} />
            </span>
            <h2 className="mb-[7px] mt-[18px] font-display text-[24px] font-normal">
              今天想做些什么？
            </h2>
            <p className="text-[12px] leading-[1.7] text-muted">
              描述你想创建的页面，我会从结构、内容和视觉开始。
            </p>
            <div className="mt-[30px] flex flex-col border-t border-soft-line">
              {promptSuggestions.map((suggestion) => (
                <button
                  className="flex items-center justify-between border-b border-soft-line px-px py-[13px] text-left text-[11px] text-[#4f554e] transition-all hover:pl-[5px] hover:text-ink"
                  type="button"
                  key={suggestion}
                  onClick={() => submit(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-[22px] pt-8">
            <div className="max-w-[88%] self-end rounded-[6px_6px_1px_6px] bg-[#e9ece6] px-[14px] py-[11px] text-[12px] leading-[1.55]">
              {submittedPrompt}
            </div>
            <div className="flex max-w-[90%] items-start gap-[11px]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#b7c1b4] bg-[#eff3eb] text-[#28352c]">
                <Sparkles size={15} />
              </span>
              <div>
                {submitting ? (
                  <>
                    <strong className="text-[12px]">正在构建页面</strong>
                    <p className="mt-1.5 text-[11px] leading-[1.65] text-[#686f66]">
                      整理内容结构并生成视觉样式...
                    </p>
                    <span className="mt-3 flex gap-1">
                      <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f]" />
                      <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f] [animation-delay:0.15s]" />
                      <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f] [animation-delay:0.3s]" />
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="text-[12px]">页面已经准备好了</strong>
                    <p className="mt-1.5 text-[11px] leading-[1.65] text-[#686f66]">
                      我创建了一版首页，你可以在右侧查看并继续告诉我需要修改的地方。
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <form
        className="border-t border-line bg-[#f8f9f6] px-[14px] pb-[14px] pt-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="overflow-hidden rounded-md border border-[#cdd1ca] bg-white shadow-[0_3px_12px_rgba(25,30,25,0.04)] focus-within:border-[#8e968c] focus-within:shadow-[0_0_0_3px_rgba(79,96,82,0.08)]">
          <Textarea
            className="min-h-[72px] max-h-[120px] px-[13px] pb-1 pt-3 text-[12px] leading-[1.55]"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="描述你想创建或修改的内容..."
            rows={3}
            aria-label="给 Wex 发送消息"
          />
          <div className="flex items-center justify-between px-[13px] pb-[7px] pl-[13px] pt-[5px]">
            <span className="font-mono text-[8px] tracking-[0.08em] text-[#9ba098] uppercase">
              Wex Agent
            </span>
            <Button
              variant="send"
              type="submit"
              disabled={!input.trim() || submitting}
              aria-label="发送消息"
              title="发送消息"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PreviewPanel({ state, onRetry }: { state: PreviewState; onRetry: () => void }) {
  const status =
    state === "idle"
      ? [<Globe2 size={23} />, "等待你的第一个指令", "生成的页面会实时出现在这里。"]
      : state === "starting"
        ? [
            <LoaderCircle className="animate-spin" size={23} />,
            "正在启动预览",
            "为你的站点准备独立运行环境...",
          ]
        : [<RotateCcw size={22} />, "预览暂时无法连接", "运行环境未响应，请重新尝试。"];
  return (
    <section
      className="grid size-full grid-rows-[52px_minmax(0,1fr)] bg-paper"
      aria-label="预览面板"
    >
      <header className="flex h-[52px] items-center gap-3 border-b border-line bg-paper/95 px-[14px]">
        <div className="flex min-w-[100px] items-center gap-2 text-[12px] font-semibold">
          <Monitor size={16} />
          <span>Preview</span>
        </div>
        <div className="mx-auto flex h-7 w-[45%] max-w-[340px] items-center justify-center rounded-[4px] border border-[#e2e5df] bg-[#f5f6f2] font-mono text-[9px] text-[#969c94]">
          localhost
        </div>
        <Button
          variant="ghost"
          type="button"
          onClick={onRetry}
          aria-label="刷新预览"
          title="刷新预览"
        >
          <RefreshCw size={16} />
        </Button>
      </header>
      <div className="relative overflow-auto bg-[#e9ebe7] bg-[radial-gradient(#cfd3cc_0.6px,transparent_0.6px)] bg-size-[15px_15px] p-[18px]">
        {state === "ready" ? (
          <GeneratedSitePreview />
        ) : (
          <div className="flex size-full min-h-[300px] flex-col items-center justify-center text-center">
            <span
              className={`mb-[18px] grid size-12 place-items-center rounded-full border bg-paper/85 ${state === "error" ? "border-[#e5c3bf] text-danger" : "border-[#c6cdc4] text-[#56675a]"}`}
            >
              {status[0]}
            </span>
            <h2 className="font-display text-[20px] font-normal">{status[1]}</h2>
            <p className="mt-2 text-[11px] text-[#7c827a]">{status[2]}</p>
            {state === "starting" && (
              <span className="mt-[22px] h-0.5 w-[150px] overflow-hidden bg-[#d4d8d1]">
                <i className="block h-full w-1/2 animate-progress bg-[#526958]" />
              </span>
            )}
            {state === "error" && (
              <Button className="mt-5" variant="outline" type="button" onClick={onRetry}>
                <RefreshCw size={15} />
                重试
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GeneratedSitePreview() {
  return (
    <div className="relative min-h-full w-full overflow-hidden bg-[#dfe8d8] font-body text-[#152019] animate-appear">
      <nav className="relative z-10 flex h-[66px] items-center justify-between border-b border-[#1a261d]/25 px-[4%] text-[10px]">
        <strong className="font-display text-[17px]">FORM.</strong>
        <div className="hidden gap-6 md:flex">
          <span>Work</span>
          <span>Studio</span>
          <span>Contact</span>
        </div>
        <button className="rounded-sm bg-[#18231b] px-3 py-[9px] text-[9px] text-[#eaf0e7]">
          Start a project
        </button>
      </nav>
      <div className="relative z-10 flex min-h-[calc(100%-66px)] flex-col px-[6%] pb-[5%] pt-[8%]">
        <p className="text-[8px] font-bold tracking-[0.13em]">
          INDEPENDENT CREATIVE STUDIO · SHANGHAI
        </p>
        <h2 className="mt-[6%] font-display text-5xl leading-[0.88] font-normal sm:text-[72px] lg:text-[112px]">
          Ideas made
          <br />
          visible.
        </h2>
        <div className="mt-auto flex flex-col items-start gap-[25px] sm:flex-row sm:items-end sm:justify-between">
          <p className="mt-[60px] max-w-[300px] text-[11px] leading-[1.7]">
            We shape thoughtful identities and digital experiences for people building what comes
            next.
          </p>
          <span className="flex items-center gap-2 border-b border-[#27342b] pb-[5px] text-[9px] font-semibold">
            <ArrowRight size={18} /> Explore our work
          </span>
        </div>
      </div>
      <div className="absolute right-[-3%] top-[18%] w-[48%] rotate-[-12deg] aspect-square">
        <i className="absolute inset-0 rounded-full border border-[#26372a]/40 bg-lime/60" />
        <i className="absolute inset-[16%] rounded-full border border-[#26372a]/40 bg-[#fffcf1]/55" />
        <i className="absolute inset-[33%] rounded-full border border-[#26372a]/40 bg-[#374f3d]" />
      </div>
    </div>
  );
}

function ProjectWorkspace({ navigate }: { navigate: Navigate }) {
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [chatWidth, setChatWidth] = useState(
    () => Number(localStorage.getItem("wex-chat-width")) || 460,
  );
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizeFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const maxChat = Math.min(640, bounds.width - 440);
    const width = Math.max(320, Math.min(maxChat, event.clientX - bounds.left));
    setChatWidth(width);
    localStorage.setItem("wex-chat-width", String(width));
  };
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeFromPointer(event);
  };
  const generate = () => {
    setPreviewState("starting");
    window.setTimeout(() => setPreviewState("ready"), 1500);
  };
  const retry = () => {
    if (previewState === "idle") return;
    setPreviewState("starting");
    window.setTimeout(() => setPreviewState("ready"), 900);
  };
  const adjustWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.max(320, Math.min(640, chatWidth + (event.key === "ArrowLeft" ? -24 : 24)));
    setChatWidth(next);
    localStorage.setItem("wex-chat-width", String(next));
  };
  return (
    <main className="size-[100vw] overflow-hidden bg-canvas">
      <div className="flex h-[52px] items-center border-b border-line bg-paper px-[14px] md:hidden">
        <Button
          variant="ghost"
          type="button"
          onClick={() => navigate("/workspace")}
          aria-label="返回工作台"
          title="返回工作台"
        >
          <ArrowLeft size={18} />
        </Button>
        <div
          className="mx-auto flex h-8 rounded-[5px] bg-[#ebede8] p-[3px]"
          role="tablist"
          aria-label="项目面板"
        >
          {(["chat", "preview"] as const).map((panel) => (
            <button
              key={panel}
              className={`rounded-[3px] px-3 text-[10px] ${mobilePanel === panel ? "bg-white font-semibold shadow-sm" : "text-[#7a8078]"}`}
              role="tab"
              aria-selected={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
            >
              {panel === "chat" ? "Chat" : "Preview"}
            </button>
          ))}
        </div>
        <span className="w-8" />
      </div>
      <div className="flex h-[calc(100%-52px)] md:h-full" ref={workspaceRef}>
        <div
          className={`min-w-0 overflow-hidden md:block md:min-w-[320px] md:max-w-[640px] md:shrink-0 ${mobilePanel === "chat" ? "block w-full" : "hidden"}`}
          style={{ width: chatWidth }}
        >
          <ChatPanel navigate={navigate} onGenerate={generate} />
        </div>
        <div
          className="relative z-10 hidden h-full w-px shrink-0 cursor-col-resize touch-none bg-[#cfd3cc] after:absolute after:inset-y-0 after:left-[-4px] after:w-[9px] hover:bg-[#486154] focus-visible:bg-[#486154] focus-visible:shadow-[0_0_0_1px_#486154] md:block"
          role="separator"
          aria-label="调整聊天和预览面板宽度"
          aria-orientation="vertical"
          aria-valuemin={320}
          aria-valuemax={640}
          aria-valuenow={Math.round(chatWidth)}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={(event) =>
            event.currentTarget.hasPointerCapture(event.pointerId) && resizeFromPointer(event)
          }
          onKeyDown={adjustWithKeyboard}
        />
        <div
          className={`min-w-0 flex-1 overflow-hidden md:block md:min-w-[440px] ${mobilePanel === "preview" ? "block" : "hidden"}`}
        >
          <PreviewPanel state={previewState} onRetry={retry} />
        </div>
      </div>
    </main>
  );
}

export function App() {
  const { pathname, navigate } = usePathname();
  if (pathname === "/workspace") return <WorkspacePage navigate={navigate} />;
  if (pathname.startsWith("/projects/")) return <ProjectWorkspace navigate={navigate} />;
  return <HomePage navigate={navigate} />;
}
