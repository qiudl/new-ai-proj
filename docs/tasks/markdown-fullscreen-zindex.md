# 任务：检查任务详情页导航层级问题（Markdown 全屏被覆盖）

- 默认负责人：ai-pm
- 项目：#1（待与任务系统同步）
- 状态：占位文档（待同步）
- 相关偏好（规则）：
  - 生产环境数据使用 Postgres
  - Jenkins 使用 Docker-based agent

## 背景
在任务详情页，当将 Markdown 编辑/预览组件切换为全屏，并将其容器 z-index 设为 9999 时，页面顶部导航、左侧导航和右侧信息区仍然显示在其上方，导致 Markdown 全屏被遮挡。

## 复现步骤
1. 打开任务详情页。
2. 点击 Markdown 编辑器的“全屏”按钮（或触发全屏模式）。
3. 将 Markdown 全屏容器样式设置为：
   ```css
   .markdown-fullscreen {
     position: fixed; /* 或 absolute，视实现而定 */
     inset: 0; /* top:0; right:0; bottom:0; left:0; */
     z-index: 9999;
   }
   ```
4. 观察：顶部导航、左/右侧信息区覆盖在 Markdown 全屏之上。

## 期望 vs 实际
- 期望：Markdown 全屏时应位于所有页面装饰性布局之上，不被任何导航/侧栏遮挡。
- 实际：即使设置 z-index: 9999，仍被顶部导航、左侧导航、右侧信息区覆盖。

## 可能原因（Stacking Context 与布局）
即使 z-index 很大，只会在同一 stacking context 内比较。以下情况会创建新的 stacking context 或影响层叠顺序：
- position + z-index：position 为 relative/absolute/fixed 且 z-index 非 auto 时会参与当前上下文层叠；若祖先创建了新的 stacking context，则受该祖先限制。
- transform / filter / perspective / opacity < 1 / mix-blend-mode / isolation: isolate / will-change / backdrop-filter 等在任意祖先上都会创建新的 stacking context，导致后代的 z-index 无法超越祖先的兄弟元素。
- position: sticky 的元素在其最近的滚动祖先中也可能与其它 fixed/absolute 产生预期外的层叠关系。
- 负 z-index 或 z-index: auto 互相影响。
- 视口层（fixed 元素）与 containing block 的差异：某些 fixed 在被 transform 的祖先包裹时，会相对于该祖先定位，而非视口（Chrome/Safari/Firefox 一致性差异注意）。
- portal/root 层与应用内 overlay 容器（例如全局 #overlay-root、Modal root、浮层管理器）未统一。

## 排查清单（建议用 DevTools 验证）
1. 使用浏览器 DevTools 检查 Markdown 全屏元素及其祖先：
   - 查找最近的祖先是否存在 transform、filter、opacity<1、isolation、mix-blend-mode、will-change、perspective、contain、backdrop-filter。
   - 若存在，说明已生成 stacking context；该祖先的兄弟（如顶部/左/右侧容器）可能在更高层。
2. 检查顶部导航/左侧导航/右侧信息区：
   - 是否 position: fixed/relative/absolute 且设置了较高 z-index（如 10000+），并且处于更外层 stacking context。
   - 是否挂在独立的全局容器（如 body 直系子元素或独立的 overlay root）中。
3. 检查应用是否有统一的层级系统（zIndex scale）：
   - 例如：base(0)、content(1-9)、header(100)、sider(200)、drawer(1000)、modal(2000)、tooltip(3000)、toast(4000)、dev-tools(9000) 等。
   - Markdown 全屏未接入该 overlay 层导致被其它 root-level 容器（header/sider）压住。
4. 检查 Markdown 全屏容器的定位与挂载点：
   - 推荐使用 position: fixed 并挂到一个全局 overlay root（如 <div id="overlay-root" />）而非内容区内部，以避免受父级 stacking context 影响。
   - 若使用 React/Vue，考虑使用 Portal/Teleport 挂载到 body 或 overlay root。
5. 检查滚动容器与 containing block：
   - 若祖先有 transform，fixed 会变为相对该祖先定位，可能被 header/sider 截断或被 overflow 裁剪。
6. 检查是否有 overflow: hidden/auto/scroll 的祖先导致裁剪。

## 修复建议（二选一或组合）
- 方案 A：全屏以 Portal 方式挂载至全局 overlay root
  - 在应用根部创建 overlay root：
    ```html
    <div id="overlay-root"></div>
    ```
  - Markdown 全屏组件通过 Portal（ReactDOM.createPortal / Vue Teleport）渲染到 #overlay-root。
  - 赋予统一的层级变量，如 var(--z-modal) 或 2000+，并确保 header/sider 的 z-index < var(--z-overlay)。

- 方案 B：移除/避免不必要的 stacking context
  - 清理 Markdown 全屏祖先上的 transform/filter/opacity 等属性。
  - 将 Markdown 全屏容器提升到不会被 transform 的祖先之外。

- 方案 C：统一 z-index 设计系统
  - 定义 tokens，例如：
    - header/sider: 100
    - drawer: 1200
    - modal/fullscreen: 2000
    - tooltip/popover: 3000
    - dev-overlay: 9000
  - 确保 Markdown 全屏使用 modal/fullscreen 的层级，并且 header/sider 不超过该层。

## 验收标准
- 在 Chrome/Firefox/Safari 中，触发 Markdown 全屏后不被 header/sider/right-panel 遮挡。
- 在不同窗口尺寸与页面滚动状态下，层级关系正确。
- DevTools 层叠检查显示 Markdown 全屏所在层级高于 header/sider/right-panel。

## 参考代码（示例）
```tsx
import { createPortal } from 'react-dom'

export function MarkdownFullscreen({ open, children }) {
  if (!open) return null
  const root = document.getElementById('overlay-root')
  return root
    ? createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: 2000,
          background: 'var(--overlay-bg, rgba(0,0,0,0.6))'
        }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            {children}
          </div>
        </div>,
        root
      )
    : null
}
```

---
注：待 MCP 任务系统恢复后，将本文件作为主文档同步到任务并指派给 ai-pm。

