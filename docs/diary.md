### 2026-04-09

- 🥳 wex-agent初始化
- ✨ 修改了 `package.json`：显式声明 `packageManager` 字段为 `pnpm@10.23.0`
- ✨ 新增 `.vscode/launch.json` 调试配置，支持 REPL、带 prompt、pipe 三种模式调试 `src/cli.ts`

### 2026-04-10

- ✨ 新增 `src/slash-commands.ts`：斜杠命令系统，定义 `/clear`、`/cost`、`/exit` 命令，支持交互式选择菜单（上下箭头选择、Enter 确认、Esc 取消）
- ♻️ 重构 `src/repl.ts`：从 `readline.question` 改为 raw mode 逐字符输入，输入 `/` 时自动弹出命令选择菜单
- 🔧 修复 `src/repl.ts` 中文退格问题：新增 `charWidth()` 函数判断字符显示宽度，backspace 时按实际列宽擦除，解决 CJK 字符只能删一半的 bug
