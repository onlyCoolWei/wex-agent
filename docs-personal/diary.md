### 2026-08-26

- 🔧 统一 Business、Design、Technical 模块主文档的英文文件名与一级标题，并新增文档名称一致性检查
- 🔧 按 Codex 优先格式统一技术文档，明确当前实现、架构边界、稳定契约、已知缺口、变更映射与验证入口
- 🔧 按 Codex 优先格式统一设计模块文档，收敛页面布局、状态、交互、响应式、可访问性与视觉验收基线
- 🔧 按 Codex 优先格式统一业务文档结构，补全当前能力、规则、不变量、边界场景、影响映射与验收清单
- 🔧 将统一术语表移至 `docs/glossary.md`，明确其跨 Business、Design 和 Technical 的语言层职责
- 🔧 按业务生命周期重整模块文档边界，统一 Identity、Projects、Conversations 主文档命名并将 Project Workspace 归为组合设计视图
- 🔧 统一 `docs/` 下正式文档的元信息和 Purpose 结构，并扩展 `check:docs` 覆盖所有项目文档
- 🎊 按文档体系方案落地根级 ARCHITECTURE.md、DESIGN.md、docs/design/ 和模块文档元信息，新增 check:docs 文档质量检查
- ✨ 确认模块文档按业务边界渐进拆分，明确 Conversation/Agent Run 合并、Preview 归入 Project 的当前策略
- ✨ 确认 Codex 文档读取触发条件、上下文控制、目录级规则和文档自动检查策略
- ✨ 确认模块和路径使用英文领域名、文档正文使用中文的语言与命名策略，并补充到文档体系提案
- ✨ 确认模块文档按业务边界渐进拆分，明确 Conversation/Agent Run 合并、Preview 归入 Project 的当前策略
- 🔧 将开发日记移动到 `docs-personal/diary.md`，并把它设为个人知识库中的规则维护例外
- 🔧 将个人知识库从 `docs/personal/` 抽离到根目录 `personal/`，让 `docs/` 专注于项目正式文档
- 🔧 将个人知识库命名为 `docs-personal/`，让它在根目录中紧邻 `docs/` 且保持默认隔离
- 🔧 同步文档体系草案中的目录树，明确 `docs-personal/` 位于根目录而非 `docs/` 内
- 🔧 精简文档体系讨论草案，移除重复的模块文档格式内容并统一链接到 Codex 文档格式规范
- ✨ 新增 Codex 优先的三类模块文档格式规范，明确业务文档只维护当前已确认功能和规则

### 2026-08-25

- 🔧 更新个人文档体系草案，确认正式知识集中管理、代码目录路标及根级 ARCHITECTURE.md 与 DESIGN.md 方案
- ✨ 新增业务、设计、技术三类文档体系的个人讨论草案，整理目录方案、关联规则与待确认问题
- ✨ 新增 CONTRIBUTING.md 作为开发协作快速入口，明确与 AGENTS.md、业务文档和详细治理规范的分工
- ✨ 将个人 Vibe Coding 方法论中的三层质量防线、业务规则写法与 ADR 机制落地到仓库协作规范
- 🔧 重组 docs 文档导航，分离业务、技术、交互与个人知识库，明确 Codex 默认忽略个人笔记
- ✨ 构建面向 Codex 的业务知识库，统一产品能力地图、术语、身份、项目、对话运行与预览规则
- ✨ 建立 Vibe Coding 协作质量守则，完善 Agent 修改边界、分层验证、业务文档模板与评审清单
- 🔧 移除认证页登录/注册模式切换，统一为自动识别账号状态的单一登录入口

### 2026-08-24

- 🔧 将注册确认流程从验证码输入改为 Supabase 默认确认邮件链接，兼容 Free 计划邮件模板限制

### 2026-08-23

- ✨ 补充注册登录业务交互文档，明确 Supabase Email/Password 验证码注册登录与 Google OAuth 回调流程
- ✨ 实现 Web 端 Supabase 登录注册闭环，接入验证码注册、Google OAuth 回调、会话路由保护与账户退出菜单
- 🔧 修复认证页 redirect 递归导致 URL 无限增长和 loading 卡住的问题，并为 Supabase 会话初始化增加超时兜底
- 🔧 合并前后端 Supabase 项目 URL 配置，统一使用 `SUPABASE_URL` 并通过 Vite 安全注入 Web 端
- 🔧 修复 Vite 未读取仓库根目录 `.env` 导致 Web 端认证配置被误判为缺失的问题
- 🔧 补充 Supabase Confirm signup OTP 邮件模板配置，避免继续发送默认确认链接

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
