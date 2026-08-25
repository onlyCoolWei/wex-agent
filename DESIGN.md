# Wex Agent Design System

Status: Current
Last verified: 2026-08-26
Read when: 新增页面、修改全局视觉语言、公共组件、布局、响应式或交互状态
Applies to: `apps/web` 全局页面、布局、组件和交互反馈

## Purpose

本文是 Wex Agent 的全局设计和交互事实来源。模块设计文档只能补充局部结构和例外，不得重复定义或违反本文的全局规则。

## Product Tone

- 面向高频创作和持续迭代，界面应安静、直接、专业，优先支持扫描、输入和反馈。
- 产品工作区优先于营销式装饰；页面首先呈现当前任务、状态和下一步操作。
- 视觉层次通过空间、边界、字重和状态色建立，不依赖大面积渐变、装饰性光晕或卡片堆叠。

## Visual Foundations

当前 Web 主题在 `apps/web/src/styles.css` 中定义：

| Token       | Current value | Use                  |
| ----------- | ------------- | -------------------- |
| `ink`       | `#20231f`     | 主要文字和高对比内容 |
| `muted`     | `#71776f`     | 辅助文字和次要状态   |
| `line`      | `#dfe2dc`     | 主要分隔线           |
| `soft-line` | `#e9ebe6`     | 轻量边界             |
| `paper`     | `#fbfcf9`     | 面板和表面           |
| `canvas`    | `#f2f3ef`     | 工作区背景           |
| `lime`      | `#c9f06a`     | 主要品牌强调         |
| `forest`    | `#405e48`     | 稳定、成功和运行状态 |
| `danger`    | `#c8584f`     | 删除和错误状态       |

使用现有 token 或已有组件，不在模块中随意创建相近颜色。正文使用 `Avenir Next` 系列无衬线字体，展示型标题可使用现有 Georgia 字体；字号应匹配容器，不使用随视口连续缩放的字体方案。

## Layout

- 工作区优先占满可用视口，避免在工作区域外重复嵌套装饰卡片。
- Project 工作区桌面端由 Chat 和 Preview 两个主要区域组成，中间分隔条可拖拽且支持键盘调整。
- 移动端使用稳定的 Chat/Preview 标签切换，不让两个面板同时挤压内容。
- 固定格式的工具栏、按钮、面板和分隔条必须有稳定尺寸，内容变化不能造成布局跳动。
- 页面区块优先使用无框架的全宽布局；卡片只用于重复项、弹窗和确实需要边界的工具。

## Interaction States

涉及数据或异步操作的界面必须明确处理：

- loading：说明正在发生什么，避免重复提交。
- empty：说明当前没有数据，并提供合法的下一步操作。
- error：给出稳定、非敏感的错误信息和可执行的重试路径。
- disabled：在请求进行中或条件不满足时阻止重复操作。
- success/completed：确认状态已经落库或动作已经完成，不只依赖瞬时动画。

按钮、表单和可拖拽区域必须支持键盘焦点。图标按钮使用现有图标库，并提供 `aria-label` 或 tooltip；不要用陌生的纯图标替代没有可访问名称的操作。

## Responsive and Accessibility

- 不得让文字、按钮、错误信息或动态内容互相覆盖。
- 窄屏下优先保证主任务和状态可读，次要面板通过切换或滚动进入。
- `focus-visible` 状态必须清晰；颜色不是唯一状态表达方式。
- 对话、Preview、错误和进度状态应同时使用文字、结构或图标表达。
- 触控目标需要保持足够的稳定尺寸，拖拽区域不得遮挡实际内容。

## Module Exceptions

模块设计文档可以定义页面专属布局、交互顺序和状态，但必须链接本文，并明确记录任何例外及原因。业务能力必须先由 `docs/business/` 确认，设计文档不能自行增加操作。

## Related

- Business: `docs/business/README.md`
- Architecture: `ARCHITECTURE.md`
- Design modules: `docs/design/README.md`
- Tokens and base styles: `apps/web/src/styles.css`
