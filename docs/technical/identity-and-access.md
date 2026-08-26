# Identity and Access

Status: Current
Last verified: 2026-08-26
Read when: 修改 Session 恢复、认证回调、受保护路由、API 鉴权或资源所有权校验
Applies to: `apps/web` 认证边界，以及尚未闭环的 `apps/api` 身份验证与授权

## Related

- Business: `docs/business/identity-and-access.md`
- Design: `docs/design/identity-and-access.md`
- Technical topic: `docs/technical/supabase.md`
- Architecture: `ARCHITECTURE.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- Web 负责浏览器 Session 和路由保护，不是服务端授权边界。
- API 必须验证身份并从可信主体派生 `owner_id`，不得接受客户端所有者 ID。
- 浏览器只能使用 publishable/anon key；高权限 key 只能存在于 API 和 Worker。

## Current Implementation

```text
Browser
  -> Supabase Auth (Email/Password or Google OAuth)
  -> /auth/callback
  -> Web exchanges or restores Session
  -> protected route checks current User
  -> Web requests business data

API
  -> privileged Supabase client
  -> no Bearer Token verification
  -> no verified principal or owner filter
```

Web 已经建立 Session 恢复和受保护路由。API 仍使用高权限 Supabase Client，尚未验证浏览器 Access Token，也没有按当前 User 约束业务查询。因此受保护页面不能被视为服务端数据隔离。

## Boundaries

| Module   | Responsibility                         | Must not                                       |
| -------- | -------------------------------------- | ---------------------------------------------- |
| Web      | Session 恢复、认证跳转和受保护页面门禁 | 持有服务端 key，或把路由保护当作对象授权       |
| API      | 验证 Token、建立主体、执行对象授权     | 接受 `ownerId`，或仅依赖浏览器状态             |
| Business | 沿 Project 所有权根约束下级资源        | 重复实现 Token 验证                            |
| Supabase | Auth、Session 和 PostgreSQL            | 让高权限 Client 绕过应用层所有权校验而不受约束 |

## Session Flow

1. `apps/web/src/lib/auth.tsx` 创建浏览器安全的 Supabase Client，并恢复 Session。
2. `apps/web/src/app.tsx` 等待恢复完成后决定是否渲染受保护页面。
3. `/auth/callback` 交换认证结果，只消费经过校验的站内返回目标。
4. Session 缺失或失效时，Web 进入认证流程，不提前渲染业务数据。

合法返回目标必须以单个 `/` 开头，不能是站外 URL、双斜线路径或认证路由循环。

## Authorization Contract

API 授权闭环必须执行以下顺序：

1. 读取 `Authorization: Bearer <access-token>`。
2. 使用可信 Auth 能力验证 Token 并取得稳定 User ID。
3. 将已验证主体写入请求上下文。
4. 业务查询同时按资源 ID 和当前 User ID 约束数据。
5. 对不存在和无权访问使用稳定、非泄露性的错误语义。

Identity and Access 拥有公共身份验证边界；Projects、Conversations 等模块拥有各自资源的授权规则。

## Data and Secrets

| Data or credential      | Location                        | Rule                                  |
| ----------------------- | ------------------------------- | ------------------------------------- |
| Browser Session         | Supabase Auth 和浏览器 SDK 存储 | 只代表当前浏览器会话                  |
| Publishable/anon key    | Web 构建配置                    | 可以进入浏览器，仍依赖 API 授权和 RLS |
| Secret/service-role key | API/Worker 环境                 | 不得进入浏览器，会绕过 RLS            |
| `owner_id`              | 业务表                          | 必须来自已验证主体，不得信任请求正文  |

## Failure Handling

| Failure                  | Behavior                         |
| ------------------------ | -------------------------------- |
| Session 恢复失败         | 按未登录处理并保留合法返回目标   |
| OAuth 或邮箱确认失败     | 停留在认证流程，不伪造已登录状态 |
| 非法返回目标             | 回退 `/workspace`                |
| API Token 缺失或失效     | 返回稳定认证错误，不记录 Token   |
| 资源不存在或属于其他用户 | 拒绝访问，不泄露对象是否存在     |

## Security

- 密码、Token、Secret Key 和完整第三方错误不得进入 URL、日志或业务 DTO。
- 服务端高权限 Client 的每个业务查询都必须显式执行所有权约束。
- 前端隐藏数据、禁用按钮或路由跳转不能替代 API 授权。
- RLS 是纵深防御，不替代 API 对可信主体和对象关系的校验。

## Known Implementation Gaps

- API 请求尚未携带并验证 Supabase Access Token。
- API 尚无公共 Auth Guard 或已验证主体上下文。
- Project、Conversation 及下级资源查询尚未按真实 `owner_id` 隔离。
- 当前服务端数据链路只适合单用户开发环境，不满足多用户生产授权要求。

## Change Map

| Change               | Also inspect                                               |
| -------------------- | ---------------------------------------------------------- |
| Session 生命周期     | `auth.tsx`、`app.tsx`、认证页、回调页和退出行为            |
| Redirect 校验        | 认证入口、`sessionStorage` 临时状态和回调单次消费          |
| API 身份验证         | 公共 Guard、请求上下文、错误映射和日志脱敏                 |
| 所有权               | Projects、Conversations、Messages、Runs、Events 查询和 RLS |
| 浏览器 Supabase 配置 | `.env.example`、Vite 环境注入和 secret 扫描                |

## Verification

```bash
pnpm --filter @wex/web typecheck
pnpm --filter @wex/api typecheck
pnpm build
```

手工验证未登录保护、Email/Password、Google OAuth、非法 redirect、Session 失效和退出失败路径。API 授权闭环完成后，还必须验证缺失、失效和其他用户的 Token 均不能访问目标资源。
