# Design Modules

Status: Current
Last verified: 2026-08-26
Read when: 修改 Web 页面、布局、交互状态或响应式表现
Applies to: `apps/web` 的模块级设计和交互文档

## Related

- Business: `docs/business/README.md`
- Documentation: `docs/README.md`
- Design system: `DESIGN.md`

## Purpose

本文是模块设计文档的入口，用于按页面或交互范围定位当前设计事实。全局视觉语言和交互约束由根目录 `DESIGN.md` 负责，业务能力由 `docs/business/` 负责。

## Design Contract

- 模块设计必须遵守根目录 `DESIGN.md`。
- 模块文档只定义局部结构、状态、交互、响应式和可访问性。
- 设计不得自行增加业务操作、状态或能力。
- 页面组合视图可以关联多个业务模块，但不得因此成为新的业务域。
- 任何全局设计例外都必须说明范围和原因。

## Module Map

| Module                                        | Type         | Read when                                           |
| --------------------------------------------- | ------------ | --------------------------------------------------- |
| [Identity and Access](identity-and-access.md) | 模块主文档   | 修改首页认证入口、认证页、回调、账户菜单或退出反馈  |
| [Projects](projects.md)                       | 模块主文档   | 修改工作台 Project 列表、创建、打开、删除或页面状态 |
| [Project Workspace](project-workspace.md)     | 组合页面文档 | 修改 Project 页面、Chat/Preview、分隔条或移动端切换 |

模块主文档与业务模块使用相同文件名和一级标题。组合页面按真实界面范围命名，并在 Related 中链接所有相关业务模块。

## Load Order

```text
对应 Business 文档
  -> DESIGN.md
  -> 对应 Design 模块文档
  -> 相关 Web 页面和组件
```

只有修改全局视觉语言或公共组件时，才需要超出模块文档检查其他设计范围。

## Ownership

| Fact                           | Authority                |
| ------------------------------ | ------------------------ |
| 当前功能、权限和业务规则       | `docs/business/`         |
| 全局视觉语言和交互约束         | `DESIGN.md`              |
| 页面结构、局部状态和响应式表现 | `docs/design/`           |
| API、数据和执行链路            | `docs/technical/` 和代码 |

## Review Checklist

- [ ] Design Contract、User Goal 和覆盖范围明确
- [ ] Layout、Regions 和稳定尺寸足以指导实现
- [ ] loading、empty、error、disabled 等实际状态完整
- [ ] Interactions 同时覆盖指针、键盘和焦点行为
- [ ] Responsive 明确窄屏布局和状态保持方式
- [ ] Accessibility 不只依赖颜色表达状态
- [ ] Prohibited 能阻止误导性或超出业务范围的 UI
- [ ] Code Map 和 Visual Acceptance 可以直接用于核对
