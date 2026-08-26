# Project Workspace Design

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project 工作区、Chat/Preview 面板、分隔条、移动端切换或 Preview 状态
Applies to: `/projects/:projectId` 的组合页面、布局和交互

## Related

- Business: `docs/business/projects.md`
- Business: `docs/business/conversations-and-agent-runs.md`
- Technical: `docs/technical/conversations-and-agent-runs.md`
- Technical roadmap: `docs/technical/architecture-roadmap.md`
- Design system: `DESIGN.md`

## Design Contract

- 必须遵守根目录 `DESIGN.md`。
- 本文只定义 Projects、Conversations、Agent Runs 与 Preview 占位的组合页面。
- Project、Message 和 Run 规则以对应 Business 文档为准。
- 当前 Preview 只能表达占位，不得自行增加 Sandbox 或网站产物能力。

## User Goal

- 在稳定工作区中通过 Chat 持续描述和调整需求。
- 清楚看到消息加载、回复生成、重连和失败状态。
- 理解 Preview 当前尚无真实网站产物。
- 在 Desktop 同时查看两个面板，在 Mobile 切换面板且不丢状态。

## Layout

```text
Desktop
+---------------- Chat ----------------+|+------------- Preview -------------+
| Conversation header                 ||| Preview header                    |
| Message history and streamed reply  ||| Current placeholder state         |
| Composer                            |||                                  |
+-------------------------------------+|+----------------------------------+
                    Resizable separator

Mobile
+-------------------------------------+
| Back             Chat / Preview     |
+-------------------------------------+
| Selected panel                      |
+-------------------------------------+
```

| Viewport            | Layout                                         |
| ------------------- | ---------------------------------------------- |
| Mobile, `< 768px`   | 顶部返回和 Chat/Preview tabs，一次展示一个面板 |
| Desktop, `>= 768px` | Chat、键盘可操作分隔条和 Preview 双栏          |

## Regions

| Region          | Responsibility                    | Stable size                            |
| --------------- | --------------------------------- | -------------------------------------- |
| Mobile header   | 返回工作台和面板切换              | 52px + top safe area                   |
| Chat header     | 返回、Conversation 标题和连接状态 | 52px；Mobile 隐藏                      |
| Message list    | 历史消息、流式内容、空状态和错误  | Flexible                               |
| Composer        | 文本输入、模型标识和发送          | 56-120px input                         |
| Separator       | 调整 Chat 宽度                    | Desktop 1px line，9px pointer hit area |
| Preview header  | 面板名称、地址占位和刷新控件      | 52px                                   |
| Preview content | idle 或其他已触发的 Preview 状态  | Remaining space                        |

Desktop Chat 宽度为 320-640px，默认 460px，并保存在 `localStorage`。Preview 必须保留至少 440px 可用宽度。

## States

### Chat

| State        | Required UI                                       |
| ------------ | ------------------------------------------------- |
| Loading      | 固定消息区域中的进度指示                          |
| Load error   | “会话暂时无法加载”、错误说明和重试                |
| Empty        | 简短说明和只触发文本对话的建议操作                |
| Sending      | 保留乐观 User Message，禁用 Composer              |
| Streaming    | Assistant Message 增量文本和“回复中”状态          |
| Reconnecting | 保留消息并展示“正在重连”                          |
| Failed       | Assistant Message 错误、Composer 错误和可恢复输入 |

### Preview

| State      | Current exposure               | Required UI                                 |
| ---------- | ------------------------------ | ------------------------------------------- |
| `idle`     | Project 页面当前唯一入口状态   | “等待你的第一个指令”，不得暗示已生成网站    |
| `starting` | 组件支持，但没有真实启动事件   | 启动说明和明确进度                          |
| `ready`    | 组件支持静态示例，不是产品数据 | 只有真实 Preview 资源就绪后才能用于产品状态 |
| `error`    | 组件支持，但没有真实运行链路   | 错误说明；只有存在真实动作时才展示重试      |

## Interactions

### Chat

- `Enter` 发送，`Shift + Enter` 换行；输入法组合期间不得误发送。
- active Run 存在时禁用输入和发送。
- 点击空状态建议会提交对应文本，不得触发 Tool 或 Preview。
- 发送失败时撤销乐观消息并恢复原输入。
- 新消息和流式更新保持当前 Conversation 的末尾可见。

### Panels

- Desktop 分隔条支持 Pointer 拖拽。
- 分隔条获得焦点后，`ArrowLeft` / `ArrowRight` 每次调整 24px。
- 调整不得超出 Chat 320-640px，也不得侵占 Preview 的 440px 最小宽度。
- Mobile tabs 只改变可见面板，不改变业务状态。
- 切换面板不得卸载并丢失输入、消息连接或 Preview 状态。

### Preview

- idle 只能表达等待指令和未来内容位置。
- idle 中的刷新控件当前不执行操作，也不得进入静态 ready 状态。
- starting 只能由真实 Preview 启动动作触发。
- ready 必须对应当前 Project 的真实、可访问且受隔离运行结果。
- error 必须说明 Preview 链路失败，并只在存在真实重试动作时提供重试。

## Responsive

- Mobile 只展示当前 tab 对应面板，不把 Chat 与 Preview 并排压缩。
- Composer 必须处理底部 safe area。
- 页面根容器固定于动态视口，不得产生页面级或横向滚动。
- 长消息、错误和状态文案必须在各自面板内换行。
- Mobile 切换与 Desktop 拖拽不得改变服务端状态。

## Accessibility

- Mobile 面板切换必须使用 tablist、tab 和 `aria-selected`。
- Chat、Preview 和分隔条必须具有明确可访问名称。
- 分隔条必须暴露方向、最小值、最大值和当前值。
- 图标按钮必须提供 `aria-label` 和 tooltip。
- Loading、Streaming、Reconnecting 和 Error 不得只依赖颜色。
- Composer 和发送按钮必须有稳定标签和禁用状态。

## Prohibited

- 不把 Project 工作区或静态 Preview 示例描述成 Sandbox 已经存在。
- 不把 Chat 回复完成等同于网站构建或 Preview ready。
- 不根据聊天完成事件直接展示 `GeneratedSitePreview`。
- 不让没有真实运行环境的刷新控件制造 starting 或 ready 状态。
- 不展示没有真实能力支撑的打开新窗口或设备切换操作。
- 不在切换 Project 后保留上一个 Project 的 Preview、日志或文件。
- 不让面板切换、拖拽或动态消息造成重叠和页面跳动。

## Known UI Gaps

- Preview 刷新控件在 idle 状态仍显示为可操作，但当前点击没有反馈或状态变化。

## Code Map

- Page and panels: `apps/web/src/pages/project/project-page.tsx`
- Chat: `apps/web/src/pages/project/chat-panel.tsx`
- Preview states: `apps/web/src/pages/project/preview-panel.tsx`
- Static example: `apps/web/src/pages/project/generated-site-preview.tsx`

## Visual Acceptance

- [ ] Desktop 无页面级溢出，Chat 与 Preview 都保有最小可用宽度
- [ ] 分隔条支持 Pointer 和键盘调整，并准确暴露当前值
- [ ] Mobile 可以切换面板且不丢失未发送输入和消息状态
- [ ] Chat 的 Loading、Empty、Sending、Streaming、Reconnecting 和 Error 状态完整
- [ ] 动态消息、错误和 Composer 不造成布局跳动或重叠
- [ ] 当前 Preview 占位不会被误解为用户生成的网站
- [ ] 页面符合根目录 `DESIGN.md`
