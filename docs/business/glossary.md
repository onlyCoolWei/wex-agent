# Wex Agent 业务术语表

Status: Current
Last verified: 2026-08-26
Read when: 修改业务名词、模块名称、状态名称或跨文档术语
Applies to: 产品、业务文档、代码和交互中的稳定术语

## Related

- Business index: `docs/business/README.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

本文统一产品、业务文档、代码和交互中的核心用词。同一个概念只使用一个主名称；新增相近名词前应先确认是否已经存在。

| 术语                    | 唯一定义                                                           | 不代表什么                                            |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Wex                     | 产品品牌，也是当前面向用户的主 Agent 名称                          | 不是某个模型供应商或 SDK                              |
| 访客                    | 没有有效 Supabase Session 的访问者                                 | 不是可以访问匿名 Project 的用户角色                   |
| 用户（User）            | 通过 Supabase Auth 建立身份的个人使用者                            | 当前不包含团队成员、管理员等业务角色                  |
| Session                 | Supabase Auth 建立并由 Web 恢复、刷新的登录会话                    | 不是 Conversation，也不是 Agent Run                   |
| 工作台（Workbench）     | `/workspace` 页面，用户查看和创建 Project 的入口                   | 不是 Sandbox 中的文件工作目录                         |
| Project                 | 用户围绕一个网站目标持续创作的顶层业务对象                         | 不是一次聊天、一次 Run 或一个浏览器页面状态           |
| Project 工作区          | `/projects/:projectId` 对应的产品页面，由 Chat 与 Preview 面板组成 | 不等同于已创建 Sandbox Workspace                      |
| Conversation            | Project 内按顺序组织 Message 的对话容器                            | 不是一次模型调用；一次 Conversation 可以包含多个 Run  |
| Message                 | Conversation 中用户或 assistant 的持久化内容                       | 流式 delta 不是独立 Message                           |
| User Message            | 用户提交且通过业务校验的输入消息                                   | 浏览器中的乐观占位不是最终权威记录                    |
| Assistant Message       | 与一次 Run 关联的 Wex 回复记录                                     | 不保证成功；可能处于 streaming、failed 或 cancelled   |
| Agent Run               | 为一个 User Message 生成一个 Assistant Message 的持久化执行记录    | 不是 Conversation，也不是 Worker 进程                 |
| Agent Event             | Run 内按 sequence 排序、可回放的状态或内容事件                     | SSE 连接不是事件的唯一来源                            |
| Wex Agent / `main-chat` | 当前负责多轮文本回复的 Agent 配置                                  | 当前不是 Coding Agent，不能操作文件、Shell 或 Preview |
| Agent Runtime           | 将稳定业务输入转换为 Agent Event 的 SDK 适配和执行边界             | 不负责浏览器交互或 Project CRUD                       |
| Worker                  | 领取并执行 queued Run 的后台进程                                   | 不是对外 HTTP API                                     |
| Model Alias             | Wex 保存和使用的稳定模型名称，例如 `gpt-5.6-luna`                  | 不一定是上游供应商的真实部署名                        |
| Sandbox                 | 隔离运行不可信代码的能力边界                                       | 当前尚未实现，也不是 Preview 占位面板                 |
| Sandbox Workspace       | Sandbox 内与 Project 关联的文件和进程环境                          | 不要简称为“工作台”，避免与 `/workspace` 混淆          |
| Preview                 | 展示 Sandbox 中网站运行结果的产品能力                              | 当前 UI 占位不等于真实 Preview 已接入                 |
| 乐观消息                | Web 在 API 成功前临时插入的 User Message                           | 失败时必须撤销，不能成为业务权威数据                  |
| 活跃 Run                | 状态为 `queued`、`running` 或 `cancelling` 的 Run                  | `waiting_for_approval` 等预留状态当前不属于聊天闭环   |

## 命名约束

- 面向用户使用“项目”“对话”“回复”；技术上下文可以使用 Project、Conversation、Message、Run。
- 只有真正执行模型任务的记录叫 Run，页面加载或 API 请求不要命名为 Run。
- “状态”必须带所属对象，例如 Project 状态、Message 状态、Run 状态，避免只写模糊的 `status`。
- 讨论“Workspace”时必须说明是产品工作台、Project 工作区还是 Sandbox Workspace。
- “已生成网站”“预览就绪”“已修改代码”等表达，只能在 Sandbox 与真实产物链路成功后使用。
