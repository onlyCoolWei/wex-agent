# Projects Design

Status: Current
Last verified: 2026-08-26
Read when: 修改工作台 Project 列表、创建、打开、删除或相关页面状态
Applies to: `/workspace` 的 Project 管理界面和 Project 卡片交互

## Related

- Business: `docs/business/projects.md`
- Technical: `docs/technical/projects.md`
- Design system: `DESIGN.md`

## Design Contract

- 必须遵守根目录 `DESIGN.md`。
- 本文只定义工作台 Project 管理界面的结构和交互。
- Project 生命周期、所有权和删除语义以 Business 文档为准。
- 页面不得展示 Business 文档没有定义的 Project 操作。

## User Goal

- 快速辨认并打开已有 Project。
- 没有 Project 时直接开始第一次创建。
- 清楚区分创建、打开和不可恢复删除。
- 请求失败时保留现有数据和可恢复操作。

## Layout

工作台复用产品 Header，主体使用受约束的单列内容区：

```text
+------------------------------------------------------------+
| Wex / 工作台                                  [账户菜单]   |
+------------------------------------------------------------+
| 项目                                           [创建项目]  |
|                                                            |
| Project Grid / Empty / Loading / Error                     |
+------------------------------------------------------------+
```

| Viewport           | Project grid |
| ------------------ | ------------ |
| Narrow, `< 640px`  | 1 列         |
| Medium, `>= 640px` | 2 列         |
| Wide, `>= 1024px`  | 3 列         |

## Regions

| Region        | Responsibility                        | Stable behavior        |
| ------------- | ------------------------------------- | ---------------------- |
| Header        | 品牌、工作台层级和账户菜单            | 数据状态变化时保持可用 |
| Action bar    | 页面标题、Project 数量和创建主操作    | 状态切换时不得移动     |
| Content       | Loading、Empty、Error 或 Project Grid | 状态区域最小高度 430px |
| Project card  | 状态、名称、更新时间和打开入口        | 最小高度 210px         |
| Delete dialog | 目标名称、删除影响、取消和确认        | 窄屏保留 16px 页面边距 |

## States

| State        | Required UI                        | Available actions         |
| ------------ | ---------------------------------- | ------------------------- |
| Loading      | 三个稳定骨架卡片和隐藏的加载说明   | Header 与账户操作保持可用 |
| Empty        | 空状态标题、说明和“创建第一个项目” | 创建                      |
| Ready        | Project 数量和响应式网格           | 创建、打开、删除          |
| Creating     | 创建按钮展示进度                   | 禁止所有重复创建          |
| Deleting     | 仅目标对话框进入忙碌状态           | 其他 Project 仍可操作     |
| Load error   | 主体区域显示错误和“重新加载”       | 重试                      |
| Create error | Action bar 下方显示非破坏性错误    | 保留列表并重试            |
| Delete error | 对话框内显示错误                   | 保留 Project，重试或取消  |

## Interactions

- “创建项目”是页面唯一主操作；空状态可以重复提供同一命令。
- Project 卡片主体用于打开，删除按钮必须位于独立热区。
- 创建期间必须禁用页面内所有创建入口。
- 创建成功后才能导航，失败时必须留在工作台。
- 删除必须从目标卡片触发，并打开包含 Project 名称和不可恢复影响的确认对话框。
- 删除中只禁用确认对话框；服务端成功后才能移除卡片。
- Project 名称可以在卡片内换行，但不得覆盖状态、日期或操作。

## Responsive

- 窄屏下 Action bar 可以换行，创建按钮必须保持稳定触控尺寸。
- 网格列数只在稳定断点变化，卡片内容不得决定列宽。
- Project 名称、错误信息和按钮文字不得产生横向滚动。
- 对话框宽度不得超过视口，并保留取消与确认操作的完整可见性。

## Accessibility

- Project 卡片必须提供包含名称的打开标签。
- 删除按钮必须提供包含 Project 名称的可访问标签和 tooltip。
- Loading 区域必须声明忙碌状态，并提供屏幕阅读器文本。
- Error 区域和删除错误必须使用 `role="alert"` 或等效反馈。
- 对话框打开后焦点进入对话框；关闭后返回触发元素。
- 删除、加载和 Project 状态不得只依赖颜色表达。

## Prohibited

- 不把删除按钮放入卡片打开热区。
- 不在服务端成功前移除 Project 卡片或导航到临时 ID。
- 不让 Loading、Empty 或 Error 推动标题和主操作跳动。
- 不展示归档、重命名、复制等未定义操作。
- 不通过清空已有列表来掩盖创建或删除失败。

## Code Map

- Page: `apps/web/src/pages/workspace-page.tsx`
- Header: `apps/web/src/components/app-header.tsx`
- Delete dialog: `apps/web/src/components/delete-project-dialog.tsx`
- Project requests: `apps/web/src/lib/api.ts`

## Visual Acceptance

- [ ] Loading、Empty、Ready 和 Error 切换不移动标题与主操作
- [ ] 连续点击创建只产生一个可见进行状态
- [ ] 创建失败不离开工作台，成功只进入服务端返回的 Project
- [ ] 删除确认可以识别目标并清楚表达不可恢复影响
- [ ] 删除失败保留 Project，成功后才移除
- [ ] 单列窄屏下 Project 名称、状态和操作不重叠
- [ ] 键盘和屏幕阅读器可以完成打开、删除、取消和确认
