# Identity and Access 身份与访问业务规则

Status: Current
Last verified: 2026-08-26
Read when: 修改登录、注册、OAuth、Session、退出、redirect 或访问权限
Applies to: Web 身份入口和受保护产品页面

## Related

- Design: `docs/design/auth.md`
- Technical: `docs/technical/supabase.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

本文定义 Wex 的个人身份、登录流程和访问边界。详细页面文案与状态见 [`../design/auth.md`](../design/auth.md)，Supabase 配置见 [`../technical/supabase.md`](../technical/supabase.md)。

## 1. 业务目标

- 访客可以使用 Email/Password 或 Google 建立个人身份。
- 用户完成认证后回到原本想访问的站内页面。
- 未认证用户不能看到受保护页面的数据。
- 一个用户最终只能操作属于自己的 Project、Conversation、Message 和 Run。

最后一条是已确认的业务不变量，但服务端授权当前尚未闭环。

## 2. 当前能力

### 已实现

- 首页对所有人开放。
- `/workspace` 与 `/projects/:projectId` 在 Web 路由层要求有效 Session。
- Email/Password 使用单一表单：先尝试登录，凭证未知时再发起首次注册。
- 首次注册依赖 Supabase 邮箱确认链接，确认后通过 `/auth/callback` 建立 Session。
- Google OAuth 完成后通过同一回调页建立 Session。
- 合法的站内 `redirect` 会跨认证流程保存，成功后只跳转一次。
- 用户可以从账户菜单退出；会话失效后按未登录处理。

### 已定义未闭环

- API 请求尚未携带并验证用户 Access Token。
- Project 与 Conversation 的 `owner_id` 可为空，Project 列表和操作尚未按当前用户过滤。
- 数据表已启用 RLS，但服务端使用高权限客户端，实际隔离必须由 API 鉴权和查询条件保证。
- 因此当前实现适合单用户开发环境，不满足多用户生产授权要求。

### 暂不支持

- 找回密码、修改密码和修改邮箱。
- 个人资料、头像上传和账号删除。
- 团队、邀请、Project 成员和角色权限。
- 多账号切换和管理员后台。

## 3. 身份状态

| 状态       | 定义                                         | 允许行为                               |
| ---------- | -------------------------------------------- | -------------------------------------- |
| 确认中     | Web 正在恢复本地 Session                     | 保持稳定加载，不提前展示受保护数据     |
| 未登录     | 没有有效 Session                             | 浏览首页，进入认证页                   |
| 邮箱待确认 | 注册请求成功，但尚未通过确认链接建立 Session | 重发确认邮件、返回修改邮箱             |
| 已登录     | Session 有效且能取得 User                    | 进入工作台和 Project 页面              |
| 会话失效   | 原 Session 过期、撤销或恢复失败              | 清除登录态，重新认证并保留合法返回目标 |

## 4. 业务流程

### Email/Password

1. 用户输入规范化后的邮箱和至少 6 个字符的密码。
2. 系统先尝试密码登录。
3. 登录成功则建立 Session 并进入合法 `redirect`。
4. 凭证未知时发起注册；需要邮箱确认则展示查收邮件状态。
5. 用户点击确认链接进入 `/auth/callback`，交换 Session 后返回目标页面。

Supabase 不提供可靠的公开“账号是否存在”查询。交互可以自动分流，但错误信息不能向访客泄露精确账号状态。

### Google OAuth

1. 用户从认证页发起 Google 登录。
2. 系统在 `sessionStorage` 保存合法的站内返回目标。
3. Google 与 Supabase 完成授权后回到 `/auth/callback`。
4. 回调成功建立 Session，再清理临时目标并跳转。

### 退出和失效

- 退出必须调用 Supabase Auth 清理 Session，随后回到首页。
- 退出失败时不能假装已经退出，应展示错误并保留当前状态。
- 受保护页面检测到未登录时跳转认证页，并使用当前站内地址作为返回目标。

## 5. 业务不变量

- `redirect` 只能是站内绝对路径，不能以 `//` 开头，也不能循环指向认证路由。
- 密码、Token、Secret Key 和完整认证错误不得写入 URL、日志或业务数据。
- 浏览器只使用 publishable/anon key；Supabase secret/service-role key 只存在于受控服务端。
- 页面显示已登录不等于服务端已授权。任何业务数据 API 都必须独立验证身份和对象所有权。
- 不得通过不同错误文案确认某邮箱是否注册。
- Auth 加载期间不得闪现 Project 或对话等受保护内容。

## 6. 修改影响检查

涉及本领域时至少检查：

- 首页、认证页、回调页、工作台和 Project 页的跳转是否一致。
- Session 恢复、刷新、过期、退出失败和回调失败是否有确定行为。
- API 是否从已验证身份派生 `owner_id`，而不是接受客户端传入用户 ID。
- 查询、更新和删除是否同时限制资源 ID 与当前 `owner_id`。
- 新环境变量是否区分浏览器安全配置与服务端密钥。

## 7. 验收基线

- 未登录访问受保护地址时进入认证页，登录成功后返回原地址。
- 非法或认证路由形式的 `redirect` 回退 `/workspace`，不能外跳或递归增长。
- 首次邮箱用户收到确认链接；已有用户可直接密码登录。
- OAuth 和邮箱确认回调只完成一次跳转，并清理临时状态。
- Session 初始化期间不展示受保护数据。
- 完成服务端授权闭环后，用户不能读取或修改其他用户的任何业务对象。

## 8. 实现定位

- Web Session：`apps/web/src/lib/auth.tsx`
- 认证交互：`apps/web/src/pages/auth-page.tsx`
- OAuth/邮箱回调：`apps/web/src/pages/auth-callback-page.tsx`
- 路由保护：`apps/web/src/app.tsx`
- 数据所有权字段：`supabase/migrations/`
- 当前缺口：`apps/api` 尚无统一 Auth Guard 和所有权查询约束
