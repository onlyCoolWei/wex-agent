import { ArrowLeft, ArrowRight, Send, Sparkles } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Textarea } from "../../components/ui/textarea.js";
import type { Navigate } from "../../routing.js";

const promptSuggestions = [
  "为独立设计工作室创建一个首页",
  "做一个简洁的 SaaS 产品落地页",
  "设计一页摄影作品集",
];

export function ChatPanel({
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
