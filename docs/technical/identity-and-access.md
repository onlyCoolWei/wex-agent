# Identity and Access Technical Implementation 身份与访问技术实现

Status: Current
Last verified: 2026-08-26
Read when: 修改 Session 恢复、认证回调、受保护路由、API 鉴权或资源所有权校验
Applies to: `apps/web` 认证边界，以及尚待闭环的 `apps/api` 身份验证与授权

## Related

- Business: `docs/business/identity-and-access.md`
- Design: `docs/design/identity-and-access.md`
- Technical topic: `docs/technical/supabase.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

本文描述 Identity and Access 模块当前如何建立浏览器 Session、保护页面并向服务端授权边界演进。Supabase 凭据、Dashboard 和 migration 操作由 [`supabase.md`](supabase.md) 负责。

## 1. 当前链路

```text
Browser
  -> Supabase Auth (Email/Password or Google OAuth)
  -> /auth/callback
  -> Web exchanges and restores Session
  -> protected route checks current User
  -> Web requests business data

API
  -> currently uses a privileged Supabase client
  -> does not yet verify the browser Access Token
  -> does not yet derive owner_id from a verified principal
```

Web 路由保护已经实现，API 身份验证和对象授权尚未闭环。因此受保护页面不能被视为服务端数据隔离。

## 2. Web 边界

- `apps/web/src/lib/auth.tsx` 创建浏览器安全的 Supabase Client，并向组件提供 Session 恢复状态和当前 User。
- `apps/web/src/app.tsx` 在 Session 恢复完成后决定是否渲染受保护页面。
- `/auth/callback` 完成认证回调并只导航到经过校验的站内目标。
- 密码和 Token 不进入 URL、LocalStorage、日志或业务 DTO。
- 浏览器只使用 publishable/anon key，不接收服务端 secret/service-role key。

合法返回目标必须是以单个 `/` 开头的站内路径，不能指向认证路由形成循环。Session 未确认时，受保护数据不得提前渲染。

## 3. API 授权边界

完整闭环需要在 API 统一完成：

1. 从 `Authorization: Bearer <access-token>` 读取凭据。
2. 使用可信 Auth 能力验证 Token，并取得稳定 User ID。
3. 将已验证主体写入请求上下文，不接受客户端提交 `ownerId`。
4. 每个业务模块同时按资源 ID 和当前 User ID 查询或变更数据。
5. 对不存在和无权访问使用稳定、非泄露性的错误语义。

Identity and Access 负责建立可信主体和公共 Guard；Projects、Conversations 等模块分别拥有自己的资源授权规则。

## 4. 数据与密钥

| 数据或凭据              | 所在位置                          | 约束                                     |
| ----------------------- | --------------------------------- | ---------------------------------------- |
| Browser Session         | Supabase Auth/Web 内存与 SDK 存储 | 只用于当前用户会话                       |
| Publishable key         | Web 构建配置                      | 可以进入浏览器，但仍依赖 RLS 和 API 授权 |
| Secret/service-role key | API/Worker 环境                   | 不得进入浏览器，会绕过 RLS               |
| `owner_id`              | 业务表                            | 必须来自已验证主体，不得信任请求正文     |

## 5. 失败与安全

- Session 恢复失败按未登录处理，并保留合法返回目标。
- OAuth 或邮箱确认失败停留在认证流程，不能伪造已登录状态。
- API 鉴权失败返回稳定错误，不记录 Token 或完整第三方错误。
- 服务端高权限 Client 的每个业务查询都必须显式执行所有权约束。
- 前端隐藏数据或路由跳转不能替代 API 授权。

## 6. 验证

- 未登录访问受保护页面不会渲染业务数据。
- Email/Password 和 Google OAuth 回调都只消费一次合法返回目标。
- 非法外部、双斜线或认证循环目标回退到 `/workspace`。
- 浏览器构建产物不包含 Supabase secret/service-role key。
- API 授权闭环完成后，缺失、失效和其他用户的 Token 均不能访问目标资源。

## 7. 实现定位

- Web Auth：`apps/web/src/lib/auth.tsx`
- 路由保护：`apps/web/src/app.tsx`
- 认证页面：`apps/web/src/pages/auth-page.tsx`
- 回调页面：`apps/web/src/pages/auth-callback-page.tsx`
- Supabase 配置：`docs/technical/supabase.md`
- 待实现 API Guard：`apps/api/src/`
