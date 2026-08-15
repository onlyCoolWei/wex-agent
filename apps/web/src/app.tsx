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
    <span className="brand">
      <span className="brand-symbol" aria-hidden="true">
        W
      </span>
      <span>Wex</span>
    </span>
  );
}

function AppHeader({ page, navigate }: { page?: string; navigate: Navigate }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-path">
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
        <button className="account-button" type="button" aria-label="账户菜单" title="账户菜单">
          <span className="account-status" aria-hidden="true" />
          <CircleUserRound size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function HomePage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="home-page">
      <AppHeader navigate={navigate} />
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-monogram" aria-hidden="true">
            <span>W</span>
            <i />
            <span>X</span>
          </div>
          <p className="hero-kicker">
            <Sparkles size={14} /> AI 网站创作空间
          </p>
          <h1>用对话，构建你的站点。</h1>
          <p className="hero-description">
            从一个想法开始，和 Wex 一起把它变成可预览、可迭代的网站。
          </p>
          <button
            className="primary-button hero-action"
            type="button"
            onClick={() => navigate("/workspace")}
          >
            进入工作台
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-footnote" aria-hidden="true">
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
    if (creating) return;
    setCreating(true);
    window.setTimeout(() => navigate(`/projects/${crypto.randomUUID()}`), 650);
  };
  return (
    <main className="workspace-page">
      <AppHeader page="工作台" navigate={navigate} />
      <section className="workspace-content">
        <div className="workspace-heading">
          <div>
            <p className="section-label">WORKSPACE</p>
            <h1>项目</h1>
            <p>管理你创建的网站</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={createProject}
            disabled={creating}
          >
            {creating ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
            {creating ? "正在创建" : "创建项目"}
          </button>
        </div>
        <section className="empty-projects" aria-labelledby="empty-title">
          <div className="empty-visual" aria-hidden="true">
            <div className="empty-window">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div className="empty-cursor">
              <ArrowRight size={14} />
            </div>
          </div>
          <h2 id="empty-title">从第一个想法开始</h2>
          <p>你创建的项目会出现在这里。</p>
          <button
            className="secondary-button"
            type="button"
            onClick={createProject}
            disabled={creating}
          >
            {creating ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {creating ? "正在准备工作区" : "创建第一个项目"}
          </button>
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
    <section className="chat-panel" aria-label="对话面板">
      <header className="panel-topbar chat-topbar">
        <button
          className="icon-button"
          type="button"
          onClick={() => navigate("/workspace")}
          aria-label="返回工作台"
          title="返回工作台"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="project-identity">
          <span>未命名项目</span>
          <small>
            <i /> 草稿
          </small>
        </div>
        <div className="topbar-spacer" />
      </header>
      <div className="message-list">
        {!submittedPrompt ? (
          <div className="welcome-message">
            <span className="agent-mark">
              <Sparkles size={16} />
            </span>
            <h2>今天想做些什么？</h2>
            <p>描述你想创建的页面，我会从结构、内容和视觉开始。</p>
            <div className="prompt-list">
              {promptSuggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => submit(suggestion)}>
                  <span>{suggestion}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="conversation">
            <div className="user-message">{submittedPrompt}</div>
            <div className="agent-message">
              <span className="agent-mark">
                <Sparkles size={15} />
              </span>
              <div>
                {submitting ? (
                  <>
                    <strong>正在构建页面</strong>
                    <p>整理内容结构并生成视觉样式...</p>
                    <span className="building-line">
                      <i />
                      <i />
                      <i />
                    </span>
                  </>
                ) : (
                  <>
                    <strong>页面已经准备好了</strong>
                    <p>我创建了一版首页，你可以在右侧查看并继续告诉我需要修改的地方。</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <form
        className="composer-wrap"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="描述你想创建或修改的内容..."
            rows={3}
            aria-label="给 Wex 发送消息"
          />
          <div className="composer-footer">
            <span>Wex Agent</span>
            <button
              className="send-button"
              type="submit"
              disabled={!input.trim() || submitting}
              aria-label="发送消息"
              title="发送消息"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PreviewPanel({ state, onRetry }: { state: PreviewState; onRetry: () => void }) {
  return (
    <section className="preview-panel" aria-label="预览面板">
      <header className="panel-topbar preview-topbar">
        <div>
          <Monitor size={16} />
          <span>Preview</span>
        </div>
        <div className="preview-address">
          <span>localhost</span>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onRetry}
          aria-label="刷新预览"
          title="刷新预览"
        >
          <RefreshCw size={16} />
        </button>
      </header>
      <div className="preview-canvas">
        {state === "idle" && (
          <div className="status-view">
            <span className="status-icon">
              <Globe2 size={23} />
            </span>
            <h2>等待你的第一个指令</h2>
            <p>生成的页面会实时出现在这里。</p>
          </div>
        )}
        {state === "starting" && (
          <div className="status-view">
            <span className="status-icon">
              <LoaderCircle className="spin" size={23} />
            </span>
            <h2>正在启动预览</h2>
            <p>为你的站点准备独立运行环境...</p>
            <span className="progress-track">
              <i />
            </span>
          </div>
        )}
        {state === "error" && (
          <div className="status-view">
            <span className="status-icon status-icon--error">
              <RotateCcw size={22} />
            </span>
            <h2>预览暂时无法连接</h2>
            <p>运行环境未响应，请重新尝试。</p>
            <button className="secondary-button" type="button" onClick={onRetry}>
              <RefreshCw size={15} />
              重试
            </button>
          </div>
        )}
        {state === "ready" && <GeneratedSitePreview />}
      </div>
    </section>
  );
}

function GeneratedSitePreview() {
  return (
    <div className="generated-site">
      <nav>
        <strong>FORM.</strong>
        <div>
          <span>Work</span>
          <span>Studio</span>
          <span>Contact</span>
        </div>
        <button>Start a project</button>
      </nav>
      <div className="site-main">
        <p>INDEPENDENT CREATIVE STUDIO · SHANGHAI</p>
        <h2>
          Ideas made
          <br />
          visible.
        </h2>
        <div className="site-bottom">
          <p>
            We shape thoughtful identities and digital experiences for people building what comes
            next.
          </p>
          <span>
            <ArrowRight size={18} /> Explore our work
          </span>
        </div>
      </div>
      <div className="site-shape">
        <i />
        <i />
        <i />
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
    <main className="project-page">
      <div className="mobile-project-bar">
        <button
          className="icon-button"
          type="button"
          onClick={() => navigate("/workspace")}
          aria-label="返回工作台"
          title="返回工作台"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="mobile-tabs" role="tablist" aria-label="项目面板">
          <button
            role="tab"
            aria-selected={mobilePanel === "chat"}
            onClick={() => setMobilePanel("chat")}
          >
            Chat
          </button>
          <button
            role="tab"
            aria-selected={mobilePanel === "preview"}
            onClick={() => setMobilePanel("preview")}
          >
            Preview
          </button>
        </div>
        <span className="mobile-bar-spacer" />
      </div>
      <div className="project-workspace" ref={workspaceRef}>
        <div
          className={`workspace-panel chat-slot${mobilePanel === "chat" ? " is-mobile-active" : ""}`}
          style={{ width: chatWidth }}
        >
          <ChatPanel navigate={navigate} onGenerate={generate} />
        </div>
        <div
          className="resize-handle"
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
          className={`workspace-panel preview-slot${mobilePanel === "preview" ? " is-mobile-active" : ""}`}
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
