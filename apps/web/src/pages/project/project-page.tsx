import { ArrowLeft } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import { Button } from "../../components/ui/button.js";
import type { Navigate } from "../../routing.js";
import { ChatPanel } from "./chat-panel.js";
import { PreviewPanel, type PreviewState } from "./preview-panel.js";

type MobilePanel = "chat" | "preview";

export function ProjectPage({ navigate, projectId }: { navigate: Navigate; projectId: string }) {
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
    <main className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-canvas">
      <div className="flex h-[calc(52px+env(safe-area-inset-top))] shrink-0 items-center border-b border-line bg-paper px-[14px] pt-[env(safe-area-inset-top)] md:hidden">
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
      <div className="flex min-h-0 flex-1" ref={workspaceRef}>
        <div
          className={`min-w-0 overflow-hidden md:block md:w-[var(--chat-width)] md:min-w-[320px] md:max-w-[640px] md:shrink-0 ${mobilePanel === "chat" ? "block w-full" : "hidden"}`}
          style={{ "--chat-width": `${chatWidth}px` } as CSSProperties}
        >
          <ChatPanel navigate={navigate} projectId={projectId} />
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
          className={`min-w-0 flex-1 overflow-hidden md:block md:min-w-[440px] ${mobilePanel === "preview" ? "block w-full" : "hidden"}`}
        >
          <PreviewPanel state={previewState} onRetry={retry} />
        </div>
      </div>
    </main>
  );
}
