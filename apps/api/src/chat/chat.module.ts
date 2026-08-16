import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  controllers: [ChatController],
  imports: [DatabaseModule],
  providers: [ChatService],
})
export class ChatModule {}
