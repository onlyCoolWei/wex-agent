import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Sse,
  type MessageEvent,
} from "@nestjs/common";
import type {
  ConversationListResponse,
  ConversationResponse,
  MessageListResponse,
  SendMessageResponse,
} from "@wex/contracts";
import type { Observable } from "rxjs";
import { ChatService } from "./chat.service.js";

@Controller()
export class ChatController {
  constructor(
    @Inject(ChatService)
    private readonly chatService: ChatService,
  ) {}

  @Get("projects/:projectId/conversations")
  listConversations(@Param("projectId") projectId: string): Promise<ConversationListResponse> {
    return this.chatService.listConversations(projectId);
  }

  @Post("projects/:projectId/conversations")
  createConversation(
    @Param("projectId") projectId: string,
    @Body() body?: unknown,
  ): Promise<ConversationResponse> {
    return this.chatService.createConversation(projectId, body);
  }

  @Get("conversations/:conversationId")
  getConversation(@Param("conversationId") conversationId: string): Promise<ConversationResponse> {
    return this.chatService.getConversation(conversationId);
  }

  @Get("conversations/:conversationId/messages")
  listMessages(
    @Param("conversationId") conversationId: string,
    @Query("before") before?: string,
    @Query("limit") limit?: string,
  ): Promise<MessageListResponse> {
    return this.chatService.listMessages(conversationId, before, limit);
  }

  @Post("conversations/:conversationId/messages")
  sendMessage(
    @Param("conversationId") conversationId: string,
    @Body() body: unknown,
  ): Promise<SendMessageResponse> {
    return this.chatService.sendMessage(conversationId, body);
  }

  @Sse("agent-runs/:runId/events")
  events(
    @Param("runId") runId: string,
    @Headers("last-event-id") lastEventId?: string,
  ): Observable<MessageEvent> {
    return this.chatService.streamEvents(runId, lastEventId);
  }
}
