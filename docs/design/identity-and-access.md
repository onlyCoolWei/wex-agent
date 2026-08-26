# Identity and Access

Status: Current
Last verified: 2026-08-26
Read when: 修改首页认证入口、认证页、OAuth 回调、账户菜单、退出或认证状态反馈
Applies to: `/`、`/auth`、`/auth/callback`、受保护页面入口和账户菜单

## Related

- Business: `docs/business/identity-and-access.md`
- Technical: `docs/technical/identity-and-access.md`
- Design system: `DESIGN.md`

## Design Contract

- 必须遵守根目录 `DESIGN.md`。
- 本文只定义身份入口、认证反馈和账户菜单的页面表现。
- 身份规则、redirect 校验和服务端授权边界以 Business 文档为准。
- 页面不得通过文案或视觉状态泄露精确账号状态。

## User Goal

- 从首页或受保护地址进入认证流程。
- 使用 Email/Password 或 Google 完成认证。
- 首次邮箱注册后理解确认邮件的下一步操作。
- 认证成功后回到原本要访问的合法站内页面。
- 明确退出结果，并在失败时保留可恢复状态。

## Scope

| Surface     | Responsibility                            |
| ----------- | ----------------------------------------- |
| 首页 Header | 根据 Session 状态展示登录入口或账户菜单   |
| 首页主操作  | 进入工作台，必要时先完成认证              |
| 认证页      | 凭证、Google OAuth、邮箱确认和提交反馈    |
| 回调页      | 展示 Session 交换的加载或失败结果         |
| 受保护页面  | Auth 恢复期间保持加载，未登录时进入认证页 |
| 账户菜单    | 展示身份入口和退出操作                    |

## Layout

### Authentication Page

| Viewport             | Layout                                         |
| -------------------- | ---------------------------------------------- |
| Desktop, `>= 1024px` | 左侧品牌信息，右侧认证表单                     |
| Narrow, `< 1024px`   | 隐藏品牌信息面板，单列展示返回入口、品牌和表单 |

认证表单使用单一受约束内容列。凭证与邮箱确认步骤占用同一区域，切换时不得改变页面主层级。

### Callback Page

回调页使用全屏居中状态区域，只展示“正在完成登录”或“确认登录失败”，不得短暂出现首页或受保护数据。

## Regions

| Region           | Responsibility                     | Stable behavior                |
| ---------------- | ---------------------------------- | ------------------------------ |
| Brand panel      | 产品品牌和认证上下文               | 只在 Desktop 展示              |
| Auth heading     | 当前步骤和辅助说明                 | 凭证与确认步骤保持相同层级     |
| Credentials form | 邮箱、密码、可见性切换和登录       | 单列、全宽操作                 |
| OAuth action     | Google 登录                        | 与 Email/Password 共享忙碌状态 |
| Confirmation     | 脱敏邮箱、确认提示、重发和返回修改 | 不显示密码                     |
| Account menu     | 账户入口和退出                     | 锚定头像，不遮挡触发元素       |

## States

| Area     | State        | Required UI                                        |
| -------- | ------------ | -------------------------------------------------- |
| App      | Auth loading | 全屏稳定加载，不展示登录入口、账户菜单或受保护数据 |
| Home     | Signed out   | Header 展示“登录”，主操作进入认证页                |
| Home     | Signed in    | Header 展示头像，主操作直接进入工作台              |
| Auth     | Credentials  | 邮箱、密码、显示密码、登录和 Google 操作           |
| Auth     | Busy         | 禁用所有认证提交，主操作显示“正在处理”             |
| Auth     | Confirmation | 脱敏邮箱、确认提示、重发倒计时和返回修改           |
| Auth     | Error        | 当前步骤内展示可理解错误并允许重试                 |
| Callback | Loading      | “正在完成登录”和明确进度反馈                       |
| Callback | Error        | “确认登录失败”、错误说明和“返回登录”               |
| Sign out | Busy         | 防止重复退出                                       |
| Sign out | Error        | 保留登录态并展示“退出失败，请重试”                 |

## Interactions

### Entry and Redirect

- 首页“进入工作台”在 Session 确认中必须禁用。
- 未登录用户从受保护地址进入认证页，成功后返回原目标。
- 已登录用户进入 `/auth` 时直接前往合法目标。
- 认证成功只能跳转一次；失败时不得丢失合法返回目标。
- Session 变化必须同步到其他标签页；退出后通过浏览器后退也不得重新展示受保护页面。

