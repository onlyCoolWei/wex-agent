import type {
  AgentEvent,
  ChatMessageResponse,
  MessageCompletedPayload,
  MessageDeltaPayload,
  RunFailedPayload,
} from "@wex/contracts";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Textarea } from "../../components/ui/textarea.js";
import {
  createConversation,
  getAgentRunEventsUrl,
  listConversations,
  listMessages,
  sendMessage,
} from "../../lib/api.js";
import type { Navigate } from "../../routing.js";

const promptSuggestions = ["介绍一下你自己", "帮我梳理一个产品想法", "解释一个我不熟悉的概念"];

type ConnectionState = "idle" | "connecting" | "streaming" | "reconnecting";

function textOf(message: ChatMessageResponse): string {
  return message.content.parts[0].text;
}

export function ChatPanel({ navigate, projectId }: { navigate: Navigate; projectId: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("新对话");
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const conversations = await listConversations(projectId);
        const conversation = conversations[0] ?? (await createConversation(projectId));
        if (controller.signal.aborted) return;
        const history = await listMessages(conversation.id);
        if (controller.signal.aborted) return;
        setConversationId(conversation.id);
        setConversationTitle(conversation.title);
        setMessages(history.items);
        setActiveRunId(history.activeRun?.id ?? null);
        setSending(Boolean(history.activeRun));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "加载会话失败");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [projectId, reloadKey]);

  useEffect(() => {
    if (!activeRunId) return;
    const source = new EventSource(getAgentRunEventsUrl(activeRunId));
    setConnection("connecting");

    source.onopen = () => setConnection("streaming");
    source.onerror = () => setConnection("reconnecting");

    const onDelta = (rawEvent: Event) => {
      const event = JSON.parse((rawEvent as MessageEvent).data) as AgentEvent<MessageDeltaPayload>;
      setMessages((current) =>
        current.map((message) =>
          message.id === event.payload.messageId
            ? {
                ...message,
                content: {
                  schemaVersion: 1,
                  parts: [{ type: "text", text: textOf(message) + event.payload.delta }],
                },
              }
            : message,
        ),
      );
    };
    const onMessageCompleted = (rawEvent: Event) => {
      const event = JSON.parse(
        (rawEvent as MessageEvent).data,
      ) as AgentEvent<MessageCompletedPayload>;
      setMessages((current) =>
        current.map((message) =>
          message.id === event.payload.messageId
            ? {
                ...message,
                status: "completed",
                content: {
                  schemaVersion: 1,
                  parts: [{ type: "text", text: event.payload.content }],
                },
              }
            : message,
        ),
      );
    };
    const complete = () => {
      setActiveRunId(null);
      setSending(false);
      setConnection("idle");
      source.close();
    };
    const onFailed = (rawEvent: Event) => {
      const event = JSON.parse((rawEvent as MessageEvent).data) as AgentEvent<RunFailedPayload>;
      setMessages((current) =>
        current.map((message) =>
          message.runId === activeRunId
            ? {
                ...message,
                status: "failed",
                error: { code: event.payload.code, message: event.payload.message },
              }
            : message,
        ),
      );
      setError(event.payload.message);
      complete();
    };

    source.addEventListener("message.delta", onDelta);
    source.addEventListener("message.completed", onMessageCompleted);
    source.addEventListener("run.completed", complete);
    source.addEventListener("run.failed", onFailed);
    source.addEventListener("run.cancelled", complete);

    return () => source.close();
  }, [activeRunId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" });
  }, [messages]);

  const submit = async (value = input) => {
    const prompt = value.trim();
    if (!prompt || !conversationId || sending) return;
    const clientMessageId = crypto.randomUUID();
    const optimisticMessage: ChatMessageResponse = {
      id: `optimistic:${clientMessageId}`,
      conversationId,
      runId: null,
      clientMessageId,
      role: "user",
      status: "completed",
      content: { schemaVersion: 1, parts: [{ type: "text", text: prompt }] },
      position: Number.MAX_SAFE_INTEGER,
      error: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    setInput("");
    setError(null);
    setSending(true);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const result = await sendMessage(conversationId, {
        clientMessageId,
        content: optimisticMessage.content,
      });
      setMessages((current) => [
        ...current.map((message) =>
          message.id === optimisticMessage.id ? result.userMessage : message,
        ),
        result.assistantMessage,
      ]);
      setActiveRunId(result.run.id);
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setInput(prompt);
      setSending(false);
      setError(sendError instanceof Error ? sendError.message : "发送消息失败");
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const empty = !loading && messages.length === 0;

  return (
    <section
      className="grid size-full grid-rows-[minmax(0,1fr)_auto] bg-paper md:grid-rows-[52px_minmax(0,1fr)_auto]"
      aria-label="对话面板"
    >
      <header className="hidden h-[52px] items-center border-b border-line bg-paper/95 px-[14px] md:flex">
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
          <span className="block truncate text-[13px] font-semibold">{conversationTitle}</span>
          <small className="mt-0.5 flex items-center gap-1 text-[9px] text-[#858c83]">
            <i
              className={`size-[5px] rounded-full ${connection === "streaming" ? "bg-[#5c8065]" : connection === "reconnecting" ? "bg-[#c17b62]" : "bg-[#d2a84e]"}`}
            />
            {connection === "streaming"
              ? "回复中"
              : connection === "reconnecting"
                ? "正在重连"
                : "对话"}
          </small>
        </div>
      </header>

      <div className="overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex min-h-full items-center justify-center text-[#778078]">
            <LoaderCircle className="animate-spin" size={20} />
          </div>
        ) : error && !conversationId ? (
          <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
            <span className="grid size-10 place-items-center rounded-full border border-[#e5c3bf] bg-[#fff8f7] text-danger">
              <AlertCircle size={18} />
            </span>
            <h2 className="mt-4 text-[14px] font-semibold">会话暂时无法加载</h2>
            <p className="mt-1.5 text-[11px] text-muted">{error}</p>
            <Button
              className="mt-5"
              variant="outline"
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <RefreshCw size={14} />
              重试
            </Button>
          </div>
        ) : empty ? (
          <div className="mx-auto flex min-h-full w-[calc(100%-32px)] max-w-[400px] flex-col justify-center py-7 sm:w-[calc(100%-40px)] sm:py-[52px]">
            <span className="grid size-[30px] place-items-center rounded-full border border-[#b7c1b4] bg-[#eff3eb] text-[#28352c]">
              <Sparkles size={16} />
            </span>
            <h2 className="mb-[7px] mt-4 font-display text-[22px] font-normal sm:mt-[18px] sm:text-[24px]">
              今天想聊些什么？
            </h2>
            <p className="text-[12px] leading-[1.7] text-muted">
              把问题或想法告诉我，我们可以一起梳理。
            </p>
            <div className="mt-6 flex flex-col border-t border-soft-line sm:mt-[30px]">
              {promptSuggestions.map((suggestion) => (
                <button
                  className="flex min-h-11 items-center justify-between border-b border-soft-line px-px py-3 text-left text-[11px] text-[#4f554e] transition-all hover:pl-[5px] hover:text-ink sm:py-[13px]"
                  type="button"
                  key={suggestion}
                  onClick={() => void submit(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-6 sm:gap-5 sm:p-[22px] sm:py-8">
            {messages.map((message) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="max-w-[88%] self-end whitespace-pre-wrap break-words rounded-[6px_6px_1px_6px] bg-[#e9ece6] px-3 py-2.5 text-[12px] leading-[1.6] sm:px-[14px] sm:py-[11px]"
                >
                  {textOf(message)}
                </div>
              ) : (
                <div key={message.id} className="flex max-w-[92%] items-start gap-[11px]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#b7c1b4] bg-[#eff3eb] text-[#28352c]">
                    <Sparkles size={15} />
                  </span>
                  <div className="min-w-0 pt-1 text-[12px] leading-[1.7] text-[#3f4640]">
                    {textOf(message) ? (
                      <p className="whitespace-pre-wrap break-words">{textOf(message)}</p>
                    ) : message.status === "streaming" ? (
                      <span className="flex gap-1 py-2" aria-label="正在生成回复">
                        <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f]" />
                        <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f] [animation-delay:0.15s]" />
                        <i className="size-[5px] animate-pulse-dot rounded-full bg-[#6c816f] [animation-delay:0.3s]" />
                      </span>
                    ) : null}
                    {message.status === "failed" && (
                      <span className="mt-2 flex items-center gap-1.5 text-[10px] text-danger">
                        <AlertCircle size={13} />
                        {message.error?.message ?? "回复生成失败"}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="border-t border-line bg-[#f8f9f6] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5 sm:px-[14px] sm:pb-[14px] sm:pt-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit();
        }}
      >
        {error && conversationId && <p className="mb-2 text-[10px] text-danger">{error}</p>}
        <div className="overflow-hidden rounded-md border border-[#cdd1ca] bg-white shadow-[0_3px_12px_rgba(25,30,25,0.04)] focus-within:border-[#8e968c] focus-within:shadow-[0_0_0_3px_rgba(79,96,82,0.08)]">
          <Textarea
            className="min-h-[56px] max-h-[104px] px-3 pb-1 pt-2.5 text-[12px] leading-[1.55] sm:min-h-[72px] sm:max-h-[120px] sm:px-[13px] sm:pt-3"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={sending ? "等待当前回复完成..." : "输入消息..."}
            rows={3}
            disabled={loading || sending || !conversationId}
            aria-label="给 Wex 发送消息"
          />
          <div className="flex items-center justify-between px-3 pb-1.5 pt-1 sm:px-[13px] sm:pb-[7px] sm:pt-[5px]">
            <span className="font-mono text-[8px] tracking-[0.08em] text-[#9ba098] uppercase">
              gpt-5.6-luna
            </span>
            <Button
              variant="send"
              type="submit"
              disabled={!input.trim() || loading || sending || !conversationId}
              aria-label="发送消息"
              title="发送消息"
            >
              {sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
