# Supabase 接入

当前项目通过服务端 `@supabase/supabase-js` 访问 Supabase。高权限 key 只在 API/Worker 的服务端环境中使用，不应进入 `apps/web`、浏览器代码或 Git。

## 1. 创建项目并取得凭据

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)，创建一个项目。
2. 打开项目的 **Connect** 或 **Settings -> API Keys**。
3. 将项目 URL 填入 `SUPABASE_URL`。
4. 为服务端创建并填写 `SUPABASE_SECRET_KEY`（`sb_secret_...`）。旧项目也可以暂时使用 `SUPABASE_SERVICE_ROLE_KEY`。

在仓库根目录执行：

```bash
cp .env.example .env
```

编辑 `.env` 后，不要提交它。`.gitignore` 已经忽略 `.env`。

Supabase 的 secret/service-role key 会绕过 Row Level Security，只能放在 API、Worker、定时任务等受控服务端组件中。浏览器端只能使用 publishable/anon key，并且仍应配置 RLS。

## 2. 应用数据库 migration

先安装 Supabase CLI。macOS 可以使用：

```bash
brew install supabase/tap/supabase
```

也可以按[官方文档](https://supabase.com/docs/guides/local-development/cli/getting-started)将 CLI 安装为项目开发依赖，然后使用 `pnpm exec supabase`。

登录并关联远程项目：

```bash
supabase init
supabase login
supabase link --project-ref <project-ref>
```

`project-ref` 是 Dashboard URL 中 `/project/` 后面的部分。

先预览，再推送 migration：

```bash
supabase db push --dry-run
supabase db push
```

这会创建 `public.health_check()`，API 的数据库健康检查依赖这个函数。

## 3. 启动并验证

```bash
pnpm dev:api
```

另一个终端请求：

```bash
curl http://localhost:3001/api/health/database
```

成功响应类似：

```json
{
  "service": "supabase",
  "status": "ok",
  "latencyMs": 120,
  "timestamp": "2026-08-15T00:00:00.000Z"
}
```

常见错误：

- `Missing SUPABASE_URL`：没有创建根目录 `.env`，或没有填写项目 URL。
- `Missing SUPABASE_SECRET_KEY`：没有填写服务端 secret key。
- `function health_check() does not exist`：还没有执行 `supabase db push`，或关联了错误的项目。
- `401` / `Invalid API key`：key 复制错误、已被轮换，或使用了不匹配的项目 URL。

## 4. 后续 schema 开发

后续新增表时使用 migration：

```bash
supabase migration new create_agent_runs
```

编辑生成的 SQL，先在本地 Supabase 验证，再通过 `supabase db push` 推到远程项目。可以根据远程 schema 生成 TypeScript 类型：

```bash
supabase gen types typescript --linked > packages/database/src/database.types.ts
```

生成类型后，再将 `createClient` 改为 `SupabaseClient<Database>`，让表名、字段和查询结果获得静态类型检查。