### Email/Password

- 页面只提供一个 Email/Password 表单，不要求用户选择登录或注册模式。
- 邮箱和密码在本地校验后才能提交；字段错误显示在对应区域。
- 主按钮文案固定为“登录”，提交中禁用表单、密码切换和 Google 操作。
- 表单有效时支持 `Enter` 提交。
- 密码可见性使用带可访问名称的图标按钮切换。
- 邮箱确认步骤展示脱敏邮箱、查收邮件提示、60 秒重发倒计时和“返回修改”。
- 返回凭证步骤时保留邮箱并清除当前错误。

### Google OAuth

- “使用 Google 登录”与凭证表单共享忙碌状态。
- OAuth 发起后禁止重复提交。
- 用户取消或授权失败时返回认证页，展示稳定错误并允许重试。
- 回调交换 Session 期间不得展示错误登录态或受保护内容。

### Account Menu and Sign Out

- 头像必须提供“账户菜单”标签，并显示图片或邮箱首字符 fallback。
- 点击头像打开菜单；再次点击、点击外部或按 `Escape` 关闭。
- 菜单只展示“退出登录”，并使用图标与文字共同表达。
- 菜单打开后可以聚焦退出操作；关闭后焦点返回头像按钮。
- 退出成功后进入首页；失败时保留 Session 和可见错误。

## Responsive

- Narrow 布局必须保留返回首页、品牌、表单、错误和主操作。
- 表单字段、按钮和错误信息不得超出视口或相互覆盖。
- 软键盘出现时，当前字段和错误反馈仍必须可滚动到达。
- 账户菜单必须保持在视口内，并位于页面主体内容之上。

## Accessibility

- 所有输入必须有持久可见标签和正确的 `autocomplete`。
- 密码可见性、账户菜单和返回操作必须有可访问名称。
- Busy 状态必须同时使用禁用属性、进度图标和文字。
- Error 与成功提示必须可被辅助技术感知，不得只依赖颜色。
- `Escape` 关闭菜单后必须恢复焦点。
- 回调加载状态必须提供可读标题和说明。

## Content

| Context               | Current copy            |
| --------------------- | ----------------------- |
| 首页认证入口          | 登录                    |
| 首页主操作            | 进入工作台              |
| 认证主标题            | 继续创作                |
| Email/Password 主操作 | 登录                    |
| Google 主操作         | 使用 Google 登录        |
| 邮箱确认标题          | 确认你的邮箱            |
| 邮箱确认操作          | 重新发送邮件 / 返回修改 |
| 回调加载              | 正在完成登录            |
| 回调失败              | 确认登录失败 / 返回登录 |
| 账户菜单              | 账户菜单 / 退出登录     |
| 退出错误              | 退出失败，请重试        |

## Prohibited

- 不在 Auth 恢复期间闪现登录入口、头像或受保护内容。
- 不提供账号存在性检查或差异化账号错误。
- 不把页面跳转本身表现为认证成功。
- 不把密码、未校验 redirect 或完整认证错误显示在 URL。
- 不在退出失败时隐藏账户菜单并伪装为已退出。
- 不增加 Business 文档未定义的密码找回、资料或账号管理入口。

## Known UI Gaps

- 账户菜单当前没有显式将焦点移入“退出登录”，关闭后也没有显式把焦点还给头像按钮。

## Code Map

- App guard: `apps/web/src/app.tsx`
- Auth state: `apps/web/src/lib/auth.tsx`
- Home entry: `apps/web/src/pages/home-page.tsx`
- Authentication: `apps/web/src/pages/auth-page.tsx`
- Callback: `apps/web/src/pages/auth-callback-page.tsx`
- Account menu: `apps/web/src/components/app-header.tsx`

## Visual Acceptance

- [ ] Session 初始化期间不闪现错误身份状态或受保护内容
- [ ] Desktop 与 Narrow 布局都能完成 Email/Password 和 Google 认证
- [ ] Credentials、Busy、Confirmation 和 Error 状态切换不破坏页面层级
- [ ] 邮箱确认步骤清楚展示目标邮箱、下一步和重发限制
- [ ] Callback 加载与失败状态完整，且只发生一次成功跳转
- [ ] 账户菜单支持外部点击、`Escape`、焦点进入和焦点恢复
- [ ] 退出失败保留登录态并提供可恢复反馈
- [ ] 所有错误、进度和身份状态不只依赖颜色表达
