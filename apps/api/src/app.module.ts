import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { DatabaseModule } from "./database/database.module.js";

@Module({
  controllers: [AppController],
  imports: [DatabaseModule],
})
export class AppModule {}
