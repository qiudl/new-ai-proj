# 🐞 Bug 619901 修复计划：Mermaid 流程图不显示

**任务**: 619901  
**父任务/项目**: 619 - 清理任务文档创建接口  
**标题**: 修复任务619项目总结文档中的 Mermaid 流程图不显示  
**优先级**: 高  
**状态**: 待办 (todo)

## 1. 问题描述
- 在文档《任务619项目总结：多AI并行开发清理任务文档创建接口》中，包含 ```mermaid 代码块的流程图无法渲染，呈现为纯文本。
- 场景：VSCode 预览、静态 HTML 预览/导出、(如有) PDF 导出

## 2. 可能原因排查
- 文档中代码块语法为 ```mermaid 但预览器不支持自动渲染
- 静态HTML未引入 mermaid.min.js 或者未在页面 onload 初始化 mermaidAPI
- PDF 导出工具链不支持前端运行 mermaid 脚本渲染
- Markdown 渲染器使用的插件未开启 mermaid 支持 (如 markdown-it-mermaid)

## 3. 修复方案选项

### 方案A：静态HTML内联Mermaid渲染 (推荐)
- 在导出的HTML中自动注入以下脚本：
```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
    }
  });
</script>
```
- 优点：简单快速，预览/静态托管即可渲染  
- 风险：需确保安全策略(securityLevel)匹配文档内容

### 方案B：构建链使用 markdown-it + markdown-it-mermaid 渲染为SVG
- 在Node构建脚本中：
  - 使用 markdown-it 加载 markdown-it-mermaid 插件
  - 将 ```mermaid 代码块直接渲染成SVG插入HTML/MD输出
- 优点：纯静态，无需前端脚本  
- 风险：需配置Node构建，适配当前仓库

### 方案C：PDF导出使用 mermaid-cli 或 Puppeteer 预渲染
- 在导出管线中，为含有 ```mermaid 的文档单独处理：
  - 通过 mmdc (mermaid-cli) 生成 PNG/SVG 并替换占位
  - 或用 Puppeteer 预渲染页面后导出PDF  
- 优点：适配PDF不可执行脚本的限制  
- 风险：引入额外工具和CI依赖

## 4. 执行计划
- 步骤1：在仓库中定位任务619项目总结文档位置 (若未找到则由内容生产脚本生成/迁移)  
- 步骤2：为静态HTML预览路径添加Mermaid脚本注入 (方案A)  
- 步骤3：为CI导出PDF管线增加 mermaid-cli 预渲染 (方案C，可作为后续增强)  
- 步骤4：验证三类场景 (VSCode、HTML、PDF) 均能正确显示

## 5. 变更点
- 新增/修改：
  - docs/export/mermaid-inject.js (为HTML注入 mermaid.js 和初始化)
  - scripts/render-mermaid.mjs (可选：mmdc 批量渲染 mermaid)
  - Jenkinsfile/导出脚本：增加渲染步骤 (可选)

## 6. 验收标准
- VSCode 预览能正常显示 mermaid 流程图
- 本地静态HTML预览能正常显示 mermaid 流程图
- (如需PDF) CI导出PDF中流程图以SVG/PNG形式正确显示

## 7. 回滚/兼容
- 注入脚本仅影响含有 ```mermaid 的页面，其他页面不受影响
- 若出现安全告警，调整 mermaid.initialize 中的 securityLevel 配置

## 8. 附：复现与验证脚本
```bash
# 验证HTML注入方案 (方案A)
node docs/export/mermaid-inject.js path/to/input.md > out.html
open out.html

# (可选) 批量渲染mermaid (方案C)
npx @mermaid-js/mermaid-cli -i flow.mmd -o flow.svg
```

