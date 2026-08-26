# Identity and Access

Status: Current
Last verified: 2026-08-26
Read when: 修改登录、注册、OAuth、Session、退出、redirect 或访问权限
Applies to: Web 身份入口、受保护产品页面和业务数据访问边界

## Related

- Design: `docs/design/identity-and-access.md`
- Technical: `docs/technical/identity-and-access.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

- 访客可以使用 Email/Password 或 Google 建立个人身份。
- 用户完成认证后返回原本想访问的合法站内页面。
- 未认证用户不能看到受保护页面的数据。
- 用户只能操作属于自己的 Project 及其下级业务对象。

服务端授权尚未闭环，因此最后一项是已经确认、但未完整实现的业务不变量。

## Capabilities

- 公开访问首页。
- 使用 Email/Password 登录或首次注册。
- 使用 Google OAuth 登录。
- 通过邮箱确认或 OAuth 回调建立 Session。
- 从账户菜单退出。
- 在 Web 路由层保护 `/workspace` 和 `/projects/:projectId`。

## Entities

| Entity   | Meaning                               | Authority     |
| -------- | ------------------------------------- | ------------- |
| User     | 通过 Supabase Auth 建立身份的个人用户 | Supabase Auth |
| Session  | Web 恢复和刷新的登录会话              | Supabase Auth |
| redirect | 认证完成后的合法站内返回目标          | Web 临时状态  |

## States

| State      | Meaning                                  | Allowed behavior                   |
| ---------- | ---------------------------------------- | ---------------------------------- |
| 确认中     | Web 正在恢复本地 Session                 | 保持稳定加载，不展示受保护数据     |
| 未登录     | 没有有效 Session                         | 浏览首页，进入认证页               |
| 邮箱待确认 | 注册成功，但尚未通过确认链接建立 Session | 重发确认邮件，返回修改邮箱         |
| 已登录     | Session 有效且能取得 User                | 进入工作台和 Project 页面          |
| 会话失效   | Session 过期、撤销或恢复失败             | 清除登录态并重新认证，保留合法目标 |

## Rules

- Email 输入必须规范化，密码必须至少包含 6 个字符。
- Email/Password 表单先尝试登录，凭证未知时再发起首次注册。
- 认证错误不得向访客泄露精确账号状态。
- `redirect` 必须是站内绝对路径，不得以 `//` 开头或循环指向认证路由。
- 退出必须调用 Supabase Auth 清理 Session；失败时必须保留当前状态并展示错误。
- 受保护页面发现用户未登录时，必须进入认证页并保存当前合法站内地址。

## Invariants

- 密码、Token、Secret Key 和完整认证错误不得写入 URL、日志或业务数据。
- 浏览器只能使用 publishable/anon key；secret/service-role key 只能存在于受控服务端。
- 页面显示已登录不等于服务端已授权；业务数据 API 必须独立验证身份和对象所有权。
- 不得通过差异化错误文案确认某邮箱是否已经注册。
- Auth 加载期间不得闪现 Project 或对话等受保护内容。
- `owner_id` 必须来自已验证身份，不得接受客户端传入的用户 ID。

## Flows

### Email/Password

1. 用户输入规范化邮箱和有效密码。
2. 系统尝试密码登录。
3. 登录成功后建立 Session，并进入合法 `redirect`。
4. 凭证未知时发起注册；需要邮箱确认时展示查收邮件状态。
5. 用户通过确认链接进入 `/auth/callback`，交换 Session 后返回目标页面。

### Google OAuth

1. 用户从认证页发起 Google 登录。
2. 系统在 `sessionStorage` 保存合法站内返回目标。
3. Google 与 Supabase 完成授权后进入 `/auth/callback`。
4. 回调建立 Session，清理临时目标并跳转。

### Sign Out and Expiry

1. 用户触发退出，或受保护页面检测到 Session 失效。
2. 主动退出时，系统调用 Supabase Auth 清理 Session。
3. Session 清理成功后返回首页；失效场景进入认证页。
4. 退出失败时保留当前状态并展示错误。

## Boundaries

| Boundary     | Current fact                                                           |
| ------------ | ---------------------------------------------------------------------- |
| API 身份验证 | API 请求尚未携带并验证用户 Access Token                                |
| 数据所有权   | Project 与 Conversation 的 `owner_id` 可以为空，查询尚未按当前用户过滤 |
| RLS          | 数据表已启用 RLS，但高权限服务端客户端不会替代 API 所有权校验          |
| 使用范围     | 当前实现只适合单用户开发环境，不满足多用户生产授权要求                 |
| 账号能力     | 当前流程不提供密码找回、资料管理、账号删除或多账号切换                 |
| 协作能力     | 当前只定义个人用户，不提供团队、邀请、成员或角色权限                   |

## Edge Cases

| Case                  | Expected behavior                |
| --------------------- | -------------------------------- |
| 非法或站外 `redirect` | 回退 `/workspace`，不得跳出站点  |
| `redirect` 指向认证页 | 回退 `/workspace`，不得形成循环  |
| Session 恢复中        | 保持加载状态，不展示受保护内容   |
| OAuth 或邮箱回调失败  | 展示稳定错误，并允许重新认证     |
| 退出失败              | 保留当前登录状态，不伪装为已退出 |
| 非所有者访问          | 服务端拒绝，且不得泄露对象数据   |

## Impact Map

| Change           | Also inspect                                                    |
| ---------------- | --------------------------------------------------------------- |
| Session 生命周期 | 首页、认证页、回调页、工作台和 Project 页的恢复、过期与退出行为 |
| redirect 规则    | `apps/web/src/pages/auth-page.tsx`、回调页和路由保护            |
| 身份回调         | `apps/web/src/pages/auth-callback-page.tsx`、临时状态和单次跳转 |
| 路由保护         | `apps/web/src/app.tsx`、Auth 加载和受保护页面                   |
| API 身份验证     | Auth Guard、Token 校验、稳定错误和日志脱敏                      |
| 数据所有权       | `apps/api/` 的 Project 及下级查询、`owner_id` 派生和 RLS        |
| 浏览器认证配置   | `apps/web/src/lib/auth.tsx`、公开配置和服务端 Secret 边界       |

## Acceptance

- [ ] 未登录访问受保护地址时进入认证页，认证成功后返回原地址
- [ ] 非法或认证路由形式的 `redirect` 回退 `/workspace`
- [ ] 首次邮箱用户收到确认链接，已有用户可以直接登录
- [ ] OAuth 和邮箱确认回调只跳转一次，并清理临时状态
- [ ] Session 初始化期间不展示受保护数据
- [ ] 退出失败不会制造虚假的未登录状态
- [ ] 服务端授权闭环后，用户不能读取或修改其他用户的业务对象
