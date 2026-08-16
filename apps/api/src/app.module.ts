import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { ChatModule } from "./chat/chat.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ProjectsModule } from "./projects/projects.module.js";

@Module({
  controllers: [AppController],
  imports: [DatabaseModule, ProjectsModule, ChatModule],
})
export class AppModule {}
