# 设计文档

Status: Current
Last verified: 2026-08-26
Read when: 修改 Web 页面、布局、交互状态或响应式表现
Applies to: `apps/web` 的模块级设计和交互文档

## Related

- Business: `docs/business/README.md`
- Design system: `DESIGN.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

这里记录用户流程、页面状态和布局细节。设计文档必须服从根目录 [`DESIGN.md`](../../DESIGN.md) 和 `docs/business/` 中的业务规则，不能自行扩展产品范围。

模块主文档与业务模块使用相同文件名；组合页面按其真实界面范围命名，可以同时引用多个业务模块。

| 文档                                               | 类型         | 主题                                    |
| -------------------------------------------------- | ------------ | --------------------------------------- |
| [`identity-and-access.md`](identity-and-access.md) | 模块主文档   | 登录、注册、OAuth、回调和退出           |
| [`projects.md`](projects.md)                       | 模块主文档   | 工作台 Project 列表、创建、打开和删除   |
| [`project-workspace.md`](project-workspace.md)     | 组合页面文档 | Project 页面、Chat/Preview 和响应式布局 |
