# Modal 弹窗组件使用规范

本文档定义了项目中所有Modal弹窗组件的设计规范和最佳实践。

## 📋 目录

1. [设计原则](#设计原则)
2. [使用 useModalConfig Hook](#使用-usemodalconfig-hook)
3. [响应式设计](#响应式设计)
4. [常见场景示例](#常见场景示例)
5. [迁移指南](#迁移指南)
6. [故障排除](#故障排除)

---

## 设计原则

### ✅ 必须遵循

1. **垂直居中**: 所有Modal必须设置 `centered={true}` 和 `style={{ top: 20 }}`
2. **内容滚动**: 长内容必须支持滚动，确保操作按钮始终可见
3. **响应式宽度**: 使用 `getResponsiveModalWidth` 或 `useModalConfig`
4. **最大高度限制**: 内容区域建议使用 `calc(100vh - 300px)` 确保垂直居中效果

### ❌ 禁止做法

1. ❌ 不设置 `centered`，导致弹窗不居中
2. ❌ 内容过长时不添加滚动，遮挡操作按钮
3. ❌ 使用固定宽度，不考虑移动端适配
4. ❌ 嵌套过多层级的滚动容器

---

## 使用 useModalConfig Hook

### 基础用法

```tsx
import { Modal } from 'antd';
import { useModalConfig } from '../hooks/useModalConfig';

const MyModal: React.FC<Props> = ({ visible, onCancel }) => {
  // 使用默认配置（宽度700px，自动居中和滚动）
  const modalConfig = useModalConfig();

  return (
    <Modal
      {...modalConfig}
      title="我的弹窗"
      open={visible}
      onCancel={onCancel}
    >
      <div>弹窗内容...</div>
    </Modal>
  );
};
```

### 自定义宽度

```tsx
// 使用自定义宽度
const modalConfig = useModalConfig({ width: 900 });

// 或使用预定义尺寸
import { useLargeModalConfig } from '../hooks/useModalConfig';
const modalConfig = useLargeModalConfig(); // 900px
```

### 完整配置选项

```tsx
const modalConfig = useModalConfig({
  width: 800,                           // 弹窗宽度
  maxHeight: 'calc(100vh - 250px)',    // 内容最大高度
  centered: true,                       // 是否垂直居中
  bodyStyle: {                          // 额外的body样式
    padding: '24px',
  },
  disableScroll: false,                 // 是否禁用滚动
});
```

---

## 响应式设计

### 预定义尺寸

```tsx
import { MODAL_SIZES } from '../hooks/useModalConfig';

// MODAL_SIZES.small   => 520px  - 简单表单
// MODAL_SIZES.medium  => 700px  - 标准弹窗（默认）
// MODAL_SIZES.large   => 900px  - 复杂表单
// MODAL_SIZES.xlarge  => 1200px - 数据展示

const modalConfig = useModalConfig({
  width: MODAL_SIZES.large
});
```

### 移动端适配

`useModalConfig` 内部已集成 `getResponsiveModalWidth`，会自动处理：
- 桌面端: 使用指定宽度
- 平板端: 最大宽度 90%
- 移动端: 全屏宽度

---

## 常见场景示例

### 1. 表单提交弹窗

```tsx
const FormModal: React.FC = () => {
  const modalConfig = useModalConfig({ width: 600 });

  return (
    <Modal
      {...modalConfig}
      title="编辑信息"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
    >
      <Form>
        <Form.Item label="名称">
          <Input />
        </Form.Item>
        {/* 更多表单项... */}
      </Form>
    </Modal>
  );
};
```

### 2. 详情查看弹窗（长内容）

```tsx
const DetailModal: React.FC = () => {
  const modalConfig = useModalConfig({
    width: 900,
    maxHeight: 'calc(100vh - 150px)', // 更大的可视区域
  });

  return (
    <Modal
      {...modalConfig}
      title="详细信息"
      open={visible}
      footer={null}
    >
      <div>
        {/* 长内容会自动滚动 */}
        {longContent}
      </div>
    </Modal>
  );
};
```

### 3. 确认对话框（小尺寸）

```tsx
const ConfirmModal: React.FC = () => {
  const modalConfig = useModalConfig({
    width: MODAL_SIZES.small,
    disableScroll: true, // 内容简短，不需要滚动
  });

  return (
    <Modal
      {...modalConfig}
      title="确认删除"
      open={visible}
      onOk={handleDelete}
      onCancel={onCancel}
    >
      <p>确定要删除这条记录吗？此操作不可恢复。</p>
    </Modal>
  );
};
```

### 4. 多步骤向导

```tsx
const WizardModal: React.FC = () => {
  const modalConfig = useModalConfig({
    width: 800,
    bodyStyle: {
      minHeight: '400px', // 保持固定高度，避免步骤切换时抖动
    },
  });

  return (
    <Modal
      {...modalConfig}
      title={`步骤 ${currentStep}/3`}
      open={visible}
      footer={customFooter}
    >
      <Steps current={currentStep}>
        {/* 步骤内容 */}
      </Steps>
    </Modal>
  );
};
```

---

## 迁移指南

### 从旧版Modal迁移

**迁移前**:
```tsx
<Modal
  title="标题"
  visible={visible}
  onCancel={onCancel}
  width={700}
>
  内容
</Modal>
```

**迁移后**:
```tsx
import { useModalConfig } from '../hooks/useModalConfig';

const modalConfig = useModalConfig({ width: 700 });

<Modal
  {...modalConfig}
  title="标题"
  open={visible}  // ⚠️ 注意: visible改为open（Ant Design 5.x）
  onCancel={onCancel}
>
  内容
</Modal>
```

### 迁移检查清单

- [ ] 引入 `useModalConfig` Hook
- [ ] 移除手动设置的 `centered`、`width`、`bodyStyle`
- [ ] 确认 `visible` 改为 `open`（如果是Ant Design 5.x）
- [ ] 测试长内容滚动
- [ ] 测试移动端显示

---

## 故障排除

### Q: 弹窗没有真正垂直居中？

**A**: Ant Design的 `centered` 属性会基于弹窗实际高度计算居中位置。如果 `maxHeight` 设置过大（如 `calc(100vh - 200px)`），会导致视觉上不居中。建议使用 `calc(100vh - 300px)` 并配合 `style={{ top: 20 }}` 来确保正确的垂直居中效果。

### Q: 弹窗内容无法滚动？

**A**: 检查是否设置了 `disableScroll: true`，或者内容外层有其他滚动容器。

```tsx
// ❌ 错误：禁用了滚动
const modalConfig = useModalConfig({ disableScroll: true });

// ✅ 正确：允许滚动
const modalConfig = useModalConfig();
```

### Q: 滚动条遮挡内容？

**A**: `useModalConfig` 已自动添加 `paddingRight: '8px'` 为滚动条预留空间。如果仍有问题，可以增加padding：

```tsx
const modalConfig = useModalConfig({
  bodyStyle: {
    paddingRight: '16px', // 增加右侧padding
  },
});
```

### Q: 底部按钮仍然被遮挡？

**A**: 检查是否正确使用了 `footer` prop：

```tsx
// ✅ 正确：footer在Modal组件上
<Modal
  {...modalConfig}
  footer={[<Button key="ok">确定</Button>]}
>
  内容
</Modal>

// ❌ 错误：footer放在内容里
<Modal {...modalConfig}>
  <div>
    内容
    <div className="footer">按钮</div> {/* 会被滚动容器包含 */}
  </div>
</Modal>
```

### Q: 移动端弹窗太宽？

**A**: `useModalConfig` 已自动处理响应式，确保你没有覆盖 `width` 属性：

```tsx
// ❌ 错误：覆盖了响应式宽度
<Modal {...modalConfig} width={1000}>

// ✅ 正确：使用Hook提供的宽度
<Modal {...modalConfig}>
```

---

## 最佳实践总结

1. **始终使用 useModalConfig**: 除非有特殊需求，否则统一使用Hook
2. **选择合适的尺寸**: 根据内容复杂度选择 small/medium/large/xlarge
3. **保持内容简洁**: 避免在弹窗中放置过多内容，考虑分页或分步骤
4. **测试长内容**: 确保内容过多时滚动正常
5. **移动端优先**: 始终在移动设备上测试弹窗表现

---

**更新日期**: 2025-11-09
**维护者**: Frontend Team
**相关文档**: [useModalConfig API文档](../hooks/useModalConfig.ts)
