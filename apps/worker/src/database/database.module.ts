import { Module } from "@nestjs/common";
import { createSupabaseServerClient, getSupabaseConfigFromEnv } from "@wex/database";
import { SUPABASE_CLIENT } from "./tokens.js";

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: () => createSupabaseServerClient(getSupabaseConfigFromEnv(process.env)),
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class DatabaseModule {}
