import React, { useState } from 'react';
import { Card, Space } from 'antd';
import TaskMarkdownEditor from './TaskMarkdownEditor';

const MarkdownTest: React.FC = () => {
  const [value, setValue] = useState(`# Markdown测试

这是一个**粗体**文本和*斜体*文本的示例。

## 功能测试

- ✅ 列表项目1
- ✅ 列表项目2  
- ✅ 列表项目3

### 代码示例

\`\`\`javascript
function hello() {
  console.log("Hello Markdown!");
}
\`\`\`

### 链接测试

这是一个[链接示例](https://example.com)。

### 引用

> 这是一个引用块的示例
> 可以包含多行内容

### 表格测试

| 功能 | 状态 | 备注 |
|------|------|------|
| 粗体 | ✅ | 正常 |
| 斜体 | ✅ | 正常 |
| 代码 | ✅ | 正常 |
`);

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="TaskMarkdownEditor 测试">
          <TaskMarkdownEditor
            value={value}
            onChange={setValue}
            placeholder="在这里测试Markdown编辑器..."
            rows={8}
          />
        </Card>
      </Space>
    </div>
  );
};

export default MarkdownTest;