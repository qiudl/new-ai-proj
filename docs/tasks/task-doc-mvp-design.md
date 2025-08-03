# 任务文档管理 - 1天MVP设计

## 1. 核心理念

**极简目标**：1天内实现任务文档的基础功能，专注核心价值验证。

### 1.1 MVP范围定义
- ✅ 每个任务有一个Markdown文档
- ✅ 可以查看和编辑文档
- ✅ 文档存储在文件系统
- ❌ 不考虑权限控制（继承任务权限）
- ❌ 不考虑并发冲突
- ❌ 不考虑版本历史
- ❌ 不考虑搜索功能

### 1.2 技术决策
- **后端**：在现有任务管理API中增加3个接口
- **前端**：在任务详情页增加"文档"Tab
- **存储**：纯文件系统，不涉及数据库变更
- **编辑器**：使用现成的Markdown编辑器组件

## 2. 文件结构

### 2.1 目录组织
```
/docs/
└── tasks/
    ├── 12345.md          # 任务12345的文档
    ├── 12346.md          # 任务12346的文档
    └── 12347.md          # 任务12347的文档
```

**说明**：
- 一个任务一个Markdown文件
- 文件名 = 任务ID + `.md`
- 无需复杂的目录结构

### 2.2 文档模板

```markdown
# 任务：{任务标题}

## 需求描述
<!-- 在这里描述任务的具体需求 -->

## 技术方案
<!-- 在这里描述实现方案 -->

## 实现进度
- [ ] 需求分析
- [ ] 技术设计
- [ ] 代码实现
- [ ] 测试验证

## 备注
<!-- 其他相关信息 -->
```

## 3. API设计

### 3.1 接口列表（3个接口）

```http
# 1. 获取任务文档内容
GET /api/tasks/{taskId}/document
Response: 文档内容（纯文本）

# 2. 保存任务文档内容
PUT /api/tasks/{taskId}/document
Body: 文档内容（纯文本）
Response: 成功状态

# 3. 检查文档是否存在
HEAD /api/tasks/{taskId}/document
Response: 200/404
```

### 3.2 具体实现（Node.js示例）

```javascript
// 在现有的任务路由中添加
const path = require('path');
const fs = require('fs').promises;

const DOCS_BASE_PATH = '/docs/tasks';

// 确保文档目录存在
async function ensureDocsDir() {
    try {
        await fs.mkdir(DOCS_BASE_PATH, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

// 获取文档文件路径
function getDocumentPath(taskId) {
    return path.join(DOCS_BASE_PATH, `${taskId}.md`);
}

// 获取文档内容
router.get('/tasks/:taskId/document', async (req, res) => {
    try {
        const { taskId } = req.params;
        const filePath = getDocumentPath(taskId);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            res.json({ content });
        } catch (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在，返回默认模板
                const defaultContent = generateDefaultTemplate(taskId);
                res.json({ content: defaultContent });
            } else {
                throw err;
            }
        }
    } catch (err) {
        res.status(500).json({ error: '读取文档失败' });
    }
});

// 保存文档内容
router.put('/tasks/:taskId/document', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        
        await ensureDocsDir();
        const filePath = getDocumentPath(taskId);
        await fs.writeFile(filePath, content, 'utf8');
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '保存文档失败' });
    }
});

// 检查文档是否存在
router.head('/tasks/:taskId/document', async (req, res) => {
    try {
        const { taskId } = req.params;
        const filePath = getDocumentPath(taskId);
        
        try {
            await fs.access(filePath);
            res.status(200).end();
        } catch (err) {
            res.status(404).end();
        }
    } catch (err) {
        res.status(500).end();
    }
});

// 生成默认模板
function generateDefaultTemplate(taskId) {
    // 这里可以调用现有的任务API获取任务信息
    return `# 任务文档

## 需求描述
<!-- 在这里描述任务的具体需求 -->

## 技术方案
<!-- 在这里描述实现方案 -->

## 实现进度
- [ ] 需求分析
- [ ] 技术设计
- [ ] 代码实现
- [ ] 测试验证

## 备注
<!-- 其他相关信息 -->
`;
}
```

## 4. 前端实现

### 4.1 在任务详情页增加文档Tab

