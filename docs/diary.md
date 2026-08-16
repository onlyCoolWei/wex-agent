### 2026-08-16

- 🔧 修复 Worker 对话处理器在 tsx 开发启动下类依赖元数据缺失导致 Agent Runtime 未注入的问题
- 🔧 优化前端对话页移动端适配，修复双栏宽度残留与消息区高度塌陷，并完善安全区和窄屏输入体验
- ✨ 完成对话 Agent Phase 1，打通 gpt-5.6-luna、消息持久化、Worker 队列与 SSE 流式聊天链路。
- 🔧 完成 OpenAI Agents SDK + LiteLLM Phase 1 接入，统一多 Agent 配置与模型管理，补齐流式 Runtime、事件契约、本地网关及合约测试。
- 🔧 制定并收敛了 OpenAI Agents SDK 基于 LiteLLM 单一网关与 Chat Completions 通道的接入方案，同时调整了 Tailwind 配置以保留任意值工具类写法。
- ✨ 完善 Project 工作台管理闭环，接入真实列表、响应式状态视图、删除 API 与二次确认，并同步补全技术方案

### 2026-08-15

- ✨ 打通 Project 创建与 Supabase 持久化链路，完善工作台真实创建交互，并修复 NestJS 注入与开发日记收尾兼容问题
- ✨ 新增创建 Project 与 Supabase 持久化联动技术方案，明确数据模型、API 契约、前端流程与鉴权边界
- 🔧 精简开发日记 Stop hook 提示，减少任务收尾 token 消耗
- ✨ 接入 code-inspector-plugin，支持开发环境点击页面元素定位源码
- 🔧 修复项目工作台超出视口并产生底部空白的问题
- 🔧 按主页、工作台和项目功能域拆分 Web 应用入口，建立可扩展的页面模块结构
- 🔧 将 Web 界面样式迁移为 Tailwind utility class，并保留原有视觉语言
- ✨ 接入 shadcn/ui 基础组件，并保持现有 Web 界面视觉风格
- 🔧 接入 Prettier、保存时格式化与提交前暂存文件自动格式化
- ✨ 新增 Web 建站功能 UI 布局文档，定义首页、工作台、项目双栏编辑器、响应式策略与 MVP 验收标准
- ✨ 新增 Codex Stop hook，在任务完成后按日期和变更类型自动更新开发日记
- ✨ 接入 Supabase 服务端客户端、NestJS 数据库模块、健康检查接口与 migration，并补充连接指南
- 🔧 新增 `deps`、`graph`、`plan` 短命令，简化 Monorepo 依赖和任务图查看

### 2026-04-09

- 🥳 wex-agent初始化
- ✨ 修改了 `package.json`：显式声明 `packageManager` 字段为 `pnpm@10.23.0`
- ✨ 新增 `.vscode/launch.json` 调试配置，支持 REPL、带 prompt、pipe 三种模式调试 `src/cli.ts`

### 2026-04-10

- ✨ 新增 `src/slash-commands.ts`：斜杠命令系统，定义 `/clear`、`/cost`、`/exit` 命令，支持交互式选择菜单（上下箭头选择、Enter 确认、Esc 取消）
- ♻️ 重构 `src/repl.ts`：从 `readline.question` 改为 raw mode 逐字符输入，输入 `/` 时自动弹出命令选择菜单
- 🔧 修复 `src/repl.ts` 中文退格问题：新增 `charWidth()` 函数判断字符显示宽度，backspace 时按实际列宽擦除，解决 CJK 字符只能删一半的 bug
