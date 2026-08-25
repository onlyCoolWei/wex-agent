# Projects Design Project 管理设计

Status: Current
Last verified: 2026-08-26
Read when: 修改工作台 Project 列表、创建、打开、删除或相关页面状态
Applies to: `/workspace` 的 Project 管理界面和 Project 卡片交互

## Related

- Business: `docs/business/projects.md`
- Technical: `docs/technical/projects.md`
- Design system: `DESIGN.md`

## Purpose

本文定义用户在工作台查看、创建、打开和删除 Project 时的页面结构、反馈与响应式行为。Project 生命周期、所有权和删除语义以 [`../business/projects.md`](../business/projects.md) 为准。

## 1. 用户目标

- 快速辨认并打开已有 Project。
- 在没有 Project 时直接开始第一次创建。
- 清楚区分创建、打开和不可恢复删除。
- 请求失败时保留现有数据和可恢复操作。

## 2. 页面结构

工作台复用产品级 Header，主体使用受约束的单列内容区：

```text
+------------------------------------------------------------+
| Wex / 工作台                                  [账户菜单]   |
+------------------------------------------------------------+
| Project                                      [创建 Project] |
|                                                            |
| Project Grid / Empty / Loading / Error                     |
+------------------------------------------------------------+
```

- 标题与主操作位于同一操作栏；窄屏时允许上下排列。
- 列表使用响应式网格：宽屏 3 列、中等屏 2 列、窄屏 1 列。
- 网格、空状态和错误状态占用相同的主体区域，切换时不移动页面主操作。
- Project 名称过长时截断显示，但删除确认必须能识别目标。

## 3. 创建与打开

- `创建 Project` 是页面唯一主操作；空状态中可以重复提供同一命令。
- 创建期间禁用所有创建入口并显示进行状态，防止重复提交。
- 创建成功后使用服务端返回的 Project ID 进入 `/projects/:projectId`。
- 创建失败时留在工作台，恢复创建入口并在原区域显示可操作错误。
- Project 卡片主体用于打开；删除等破坏性操作放入独立菜单或图标按钮，不能与打开热区重叠。
- 打开 Project 时不得用客户端临时 ID 制造成功导航。

## 4. 删除

- 删除必须从目标 Project 的明确操作入口触发。
- 确认对话框展示 Project 名称、不可恢复语义和取消操作。
- 确认后只禁用目标 Project 的相关操作，其他 Project 仍可打开。
- 删除失败时保留卡片和确认上下文，并允许重试或取消。
- 服务端确认成功后才从列表移除 Project。

## 5. 状态

| 状态     | 表现                             | 可用操作                  |
| -------- | -------------------------------- | ------------------------- |
| Loading  | 主体区域显示稳定加载状态         | Header 与账户操作保持可用 |
| Empty    | 说明暂无 Project，并提供创建命令 | 创建                      |
| Ready    | 展示 Project 网格                | 创建、打开、删除          |
| Creating | 创建入口显示进行状态             | 禁止重复创建              |
| Deleting | 仅目标卡片和确认操作进入忙碌状态 | 可操作其他 Project        |
| Error    | 在对应区域显示错误和恢复命令     | 重试，不丢失已有列表      |

## 6. 响应式与可访问性

- 窄屏下操作栏换行，命令仍保持稳定触控尺寸。
- 卡片菜单和删除按钮必须有可访问名称、键盘焦点态和工具提示。
- 确认对话框打开后焦点进入对话框；关闭后返回触发元素。
- 删除结果不能只依赖颜色表达。
- 加载文本、Project 名称和错误信息不得撑破卡片或覆盖操作。

## 7. 验收

- Loading、Empty、Ready 和 Error 切换不会移动页面标题与主操作。
- 连续点击创建只产生一个可见的进行状态。
- 创建失败不会离开工作台，成功只进入服务端返回的 Project。
- 删除确认能识别目标并清楚表达不可恢复影响。
- 删除失败保留 Project，成功后才移除。
- 单列窄屏下 Project 名称和操作不会重叠。

## 8. 实现定位

- 页面：`apps/web/src/pages/workspace-page.tsx`
- Header：`apps/web/src/components/app-header.tsx`
- 删除确认：`apps/web/src/components/delete-project-dialog.tsx`
- 请求：`apps/web/src/lib/api.ts`
