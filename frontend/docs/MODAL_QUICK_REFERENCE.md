# Modal配置快速参考

## 🚀 快速开始

```typescript
import { useModalConfig } from '../hooks/useModalConfig';

const MyModal = () => {
  const modalConfig = useModalConfig();

  return (
    <Modal {...modalConfig} title="我的弹窗" open={visible}>
      内容...
    </Modal>
  );
};
```

## 📐 预定义尺寸

```typescript
import { useModalConfig, MODAL_SIZES } from '../hooks/useModalConfig';

// Small (520px) - 简单表单
const modalConfig = useModalConfig({ width: MODAL_SIZES.small });

// Medium (700px) - 标准弹窗 [默认]
const modalConfig = useModalConfig({ width: MODAL_SIZES.medium });

// Large (900px) - 复杂表单
const modalConfig = useModalConfig({ width: MODAL_SIZES.large });

// XLarge (1200px) - 数据展示
const modalConfig = useModalConfig({ width: MODAL_SIZES.xlarge });
```

## ⚡ 快捷函数

```typescript
import {
  useSmallModalConfig,
  useLargeModalConfig
} from '../hooks/useModalConfig';

// 一行搞定！
const modalConfig = useLargeModalConfig();
```

## 🎨 自定义配置

```typescript
const modalConfig = useModalConfig({
  width: 800,                         // 宽度
  maxHeight: 'calc(100vh - 250px)',  // 最大高度
  centered: true,                     // 垂直居中
  bodyStyle: { padding: '24px' },    // 额外样式
  disableScroll: false,               // 禁用滚动
});
```

## ✅ 默认功能

所有使用 `useModalConfig` 的Modal自动获得：

- ✅ 垂直居中显示
- ✅ 长内容自动滚动
- ✅ 响应式宽度适配
- ✅ 为滚动条预留空间

## 📝 常见用法

### 表单弹窗
```typescript
const modalConfig = useModalConfig({ width: 600 });
```

### 详情弹窗
```typescript
const modalConfig = useModalConfig({
  width: 900,
  maxHeight: 'calc(100vh - 150px)'
});
```

### 确认对话框
```typescript
const modalConfig = useModalConfig({
  width: MODAL_SIZES.small,
  disableScroll: true
});
```

## 🔗 相关文档

- 完整指南: [MODAL_GUIDELINES.md](./MODAL_GUIDELINES.md)
- 源码: [useModalConfig.ts](../hooks/useModalConfig.ts)
