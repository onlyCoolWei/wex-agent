# Project Workspace Design 项目工作区设计

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project 工作区、Chat/Preview 面板、移动端切换或 Preview 呈现状态
Applies to: `/projects/:projectId` 的组合页面、布局和交互

## Related

- Business: `docs/business/projects.md`
- Business: `docs/business/conversations-and-agent-runs.md`
- Technical: `docs/technical/architecture-roadmap.md`
- Architecture: `ARCHITECTURE.md`
- Design system: `DESIGN.md`

## Purpose

本文定义用户进入 Project 后，Projects、Conversations、Agent Runs 与 Preview 占位如何组合为一个工作界面。业务规则分别由 [`../business/projects.md`](../business/projects.md) 和 [`../business/conversations-and-agent-runs.md`](../business/conversations-and-agent-runs.md) 负责；本文只拥有页面结构、交互反馈和响应式表现。

## 1. 用户目标

- 用户在一个稳定工作区中描述需求，并在真实 Preview 能力接入后查看网站产物。
- Chat 负责表达意图、进度、错误和恢复操作。
- Preview 区域当前负责准确表达占位状态，不把静态示例或聊天回复伪装成真实网站。
- 桌面端支持同时查看 Chat 与 Preview，移动端支持在两者间切换且不丢状态。

## 2. 当前页面结构

Project 工作区路由为 `/projects/:projectId`，占满当前视口：

```text
Desktop
+---------------- Chat ----------------+|+------------- Preview -------------+
| 返回工作台 / Conversation 状态      ||| Preview header                    |
| 消息历史与流式回复                  ||| 当前为等待指令占位                 |
| 输入框与发送                        |||                                  |
+-------------------------------------+|+----------------------------------+
                    可拖拽分隔条

Mobile
+-------------------------------------+
| 返回工作台       Chat / Preview     |
+-------------------------------------+
| 当前选中的单个面板                  |
+-------------------------------------+
```

桌面端 Chat 宽度限制为 320-640px，并保存在 `localStorage`；移动端用 Chat / Preview 标签切换。

## 3. 当前能力

### 已实现

- Project 工作区全视口双栏布局。
- 桌面端可用指针或键盘调整 Chat 宽度，并保存上次宽度。
- 移动端一次展示 Chat 或 Preview，切换时保留同一页面组件状态。
- Chat 提供加载、空对话、发送中、流式、重连和失败状态。
- Preview 面板具备 idle、starting、ready、error 的展示组件。

### 已定义未闭环

- Preview 的状态模型和静态示例已存在，但 Project 页面当前从 `idle` 开始，没有业务事件将其切换为真实 `ready`。
- `GeneratedSitePreview` 是展示用静态组件，不是 Agent 生成结果。
- 刷新 Preview 的按钮当前没有可用运行环境；idle 状态下不会启动真实预览。

### 暂不支持

- Project 与 Sandbox Workspace 的生命周期绑定。
- Agent 文件、Shell、Build/Test 和 Preview Tool。
- iframe Preview URL、刷新、断线恢复和新窗口打开。
- 文件树、代码编辑器、版本历史、发布和响应式视口切换。
- Chat 中的 Tool Call、构建日志、审批请求和 Artifact 展示。

## 4. 当前交互规则

### Chat

- 进入 Project 后自动取得最近活跃 Conversation，没有则创建。
- 初始空状态提供少量提示，但提示只能触发当前文本对话能力。
- `Enter` 发送，`Shift + Enter` 换行；输入法组合期间不得误发送。
- active Run 存在时输入和发送禁用，等待当前回复终止。
- 加载失败保留工作区结构并提供重试；发送失败恢复原输入。

### Preview

- idle 文案只能表达“等待第一个指令”和未来出现位置，不能声称网站已经生成。
- starting 只能在真实 Sandbox/Preview 启动动作发生后使用。
- ready 只能在可访问的 Preview 资源已就绪后使用。
- error 必须说明预览链路失败，并在存在真实重试操作时提供重试。
- 静态 `GeneratedSitePreview` 不能作为产品数据，也不能根据聊天完成事件直接展示为用户生成网站。

### 响应式

- 桌面双栏调整不得把 Chat 压缩到 320px 以下，也必须给 Preview 留出可用空间。
- 移动端只切换可见面板，不应卸载并丢失输入、消息连接或 Preview 状态。
- 输入区处理底部安全区，页面根容器不产生横向滚动。

## 5. 能力表达边界

本文不定义 Sandbox、Artifact 或真实 Preview 的业务生命周期和技术方案。当前只能依据已有业务能力展示占位；接入真实 Preview 前，必须先在业务文档中定义权威状态和用户操作，再在技术文档中定义资源、权限和失败语义，最后由本文补充对应页面表现。

## 6. 设计约束

- Project 工作区是 UI 容器，不是 Sandbox 已存在的证明。
- Chat 回复完成不等于网站构建成功，Run 状态与 Preview 状态必须独立建模。
- Preview ready 必须对应当前 Project 的真实、可访问、受隔离运行结果。
- Project 切换时不能展示上一个 Project 的 Preview URL、日志或文件。
- 移动端切换和桌面拖拽只改变呈现，不改变服务端业务状态。

## 7. 修改影响检查

- UI 文案是否准确反映当前能力，没有把占位描述成真实生成。
- 新 Preview 状态是否有明确触发者、权威来源、失败和恢复路径。
- Project 离开、删除、刷新和切换时是否正确清理连接与临时资源。
- 桌面和窄屏是否都能完成相同核心任务。

## 8. 验收基线

- 工作区在桌面端无页面级溢出，Chat 与 Preview 都保有可用最小尺寸。
- 移动端可以切换面板且不丢失未发送输入和当前消息状态。
- Chat 的加载、空、发送、重连和错误状态不导致布局跳变。
- 当前占位 Preview 不会被误解为用户生成的网站。
- 引入真实 Preview 时，本文必须基于已经定义的业务状态补充 ready、失败和恢复表现。

## 9. 实现定位

- 页面容器：`apps/web/src/pages/project/project-page.tsx`
- Chat：`apps/web/src/pages/project/chat-panel.tsx`
- Preview 状态：`apps/web/src/pages/project/preview-panel.tsx`
- 静态示例：`apps/web/src/pages/project/generated-site-preview.tsx`
- Sandbox 边界：`packages/sandbox/src/index.ts`
