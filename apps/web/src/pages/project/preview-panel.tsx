import { Globe2, LoaderCircle, Monitor, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { GeneratedSitePreview } from "./generated-site-preview.js";

export type PreviewState = "idle" | "starting" | "ready" | "error";

export function PreviewPanel({ state, onRetry }: { state: PreviewState; onRetry: () => void }) {
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
