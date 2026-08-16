import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type MessageEvent,
} from "@nestjs/common";
import type {
  AgentEvent,
  AgentEventType,
  AgentRunResponse,
  ChatMessageResponse,
  ConversationListResponse,
  ConversationResponse,
  CreateConversationRequest,
  MessageContentV1,
  MessageListResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "@wex/contracts";
import type { Database, Json, SupabaseServerClient } from "@wex/database";
import { Observable } from "rxjs";
import { SUPABASE_CLIENT } from "../database/database.constants.js";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type AgentRunRow = Database["public"]["Tables"]["agent_runs"]["Row"];
type AgentEventRow = Database["public"]["Tables"]["agent_events"]["Row"];
type ConversationView = Pick<
  ConversationRow,
  "id" | "project_id" | "title" | "status" | "last_message_at" | "created_at" | "updated_at"
>;
type AgentRunView = Pick<
  AgentRunRow,
  | "id"
  | "conversation_id"
  | "user_message_id"
  | "assistant_message_id"
  | "status"
  | "model_alias"
  | "created_at"
  | "started_at"
  | "completed_at"
>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL_EVENT_TYPES = new Set(["run.completed", "run.failed", "run.cancelled"]);
const CONVERSATION_COLUMNS =
  "id, project_id, title, status, last_message_at, created_at, updated_at";
const MESSAGE_COLUMNS =
  "id, conversation_id, run_id, client_message_id, role, status, content, position, error, created_at, completed_at";
const RUN_COLUMNS =
  "id, conversation_id, user_message_id, assistant_message_id, status, model_alias, created_at, started_at, completed_at";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseServerClient,
  ) {}

  async listConversations(projectId: string): Promise<ConversationListResponse> {
    this.assertUuid(projectId, "项目 ID");
    const { data, error } = await this.supabase
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) this.throwDatabaseError("list conversations", error);
    return data.map((row) => this.mapConversation(row));
  }

  async createConversation(projectId: string, body: unknown): Promise<ConversationResponse> {
    this.assertUuid(projectId, "项目 ID");
    const input = this.parseCreateConversation(body);
    const { data: project, error: projectError } = await this.supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) this.throwDatabaseError("find project for conversation", projectError);
    if (!project) throw new NotFoundException("项目不存在");

    const { data, error } = await this.supabase
      .from("conversations")
      .insert({ project_id: projectId, title: input.title })
      .select(CONVERSATION_COLUMNS)
      .single();
    if (error) this.throwDatabaseError("create conversation", error);
    return this.mapConversation(data);
  }

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    this.assertUuid(conversationId, "会话 ID");
    const { data, error } = await this.supabase
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("id", conversationId)
      .maybeSingle();
    if (error) this.throwDatabaseError("get conversation", error);
    if (!data) throw new NotFoundException("会话不存在");
    return this.mapConversation(data);
  }

  async listMessages(
    conversationId: string,
    beforeValue?: string,
    limitValue?: string,
  ): Promise<MessageListResponse> {
    this.assertUuid(conversationId, "会话 ID");
    const before = this.parsePositiveInteger(beforeValue, "before");
    const limit = Math.min(this.parsePositiveInteger(limitValue, "limit") ?? 50, 100);

    let query = this.supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .order("position", { ascending: false })
      .limit(limit + 1);
    if (before !== undefined) query = query.lt("position", before);

    const [{ data: messages, error: messagesError }, { data: activeRun, error: runError }] =
      await Promise.all([
        query,
        this.supabase
          .from("agent_runs")
          .select(RUN_COLUMNS)
          .eq("conversation_id", conversationId)
          .in("status", ["queued", "running", "cancelling"])
          .maybeSingle(),
      ]);
    if (messagesError) this.throwDatabaseError("list messages", messagesError);
    if (runError) this.throwDatabaseError("find active run", runError);

    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).reverse();
    return {
      items: page.map((row) => this.mapMessage(row)),
      nextBefore: hasMore && page[0] ? page[0].position : null,
      activeRun: activeRun ? this.mapRun(activeRun) : null,
    };
  }

  async sendMessage(conversationId: string, body: unknown): Promise<SendMessageResponse> {
    this.assertUuid(conversationId, "会话 ID");
    const input = this.parseSendMessage(body);
    const { data, error } = await this.supabase.rpc("create_chat_run", {
      p_client_message_id: input.clientMessageId,
      p_content: input.content as unknown as Json,
      p_conversation_id: conversationId,
    });
    if (error) this.throwChatRunError(error);
    const ids = this.parseCreatedRun(data);

    const [userMessage, assistantMessage, run] = await Promise.all([
      this.getMessage(ids.userMessageId),
      this.getMessage(ids.assistantMessageId),
      this.getRun(ids.runId),
    ]);
    return {
      userMessage,
      assistantMessage,
      run,
      eventsUrl: `/api/agent-runs/${run.id}/events`,
    };
  }

  streamEvents(runId: string, lastEventId?: string): Observable<MessageEvent> {
    this.assertUuid(runId, "Run ID");
    const initialCursor = this.parsePositiveInteger(lastEventId, "Last-Event-ID") ?? 0;

    return new Observable<MessageEvent>((subscriber) => {
      let cursor = initialCursor;
      let polling = false;
      let closed = false;

      const poll = async (): Promise<void> => {
        if (polling || closed) return;
        polling = true;
        try {
          const { data, error } = await this.supabase
            .from("agent_events")
            .select("id, run_id, sequence, type, payload, created_at")
            .eq("run_id", runId)
            .gt("sequence", cursor)
            .order("sequence", { ascending: true });
          if (error) throw error;

          for (const row of data) {
            cursor = row.sequence;
            subscriber.next(this.toSseEvent(row));
            if (TERMINAL_EVENT_TYPES.has(row.type)) {
              closed = true;
              subscriber.complete();
              break;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to stream events for run ${runId}`, error);
          closed = true;
          subscriber.error(new InternalServerErrorException("读取对话事件失败"));
        } finally {
          polling = false;
        }
      };

      void poll();
      const pollTimer = setInterval(() => void poll(), 200);
      const heartbeatTimer = setInterval(() => {
        if (!closed) subscriber.next({ type: "heartbeat", data: {} });
      }, 15_000);

      return () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
      };
    });
  }

  private async getMessage(messageId: string): Promise<ChatMessageResponse> {
    const { data, error } = await this.supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("id", messageId)
      .single();
    if (error) this.throwDatabaseError("get message", error);
    return this.mapMessage(data);
  }

  private async getRun(runId: string): Promise<AgentRunResponse> {
    const { data, error } = await this.supabase
      .from("agent_runs")
      .select(RUN_COLUMNS)
      .eq("id", runId)
      .single();
    if (error) this.throwDatabaseError("get agent run", error);
    return this.mapRun(data);
  }

  private parseCreateConversation(body: unknown): CreateConversationRequest {
    if (body === undefined || body === null) return { title: "新对话" };
    if (typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("请求体必须是 JSON 对象");
    }
    const title = (body as { title?: unknown }).title;
    if (title === undefined) return { title: "新对话" };
    if (typeof title !== "string") throw new BadRequestException("会话标题必须是字符串");
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new BadRequestException("会话标题长度必须为 1 到 100 个字符");
    }
    return { title: trimmed };
  }

  private parseSendMessage(body: unknown): SendMessageRequest {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new BadRequestException("请求体必须是 JSON 对象");
    }
    const { clientMessageId, content } = body as Record<string, unknown>;
    if (typeof clientMessageId !== "string" || !UUID_PATTERN.test(clientMessageId)) {
      throw new BadRequestException("clientMessageId 格式无效");
    }
    const parsedContent = this.parseMessageContent(content);
    return { clientMessageId, content: parsedContent };
  }

  private parseMessageContent(value: unknown): MessageContentV1 {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new BadRequestException("消息内容格式无效");
    }
    const content = value as { schemaVersion?: unknown; parts?: unknown };
    if (
      content.schemaVersion !== 1 ||
      !Array.isArray(content.parts) ||
      content.parts.length !== 1
    ) {
      throw new BadRequestException("消息内容格式无效");
    }
    const part = content.parts[0];
    if (
      typeof part !== "object" ||
      part === null ||
      Array.isArray(part) ||
      (part as { type?: unknown }).type !== "text" ||
      typeof (part as { text?: unknown }).text !== "string"
    ) {
      throw new BadRequestException("Phase 1 只支持文本消息");
    }
    const text = (part as { text: string }).text.trim();
    if (text.length < 1 || text.length > 20_000) {
      throw new BadRequestException("消息长度必须为 1 到 20000 个字符");
    }
    return { schemaVersion: 1, parts: [{ type: "text", text }] };
  }

  private parseCreatedRun(value: Json): {
    userMessageId: string;
    assistantMessageId: string;
    runId: string;
  } {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new InternalServerErrorException("创建对话任务响应无效");
    }
    const userMessageId = value.userMessageId;
    const assistantMessageId = value.assistantMessageId;
    const runId = value.runId;
    if (
      typeof userMessageId !== "string" ||
      typeof assistantMessageId !== "string" ||
      typeof runId !== "string"
    ) {
      throw new InternalServerErrorException("创建对话任务响应无效");
    }
    return { userMessageId, assistantMessageId, runId };
  }

  private mapConversation(row: ConversationView): ConversationResponse {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      status: row.status,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMessage(row: MessageRow): ChatMessageResponse {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      runId: row.run_id,
      clientMessageId: row.client_message_id,
      role: row.role,
      status: row.status,
      content: this.readMessageContent(row.content),
      position: row.position,
      error: this.readMessageError(row.error),
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  private mapRun(row: AgentRunView): AgentRunResponse {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userMessageId: row.user_message_id,
      assistantMessageId: row.assistant_message_id,
      status: row.status,
      modelAlias: row.model_alias,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  private readMessageContent(value: Json): MessageContentV1 {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const parts = value.parts;
      if (value.schemaVersion === 1 && Array.isArray(parts) && parts.length === 1) {
        const part = parts[0];
        if (
          typeof part === "object" &&
          part !== null &&
          !Array.isArray(part) &&
          part.type === "text" &&
          typeof part.text === "string"
        ) {
          return { schemaVersion: 1, parts: [{ type: "text", text: part.text }] };
        }
      }
    }
    return { schemaVersion: 1, parts: [{ type: "text", text: "" }] };
  }

  private readMessageError(value: Json | null): { code: string; message: string } | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return typeof value.code === "string" && typeof value.message === "string"
      ? { code: value.code, message: value.message }
      : null;
  }

  private toSseEvent(row: AgentEventRow): MessageEvent {
    const envelope: AgentEvent = {
      id: row.id,
      runId: row.run_id,
      sequence: row.sequence,
      type: row.type as AgentEventType,
      createdAt: row.created_at,
      payload: row.payload,
    };
    return { id: String(row.sequence), type: row.type, data: envelope };
  }

  private parsePositiveInteger(value: string | undefined, name: string): number | undefined {
    if (value === undefined || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${name} 必须是非负整数`);
    }
    return parsed;
  }

  private assertUuid(value: string, name: string): void {
    if (!UUID_PATTERN.test(value)) throw new BadRequestException(`${name} 格式无效`);
  }

  private throwChatRunError(error: { message: string }): never {
    if (error.message.includes("CONVERSATION_BUSY")) {
      throw new ConflictException({ code: "CONVERSATION_BUSY", message: "当前会话正在生成回复" });
    }
    if (error.message.includes("CONVERSATION_NOT_FOUND")) {
      throw new NotFoundException("会话不存在");
    }
    if (error.message.includes("INVALID_MESSAGE_CONTENT")) {
      throw new BadRequestException("消息内容格式无效");
    }
    this.throwDatabaseError("create chat run", error);
  }

  private throwDatabaseError(operation: string, error: { message: string }): never {
    this.logger.error(`Failed to ${operation}`, error);
    throw new InternalServerErrorException("聊天服务暂时不可用");
  }
}
