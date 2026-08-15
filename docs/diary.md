### 2026-08-15

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
