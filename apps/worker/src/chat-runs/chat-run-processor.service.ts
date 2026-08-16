import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type {
  AgentEvent,
  ConversationInputItem,
  MessageCompletedPayload,
  MessageDeltaPayload,
  RunFailedPayload,
  UsageUpdatedPayload,
} from "@wex/contracts";
import type { Database, Json, SupabaseServerClient } from "@wex/database";
import { AgentRuntimeService } from "../agent-runtime/agent-runtime.service.js";
import { SUPABASE_CLIENT } from "../database/tokens.js";

type AgentRunRow = Database["public"]["Tables"]["agent_runs"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const POLL_INTERVAL_MS = 750;
const DELTA_FLUSH_MS = 250;
const DELTA_FLUSH_CHARS = 100;
const MAX_CONTEXT_CHARS = 80_000;

@Injectable()
export class ChatRunProcessorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ChatRunProcessorService.name);
  private pollTimer?: NodeJS.Timeout;
  private polling = false;

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseServerClient,
    @Inject(AgentRuntimeService)
    private readonly runtime: AgentRuntimeService,
  ) {}

  onApplicationBootstrap(): void {
    void this.poll();
    this.pollTimer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const { data, error } = await this.supabase.rpc("claim_next_chat_run");
      if (error) throw error;
      const run = this.parseClaimedRun(data);
      if (run) await this.execute(run);
    } catch (error) {
      this.logger.error("Failed to poll chat run", error);
    } finally {
      this.polling = false;
    }
  }

  private async execute(run: AgentRunRow): Promise<void> {
    let sequence = 0;
    let content = "";
    let pendingDelta = "";
    let lastFlushAt = Date.now();
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let terminal = false;

    const flushDelta = async (): Promise<void> => {
      if (!pendingDelta) return;
      const delta = pendingDelta;
      pendingDelta = "";
      lastFlushAt = Date.now();
      const { error } = await this.supabase.rpc("append_chat_delta", {
        p_content: content,
        p_delta: delta,
        p_run_id: run.id,
        p_sequence: ++sequence,
      });
      if (error) throw error;
    };

    try {
      const { projectId, ownerId } = await this.loadConversation(run.conversation_id);
      const input = await this.loadInput(run.conversation_id);
      const events = this.runtime.run({
        runId: run.id,
        attemptId: run.attempt_id ?? run.id,
        projectId,
        conversationId: run.conversation_id,
        assistantMessageId: run.assistant_message_id,
        userId: ownerId ?? "anonymous",
        workspaceId: projectId,
        input,
        agentId: "main-chat",
      });

      for await (const event of events) {
        if (event.type === "message.delta") {
          const { delta } = event.payload as MessageDeltaPayload;
          content += delta;
          pendingDelta += delta;
          if (
            pendingDelta.length >= DELTA_FLUSH_CHARS ||
            Date.now() - lastFlushAt >= DELTA_FLUSH_MS
          ) {
            await flushDelta();
          }
          continue;
        }

        await flushDelta();

        if (event.type === "usage.updated") {
          const usage = event.payload as UsageUpdatedPayload;
          inputTokens = usage.inputTokens;
          outputTokens = usage.outputTokens;
          await this.appendEvent(run.id, ++sequence, event);
          continue;
        }

        if (event.type === "message.completed") {
          content = (event.payload as MessageCompletedPayload).content;
          continue;
        }

        if (event.type === "run.completed") {
          await this.finishRun(run.id, ++sequence, "completed", content, {
            inputTokens,
            outputTokens,
          });
          terminal = true;
          break;
        }

        if (event.type === "run.failed") {
          const failure = event.payload as RunFailedPayload;
          await this.finishRun(run.id, ++sequence, "failed", content, {
            errorCode: failure.code,
            errorMessage: failure.message,
            inputTokens,
            outputTokens,
          });
          terminal = true;
          break;
        }

        if (event.type === "run.cancelled") {
          await this.finishRun(run.id, ++sequence, "cancelled", content, {
            inputTokens,
            outputTokens,
          });
          terminal = true;
          break;
        }

        await this.appendEvent(run.id, ++sequence, event);
      }

      if (!terminal) {
        await flushDelta();
        await this.finishRun(run.id, ++sequence, "failed", content, {
          errorCode: "RUN_STALLED",
          errorMessage: "对话生成未正常结束",
          inputTokens,
          outputTokens,
        });
      }
    } catch (error) {
      this.logger.error(`Chat run ${run.id} failed`, error);
      try {
        await this.finishRun(run.id, ++sequence, "failed", content, {
          errorCode: "INTERNAL_ERROR",
          errorMessage: "对话生成失败，请稍后重试",
          inputTokens,
          outputTokens,
        });
      } catch (finishError) {
        this.logger.error(`Failed to persist terminal state for chat run ${run.id}`, finishError);
      }
    }
  }

  private async loadConversation(
    conversationId: string,
  ): Promise<{ projectId: string; ownerId: string | null }> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("project_id, owner_id")
      .eq("id", conversationId)
      .single();
    if (error) throw error;
    return { projectId: data.project_id, ownerId: data.owner_id };
  }

  private async loadInput(conversationId: string): Promise<ConversationInputItem[]> {
    const { data, error } = await this.supabase
      .from("messages")
      .select("role, content, position")
      .eq("conversation_id", conversationId)
      .eq("status", "completed")
      .order("position", { ascending: true });
    if (error) throw error;

    const items = data.map((message) => ({
      role: message.role,
      content: this.readTextContent(message.content),
    }));
    const selected: ConversationInputItem[] = [];
    let chars = 0;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (!item) continue;
      if (selected.length > 0 && chars + item.content.length > MAX_CONTEXT_CHARS) break;
      selected.push(item);
      chars += item.content.length;
    }
    return selected.reverse();
  }

  private readTextContent(content: Json): string {
    if (typeof content !== "object" || content === null || Array.isArray(content)) return "";
    const parts = content.parts;
    if (!Array.isArray(parts)) return "";
    const first = parts[0];
    if (typeof first !== "object" || first === null || Array.isArray(first)) return "";
    return typeof first.text === "string" ? first.text : "";
  }

  private async appendEvent(runId: string, sequence: number, event: AgentEvent): Promise<void> {
    const { error } = await this.supabase.rpc("append_chat_event", {
      p_payload: this.toJson(event.payload),
      p_run_id: runId,
      p_sequence: sequence,
      p_type: event.type,
    });
    if (error) throw error;
  }

  private async finishRun(
    runId: string,
    sequence: number,
    status: "completed" | "failed" | "cancelled",
    content: string,
    details: {
      errorCode?: string;
      errorMessage?: string;
      inputTokens?: number;
      outputTokens?: number;
    },
  ): Promise<void> {
    const { error } = await this.supabase.rpc("finish_chat_run", {
      p_content: content,
      p_error_code: details.errorCode,
      p_error_message: details.errorMessage,
      p_input_tokens: details.inputTokens,
      p_output_tokens: details.outputTokens,
      p_run_id: runId,
      p_sequence: sequence,
      p_status: status,
    });
    if (error) throw error;
  }

  private parseClaimedRun(value: Json): AgentRunRow | null {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    if (typeof value.id !== "string" || typeof value.conversation_id !== "string") {
      throw new Error("Invalid claimed chat run payload");
    }
    return value as unknown as AgentRunRow;
  }

  private toJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value)) as Json;
  }
}