```jsx
// TaskDetailPage.jsx
import { useState, useEffect } from 'react';
import { Tabs } from 'antd';
// 假设已有Markdown编辑器组件
import MarkdownEditor from '@/components/MarkdownEditor';

function TaskDetailPage({ taskId }) {
    const [activeTab, setActiveTab] = useState('info');
    const [documentContent, setDocumentContent] = useState('');
    const [loading, setLoading] = useState(false);

    // 加载文档内容
    const loadDocument = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/tasks/${taskId}/document`);
            const data = await response.json();
            setDocumentContent(data.content);
        } catch (err) {
            console.error('加载文档失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 保存文档内容
    const saveDocument = async (content) => {
        try {
            await fetch(`/api/tasks/${taskId}/document`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            setDocumentContent(content);
            // 显示保存成功提示
        } catch (err) {
            console.error('保存文档失败:', err);
        }
    };

    // Tab切换到文档时加载内容
    useEffect(() => {
        if (activeTab === 'document') {
            loadDocument();
        }
    }, [activeTab]);

    const tabItems = [
        {
            key: 'info',
            label: '任务信息',
            children: <TaskInfo taskId={taskId} />
        },
        {
            key: 'document',
            label: '任务文档',
            children: (
                <div style={{ height: '600px' }}>
                    {loading ? (
                        <div>加载中...</div>
                    ) : (
                        <MarkdownEditor
                            value={documentContent}
                            onChange={saveDocument}
                            placeholder="开始编写任务文档..."
                        />
                    )}
                </div>
            )
        }
    ];

    return (
        <div>
            <h1>任务详情</h1>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />
        </div>
    );
}
```

### 4.2 简单的Markdown编辑器

```jsx
// MarkdownEditor.jsx
import { useState, useEffect } from 'react';
import { Input, Button, Space } from 'antd';
import ReactMarkdown from 'react-markdown';

const { TextArea } = Input;

function MarkdownEditor({ value, onChange, placeholder }) {
    const [content, setContent] = useState(value || '');
    const [preview, setPreview] = useState(false);

    useEffect(() => {
        setContent(value || '');
    }, [value]);

    const handleSave = () => {
        onChange(content);
    };

    const handleChange = (e) => {
        setContent(e.target.value);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16 }}>
                <Space>
                    <Button 
                        type={preview ? 'default' : 'primary'}
                        onClick={() => setPreview(false)}
                    >
                        编辑
                    </Button>
                    <Button 
                        type={preview ? 'primary' : 'default'}
                        onClick={() => setPreview(true)}
                    >
                        预览
                    </Button>
                    <Button type="primary" onClick={handleSave}>
                        保存
                    </Button>
                </Space>
            </div>
            
            <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                {preview ? (
                    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                ) : (
                    <TextArea
                        value={content}
                        onChange={handleChange}
                        placeholder={placeholder}
                        style={{ 
                            height: '100%', 
                            border: 'none', 
                            resize: 'none',
                            borderRadius: 0
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default MarkdownEditor;
```

## 5. 部署和配置

### 5.1 确保文档目录权限

```bash
# 创建文档目录
mkdir -p /docs/tasks

# 设置权限（开发环境）
chmod 755 /docs/tasks

# 生产环境需要设置合适的用户权限
chown -R app:app /docs/tasks
```

### 5.2 环境变量配置

```bash
# .env
DOCS_BASE_PATH=/docs/tasks
```

## 6. 测试验证

### 6.1 功能测试checklist

- [ ] 打开任务详情页，能看到"任务文档"Tab
- [ ] 点击文档Tab，能加载默认模板
- [ ] 能在编辑器中输入内容
- [ ] 点击保存按钮，内容能持久保存
- [ ] 刷新页面，文档内容还在
- [ ] 切换到预览模式，Markdown能正确渲染

### 6.2 简单的手动测试

```bash
# 1. 创建一个测试文档
curl -X PUT http://localhost:3000/api/tasks/12345/document \
  -H "Content-Type: application/json" \
  -d '{"content":"# 测试文档\n这是一个测试"}'

# 2. 读取文档
curl http://localhost:3000/api/tasks/12345/document

# 3. 检查文件是否创建
ls -la /docs/tasks/12345.md
```

## 7. 1天开发时间分配

### 上午（4小时）
- **1小时**：搭建基础目录结构，配置环境
- **1小时**：实现3个后端API接口
- **2小时**：实现前端Markdown编辑器组件

### 下午（4小时）
- **2小时**：集成到现有任务详情页面
- **1小时**：功能测试和Bug修复
- **1小时**：简单的部署和文档

## 8. 风险控制

### 8.1 技术风险
- **文件权限问题**：提前配置好目录权限
- **Markdown编辑器**：使用成熟的开源组件
- **API集成**：复用现有的路由和中间件

### 8.2 时间风险
- **功能裁剪**：严格按照MVP范围，不增加任何额外功能
- **测试简化**：只做基础的功能验证，不写自动化测试
- **UI简化**：使用最基础的布局和样式

## 9. 后续迭代规划

### 第2天可以考虑的功能
- 自动保存（定时保存）
- 文档存在状态显示
- 基础的错误处理

### 第3-5天可以考虑的功能
- 简单的权限控制
- 文档搜索
- 模板管理

### 长期规划
- 版本历史
- 实时协作
- 高级编辑器功能

---

**关键成功因素**：
1. 严格控制功能范围，不做任何"顺便"的优化
2. 复用现有的组件和基础设施
3. 采用最简单可行的技术方案
4. 专注于核心价值验证：任务是否需要文档功能

这个1天MVP方案确保在最短时间内验证核心价值，为后续迭代奠定基础。