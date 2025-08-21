# Bug修复：任务文档预览页面限高问题

- 任务ID: 236
- 项目: ai-proj (ID=1)
- 状态: completed
- 类别: UI显示 (ui_display)

## 问题描述
任务详情页中的“任务文档”区域在预览内容时存在人为限高，导致文档内容被裁切或需要额外滚动查看，不符合预览预期。

具体表现：
- 组件 TaskDocumentWidget 在预览片段时将容器设置为 maxHeight: 200px; overflow: auto；
- 在文档较长时出现双滚动条或阅读不连续的问题。

## 修复思路
- 去除预览容器的人为限高，让内容自然撑开显示；
- 移除溢出滚动，避免双滚动条；
- 与已有的统一文档区域(UnifiedTaskDocumentArea)风格保持一致，其预览态已使用“max-height: none; overflow: visible”。

## 变更内容
文件：frontend/src/components/TaskDocumentWidget.tsx
- 原实现：
  - maxHeight: '200px', overflow: 'auto'，且仅截取前500字符。
- 新实现：
  - maxHeight: 'none', overflow: 'visible'，展示完整内容，不再截断。

代码片段（要点）：
- 将预览容器样式改为：maxHeight: 'none'; overflow: 'visible'；
- 预览内容由 substring(0, 500) 调整为完整 doc.content；

## 验证结果
- 构建并本地预览 TaskDetailPageNew：
  - 任务文档预览区域不再出现裁切或双滚动条；
  - 长文档可正常展示并随页面滚动；
  - 其他区域布局不受影响（按钮、统计信息等正常）。
- 与 UnifiedTaskDocumentArea 的 preview 模式行为一致。

## 影响范围评估
- 仅影响 TaskDocumentWidget 组件内的预览片段展示；
- 不影响文档管理器 TaskDocumentManager 的预览/下载/删除逻辑；
- 与 MarkdownRenderer、UnifiedTaskDocumentArea 的样式保持一致性。

## 可能的后续优化
- 对极长文档可考虑折叠/展开交互（非限高），优化首屏渲染体验；
- 为图片/表格类内容引入更精细的响应式样式（目前已具备基础适配）。

## 提交记录
- 修改文件：frontend/src/components/TaskDocumentWidget.tsx
- 说明：移除预览限高与截断逻辑，改为完整展示内容，统一预览体验。

## 结论
问题已修复。任务文档预览页面不再限高，阅读体验符合预期。