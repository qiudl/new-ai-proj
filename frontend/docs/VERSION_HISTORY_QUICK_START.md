# 版本历史功能快速开始

## 5分钟快速集成

### 1. 导入组件

```tsx
import { VersionHistoryModal } from '@/components/VersionHistory';
```

### 2. 添加到你的组件

```tsx
function DocumentEditor() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      {/* 你的编辑器内容 */}
      <Button onClick={() => setShowHistory(true)}>
        📜 版本历史
      </Button>

      {/* 版本历史弹窗 */}
      <VersionHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        projectId={projectId}
        taskId={taskId}
        documentId={documentId}
        documentTitle={documentTitle}
      />
    </div>
  );
}
```

### 3. 完成！

就这么简单！组件已经内置了所有功能：
- ✅ 版本对比
- ✅ 导航和快捷键
- ✅ 性能优化
- ✅ 错误处理

---

## 快捷键

| 按键 | 功能 |
|------|------|
| `←` | 上一个版本 |
| `→` | 下一个版本 |
| `Ctrl+S` | 交换对比 |
| `ESC` | 关闭 |

---

## 性能说明

### 自动优化
- **< 20版本**: 即时加载，无延迟
- **> 20版本**: 自动启用虚拟滚动 + 后台计算
- **> 500行diff**: 分页显示，按需加载
- **> 1000行diff**: 显示警告，优化体验

### 无需配置
所有性能优化都是自动的，开箱即用！

---

## API要求

你的后端API需要返回这样的数据结构：

```typescript
// GET /api/projects/:projectId/tasks/:taskId/documents/:documentId/versions
{
  "versions": [
    {
      "id": 1,
      "versionNumber": "v1.0",
      "content": "# 文档内容...",
      "description": "初始版本",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": 1,
      "size": 1024,
      "hash": "abc123"
    }
  ]
}
```

---

## 常见问题

**Q: 如何自定义颜色？**
A: 编辑 `DiffLine.css` 文件中的颜色变量

**Q: 支持哪些文件格式？**
A: 目前支持Markdown文本，未来会支持更多格式

**Q: 移动端能用吗？**
A: 完全支持！布局会自动适配手机屏幕

---

## 需要帮助？

查看完整文档：`docs/VERSION_HISTORY_IMPLEMENTATION.md`

---

**开始使用吧！** 🚀
