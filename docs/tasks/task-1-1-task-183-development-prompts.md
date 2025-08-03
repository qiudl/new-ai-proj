# 🎯 任务编辑页功能完善开发Prompts - 任务#183

> **任务ID**: 183  
> **项目**: AI项目管理平台MVP  
> **创建时间**: 2025-08-03  
> **预估总工时**: 41小时

---

## 📋 项目背景Prompt

```
作为AI项目管理平台的前端开发专家，我需要完善任务编辑页功能，使其与弹窗编辑任务保持一致的功能和体验。

现状分析：
- 任务编辑页功能不完整，与弹窗编辑差异较大
- 用户体验不一致，造成操作困惑
- 缺少一些高级编辑功能和字段

技术环境：React 18 + TypeScript + Ant Design 5.x
目标：创建功能完整、体验一致的任务编辑界面

请提供专业的功能完善方案和最佳实践。
```

---

## 🎯 Phase 1: 基础编辑组件完善

### 任务188: 完善基础任务信息编辑组件
**预估工时**: 8小时

#### Prompt 1.1: 任务基础信息表单设计

```
重新设计任务编辑页的基础信息表单，确保与弹窗编辑功能完全一致：

表单字段要求：
1. 任务标题：
   - Input组件，支持实时验证
   - 最大长度限制和字符计数
   - 空值验证和重复标题检查

2. 任务描述：
   - TextArea组件，支持Markdown编辑
   - 高度自适应，最小3行
   - 字符计数和长度限制

3. 任务状态：
   - Select下拉选择
   - 状态选项：todo, in_progress, completed, cancelled
   - 状态变更日志记录

4. 优先级设置：
   - Radio.Group组件
   - 优先级：低、中、高
   - 颜色标识和图标提示

5. 截止时间：
   - DatePicker组件
   - 支持时间选择
   - 逾期提醒和验证

表单验证规则：
```typescript
const validationRules = {
  title: [
    { required: true, message: '请输入任务标题' },
    { max: 100, message: '标题不能超过100个字符' }
  ],
  status: [
    { required: true, message: '请选择任务状态' }
  ],
  dueDate: [
    { 
      validator: (_, value) => {
        if (value && value.isBefore(dayjs())) {
          return Promise.reject('截止时间不能早于当前时间');
        }
        return Promise.resolve();
      }
    }
  ]
};
```

组件设计：
```typescript
interface TaskBasicFormProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  onValidationChange: (isValid: boolean) => void;
}

const TaskBasicForm: React.FC<TaskBasicFormProps> = ({
  task,
  onUpdate,
  onValidationChange
}) => {
  const [form] = Form.useForm();
  
  // 实时保存逻辑
  const handleFieldChange = useDebouncedCallback(
    async (changedFields: any[]) => {
      try {
        const values = await form.validateFields();
        await onUpdate(values);
      } catch (error) {
        console.error('保存失败:', error);
      }
    },
    1000
  );

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={task}
      onFieldsChange={handleFieldChange}
      onValuesChange={() => {
        form.validateFields()
          .then(() => onValidationChange(true))
          .catch(() => onValidationChange(false));
      }}
    >
      {/* 表单字段实现 */}
    </Form>
  );
};
```

请提供完整的基础信息表单组件实现。
```

#### Prompt 1.2: 高级字段和自定义字段支持

```
实现任务编辑页的高级字段和自定义字段编辑功能：

高级字段包括：
1. 任务分配：
   - Select组件，支持搜索
   - 用户头像和名称显示
   - 多人分配支持

2. 预估工时：
   - InputNumber组件
   - 小时/天单位切换
   - 工时统计和预警

3. 实际工时：
   - 只读显示，来自计时系统
   - 与预估工时对比
   - 效率分析指标

4. 任务标签：
   - Select.Multiple组件
   - 支持创建新标签
   - 标签颜色管理

5. 任务附件：
   - Upload组件
   - 文件类型限制
   - 预览和下载功能

自定义字段系统：
```typescript
interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

const CustomFieldRenderer: React.FC<{
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
}> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'text':
      return (
        <Input
          placeholder={`请输入${field.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <Select
          placeholder={`请选择${field.label}`}
          value={value}
          onChange={onChange}
          allowClear
        >
          {field.options?.map(option => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    // 其他字段类型实现...
  }
};
```

文件上传组件：
```typescript
const TaskAttachmentUpload: React.FC<{
  taskId: number;
  attachments: TaskAttachment[];
  onUpdate: (attachments: TaskAttachment[]) => void;
}> = ({ taskId, attachments, onUpdate }) => {
  const uploadProps: UploadProps = {
    name: 'file',
    action: `/api/v1/tasks/${taskId}/attachments`,
    headers: {
      authorization: `Bearer ${getAuthToken()}`,
    },
    fileList: attachments,
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
      onUpdate(info.fileList as TaskAttachment[]);
    },
    beforeUpload: (file) => {
      const isValidType = ['image/*', 'application/pdf', 'text/*'].some(type =>
        file.type.match(type)
      );
      if (!isValidType) {
        message.error('只能上传图片、PDF或文本文件');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB');
        return false;
      }
      return true;
    },
  };

  return (
    <Upload.Dragger {...uploadProps}>
      <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      <div>点击或拖拽文件到此区域上传</div>
      <div style={{ color: '#666' }}>
        支持图片、PDF、文本文件，单个文件不超过10MB
      </div>
    </Upload.Dragger>
  );
};
```

请提供完整的高级字段和自定义字段实现。
```

### 任务189: 任务层级关系管理组件
**预估工时**: 6小时

#### Prompt 1.3: 父子任务关系管理

```
实现任务编辑页的层级关系管理功能：

功能需求：
1. 父任务选择：
   - TreeSelect组件显示项目任务树
   - 防止循环依赖验证
   - 层级深度限制检查

2. 子任务管理：
   - 显示当前任务的所有子任务
   - 支持快速创建子任务
   - 子任务状态统计

3. 兄弟任务导航：
   - 显示同级任务列表
   - 快速切换编辑功能
   - 排序调整支持

组件实现：
```typescript
interface TaskHierarchyManagerProps {
  task: Task;
  allTasks: Task[];
  onParentChange: (parentId: number | null) => void;
  onCreateSubtask: (subtaskData: Partial<Task>) => void;
  onTaskNavigate: (taskId: number) => void;
}

const TaskHierarchyManager: React.FC<TaskHierarchyManagerProps> = ({
  task,
  allTasks,
  onParentChange,
  onCreateSubtask,
  onTaskNavigate
}) => {
  // 构建任务树数据
  const taskTreeData = useMemo(() => {
    return buildTaskTree(allTasks, task.id);
  }, [allTasks, task.id]);

  // 获取子任务列表
  const subtasks = useMemo(() => {
    return allTasks.filter(t => t.parent_id === task.id);
  }, [allTasks, task.id]);

  // 获取兄弟任务列表
  const siblingTasks = useMemo(() => {
    return allTasks.filter(t => 
      t.parent_id === task.parent_id && t.id !== task.id
    );
  }, [allTasks, task.parent_id, task.id]);

  // 验证父任务选择的有效性
  const validateParentSelection = (parentId: number): boolean => {
    // 不能选择自己作为父任务
    if (parentId === task.id) return false;
    
    // 不能选择自己的子任务作为父任务（防止循环）
    const isDescendant = (targetId: number, checkId: number): boolean => {
      const children = allTasks.filter(t => t.parent_id === checkId);
      return children.some(child => 
        child.id === targetId || isDescendant(targetId, child.id)
      );
    };
    
    return !isDescendant(parentId, task.id);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* 父任务选择 */}
      <Card size="small" title="父任务">
        <TreeSelect
          style={{ width: '100%' }}
          placeholder="选择父任务（可选）"
          allowClear
          treeData={taskTreeData}
          value={task.parent_id}
          onChange={(value) => {
            if (!value || validateParentSelection(value)) {
              onParentChange(value);
            } else {
              message.error('不能选择自己或子任务作为父任务');
            }
          }}
          treeNodeFilterProp="title"
          showSearch
        />
      </Card>

      {/* 子任务管理 */}
      <Card 
        size="small" 
        title={`子任务 (${subtasks.length})`}
        extra={
          <Button 
            size="small" 
            type="primary" 
            onClick={() => {
              const newSubtask = {
                title: '新子任务',
                parent_id: task.id,
                project_id: task.project_id,
                status: 'todo' as const
              };
              onCreateSubtask(newSubtask);
            }}
          >
            添加子任务
          </Button>
        }
      >
        {subtasks.length > 0 ? (
          <List
            size="small"
            dataSource={subtasks}
            renderItem={(subtask) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onTaskNavigate(subtask.id)}
                  >
                    编辑
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{subtask.title}</span>
                      <Tag color={getStatusColor(subtask.status)}>
                        {subtask.status}
                      </Tag>
                    </Space>
                  }
                  description={`创建于 ${dayjs(subtask.created_at).format('YYYY-MM-DD')}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无子任务" />
        )}
      </Card>

      {/* 兄弟任务导航 */}
      {siblingTasks.length > 0 && (
        <Card size="small" title="同级任务">
          <Space wrap>
            {siblingTasks.map((sibling) => (
              <Button
                key={sibling.id}
                size="small"
                onClick={() => onTaskNavigate(sibling.id)}
              >
                {sibling.title}
              </Button>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
};
```

请提供完整的层级关系管理组件实现。
```

---

## 🎯 Phase 2: 高级编辑组件

### 任务190: 任务文档编辑器集成
**预估工时**: 8小时

#### Prompt 2.1: Markdown文档编辑器

```
在任务编辑页集成专业的Markdown文档编辑器：

编辑器功能要求：
1. 实时预览：
   - 分屏显示编辑和预览
   - 同步滚动支持
   - 快速切换模式

2. 工具栏功能：
   - 格式化按钮（粗体、斜体、标题等）
   - 插入功能（链接、图片、表格）
   - 代码块和引用支持

3. 高级功能：
   - 语法高亮
   - 自动补全
   - 快捷键支持
   - 本地存储草稿

组件实现：
```typescript
interface TaskDocumentEditorProps {
  taskId: number;
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  onAutoSave?: (content: string) => void;
}

const TaskDocumentEditor: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  initialContent = '',
  onSave,
  onAutoSave
}) => {
  const [content, setContent] = useState(initialContent);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 自动保存功能
  const debouncedAutoSave = useDebouncedCallback(
    (newContent: string) => {
      if (onAutoSave) {
        onAutoSave(newContent);
        setLastSaved(new Date());
      }
    },
    2000
  );

  // 内容变更处理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedAutoSave(newContent);
    
    // 本地存储草稿
    localStorage.setItem(`task-${taskId}-draft`, newContent);
  };

  // 保存文档
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
      message.success('文档保存成功');
      
      // 清除草稿
      localStorage.removeItem(`task-${taskId}-draft`);
    } catch (error) {
      message.error('文档保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 工具栏操作
  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('.markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    handleContentChange(newContent);
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // 工具栏配置
  const toolbarActions = [
    {
      key: 'bold',
      icon: <BoldOutlined />,
      title: '粗体',
      action: () => insertText('**', '**')
    },
    {
      key: 'italic',
      icon: <ItalicOutlined />,
      title: '斜体',
      action: () => insertText('*', '*')
    },
    {
      key: 'heading',
      icon: <MenuOutlined />,
      title: '标题',
      action: () => insertText('\n## ', '\n')
    },
    {
      key: 'code',
      icon: <CodeOutlined />,
      title: '代码块',
      action: () => insertText('\n```\n', '\n```\n')
    },
    {
      key: 'link',
      icon: <LinkOutlined />,
      title: '链接',
      action: () => insertText('[', '](url)')
    },
    {
      key: 'table',
      icon: <TableOutlined />,
      title: '表格',
      action: () => insertText('\n| 列1 | 列2 |\n|------|------|\n| 内容 | 内容 |\n')
    }
  ];

  return (
    <Card 
      title="任务文档"
      extra={
        <Space>
          <Radio.Group
            value={previewMode}
            onChange={(e) => setPreviewMode(e.target.value)}
            size="small"
          >
            <Radio.Button value="edit">编辑</Radio.Button>
            <Radio.Button value="split">分屏</Radio.Button>
            <Radio.Button value="preview">预览</Radio.Button>
          </Radio.Group>
          <Button 
            type="primary" 
            onClick={handleSave}
            loading={saving}
            icon={<SaveOutlined />}
          >
            保存
          </Button>
        </Space>
      }
    >
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
        <Space>
          {toolbarActions.map(action => (
            <Tooltip key={action.key} title={action.title}>
              <Button
                size="small"
                icon={action.icon}
                onClick={action.action}
              />
            </Tooltip>
          ))}
        </Space>
        {lastSaved && (
          <Text type="secondary" style={{ float: 'right', fontSize: '12px' }}>
            最后保存: {dayjs(lastSaved).format('HH:mm:ss')}
          </Text>
        )}
      </div>

      {/* 编辑器区域 */}
      <div style={{ height: '500px', display: 'flex' }}>
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div style={{ 
            flex: previewMode === 'split' ? 1 : 2,
            marginRight: previewMode === 'split' ? 8 : 0
          }}>
            <Input.TextArea
              className="markdown-editor"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="请输入任务文档内容，支持Markdown语法..."
              style={{ 
                height: '100%',
                resize: 'none',
                fontFamily: 'Monaco, Consolas, monospace'
              }}
            />
          </div>
        )}
        
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div style={{ 
            flex: 1,
            marginLeft: previewMode === 'split' ? 8 : 0,
            border: '1px solid #f0f0f0',
            borderRadius: '6px',
            padding: '16px',
            overflow: 'auto',
            backgroundColor: '#fafafa'
          }}>
            <ReactMarkdown
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneLight}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content || '*预览区域，开始编辑以查看效果*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </Card>
  );
};
```

请提供完整的Markdown编辑器组件实现。
```

### 任务191: 任务时间管理组件
**预估工时**: 7小时

#### Prompt 2.2: 计时器和时间记录

```
实现任务编辑页的计时器和时间管理功能：

功能需求：
1. 实时计时器：
   - 开始/暂停/停止计时
   - 计时状态显示
   - 后台计时保持

2. 时间记录：
   - 手动添加时间记录
   - 历史记录查看
   - 时间统计分析

3. 时间分析：
   - 工作效率图表
   - 时间分布饼图
   - 预估vs实际对比

组件实现：
```typescript
interface TaskTimerProps {
  taskId: number;
  estimatedHours: number;
  timeRecords: TimeRecord[];
  onTimeUpdate: (record: TimeRecord) => void;
}

interface TimeRecord {
  id: string;
  taskId: number;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  description?: string;
  type: 'automatic' | 'manual';
}

const TaskTimer: React.FC<TaskTimerProps> = ({
  taskId,
  estimatedHours,
  timeRecords,
  onTimeUpdate
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimeRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);

  // 计算总工时
  const totalMinutes = useMemo(() => {
    return timeRecords.reduce((sum, record) => sum + record.duration, 0);
  }, [timeRecords]);

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && currentSession) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentSession]);

  // 开始计时
  const startTimer = () => {
    const session: TimeRecord = {
      id: `timer-${Date.now()}`,
      taskId,
      startTime: new Date(),
      duration: 0,
      type: 'automatic'
    };
    
    setCurrentSession(session);
    setIsRunning(true);
    setElapsedTime(0);
  };

  // 暂停计时
  const pauseTimer = () => {
    setIsRunning(false);
  };

  // 停止计时
  const stopTimer = () => {
    if (currentSession) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 60000);
      
      const completedRecord: TimeRecord = {
        ...currentSession,
        endTime,
        duration
      };
      
      onTimeUpdate(completedRecord);
      setCurrentSession(null);
      setIsRunning(false);
      setElapsedTime(0);
    }
  };

  // 手动添加时间记录
  const addManualRecord = (values: any) => {
    const record: TimeRecord = {
      id: `manual-${Date.now()}`,
      taskId,
      startTime: values.startTime.toDate(),
      endTime: values.endTime.toDate(),
      duration: Math.floor((values.endTime.toDate().getTime() - values.startTime.toDate().getTime()) / 60000),
      description: values.description,
      type: 'manual'
    };
    
    onTimeUpdate(record);
    setShowManualForm(false);
  };

  // 格式化时间显示
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 时间分析数据
  const timeAnalysis = useMemo(() => {
    const estimatedMinutes = estimatedHours * 60;
    const efficiency = estimatedMinutes > 0 ? (totalMinutes / estimatedMinutes) * 100 : 0;
    
    // 按日期分组统计
    const dailyStats = timeRecords.reduce((stats, record) => {
      const date = dayjs(record.startTime).format('YYYY-MM-DD');
      stats[date] = (stats[date] || 0) + record.duration;
      return stats;
    }, {} as Record<string, number>);

    return {
      totalHours: totalMinutes / 60,
      estimatedHours,
      efficiency,
      dailyStats,
      recordCount: timeRecords.length
    };
  }, [totalMinutes, estimatedHours, timeRecords]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* 计时器控制 */}
      <Card title="计时器" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="当前计时"
              value={formatDuration(elapsedTime)}
              prefix={isRunning ? <PlayCircleOutlined style={{ color: '#52c41a' }} /> : <PauseCircleOutlined />}
            />
          </Col>
          <Col span={12}>
            <Space>
              {!isRunning ? (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={startTimer}>
                  开始计时
                </Button>
              ) : (
                <>
                  <Button icon={<PauseCircleOutlined />} onClick={pauseTimer}>
                    暂停
                  </Button>
                  <Button icon={<StopOutlined />} onClick={stopTimer}>
                    停止
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 时间统计 */}
      <Card title="时间统计" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总工时"
              value={timeAnalysis.totalHours}
              precision={1}
              suffix="小时"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="预估工时"
              value={timeAnalysis.estimatedHours}
              suffix="小时"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="完成效率"
              value={timeAnalysis.efficiency}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: timeAnalysis.efficiency > 100 ? '#ff4d4f' : '#52c41a' 
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="记录数"
              value={timeAnalysis.recordCount}
              suffix="条"
            />
          </Col>
        </Row>
      </Card>

      {/* 时间记录列表 */}
      <Card 
        title="时间记录" 
        size="small"
        extra={
          <Button 
            size="small" 
            onClick={() => setShowManualForm(true)}
          >
            手动添加
          </Button>
        }
      >
        <List
          size="small"
          dataSource={timeRecords.slice(0, 10)} // 显示最近10条
          renderItem={(record) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <span>{dayjs(record.startTime).format('MM-DD HH:mm')}</span>
                    <span>-</span>
                    <span>{record.endTime ? dayjs(record.endTime).format('HH:mm') : '进行中'}</span>
                    <Tag color={record.type === 'automatic' ? 'blue' : 'green'}>
                      {record.type === 'automatic' ? '自动' : '手动'}
                    </Tag>
                  </Space>
                }
                description={record.description || `计时 ${Math.floor(record.duration / 60)}小时${record.duration % 60}分钟`}
              />
              <div>{Math.floor(record.duration / 60)}h{record.duration % 60}m</div>
            </List.Item>
          )}
        />
      </Card>

      {/* 手动添加时间记录表单 */}
      <Modal
        title="手动添加时间记录"
        open={showManualForm}
        onCancel={() => setShowManualForm(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={addManualRecord}>
          <Form.Item
            name="startTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="endTime"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="description" label="工作描述">
            <Input.TextArea placeholder="描述本次工作内容..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加记录
              </Button>
              <Button onClick={() => setShowManualForm(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
```

请提供完整的计时器和时间管理组件实现。
```

---

## 🎯 Phase 3: 集成和API优化

### 任务192: 实时保存和冲突检测
**预估工时**: 6小时

#### Prompt 3.1: 自动保存和版本冲突

```
实现任务编辑页的实时保存和版本冲突检测机制：

功能需求：
1. 自动保存：
   - 防抖机制减少API调用
   - 字段级别差异检测
   - 网络异常处理

2. 冲突检测：
   - 多用户编辑检测
   - 版本号对比
   - 冲突解决策略

3. 离线支持：
   - 本地缓存机制
   - 离线编辑支持
   - 网络恢复同步

实现方案：
```typescript
interface EditSession {
  taskId: number;
  version: number;
  lastModified: Date;
  userId: number;
  changes: Partial<Task>;
  isOnline: boolean;
}

interface ConflictResolution {
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'merge';
}

const useTaskEditor = (taskId: number) => {
  const [task, setTask] = useState<Task | null>(null);
  const [editSession, setEditSession] = useState<EditSession | null>(null);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'conflict'>('saved');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 加载任务数据
  const loadTask = async () => {
    try {
      const response = await taskService.getTask(taskId);
      setTask(response.data);
      setEditSession({
        taskId,
        version: response.data.version,
        lastModified: new Date(response.data.updated_at),
        userId: getCurrentUserId(),
        changes: {},
        isOnline
      });
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  // 字段变更处理
  const handleFieldChange = useCallback((field: string, value: any) => {
    if (!task || !editSession) return;

    // 检查是否真的有变更
    if (task[field] === value) return;

    const newChanges = { ...editSession.changes, [field]: value };
    
    setEditSession(prev => prev ? {
      ...prev,
      changes: newChanges
    } : null);

    // 立即更新本地状态
    setTask(prev => prev ? { ...prev, [field]: value } : null);
    
    // 触发自动保存
    debouncedSave(newChanges);
  }, [task, editSession]);

  // 防抖保存
  const debouncedSave = useDebouncedCallback(
    async (changes: Partial<Task>) => {
      if (!isOnline) {
        // 离线时保存到本地
        saveToLocalStorage(taskId, changes);
        return;
      }

      await saveChanges(changes);
    },
    1500
  );

  // 保存变更
  const saveChanges = async (changes: Partial<Task>) => {
    if (!editSession || Object.keys(changes).length === 0) return;

    setSaveStatus('saving');
    
    try {
      // 检查版本冲突
      const currentTask = await taskService.getTask(taskId);
      
      if (currentTask.data.version !== editSession.version) {
        // 检测到版本冲突
        const detectedConflicts = detectConflicts(changes, currentTask.data);
        
        if (detectedConflicts.length > 0) {
          setConflicts(detectedConflicts);
          setSaveStatus('conflict');
          return;
        }
      }

      // 执行保存
      const response = await taskService.updateTask(taskId, {
        ...changes,
        version: editSession.version
      });

      // 更新编辑会话
      setEditSession(prev => prev ? {
        ...prev,
        version: response.data.version,
        lastModified: new Date(response.data.updated_at),
        changes: {}
      } : null);

      setSaveStatus('saved');
      
      // 清除本地缓存
      clearLocalStorage(taskId);
      
    } catch (error) {
      console.error('保存失败:', error);
      setSaveStatus('error');
      
      // 保存到本地作为备份
      saveToLocalStorage(taskId, changes);
    }
  };

  // 冲突检测
  const detectConflicts = (localChanges: Partial<Task>, remoteTask: Task): ConflictResolution[] => {
    const conflicts: ConflictResolution[] = [];
    
    Object.keys(localChanges).forEach(field => {
      const localValue = localChanges[field];
      const remoteValue = remoteTask[field];
      const originalValue = task?.[field];
      
      // 如果远程值和原始值不同，且本地也有修改，则认为有冲突
      if (remoteValue !== originalValue && localValue !== originalValue) {
        conflicts.push({
          field,
          localValue,
          remoteValue,
          resolution: 'local' // 默认使用本地值
        });
      }
    });
    
    return conflicts;
  };

  // 解决冲突
  const resolveConflicts = async (resolutions: ConflictResolution[]) => {
    const resolvedChanges: Partial<Task> = {};
    
    resolutions.forEach(resolution => {
      resolvedChanges[resolution.field] = 
        resolution.resolution === 'local' 
          ? resolution.localValue 
          : resolution.remoteValue;
    });
    
    await saveChanges(resolvedChanges);
    setConflicts([]);
  };

  // 本地存储操作
  const saveToLocalStorage = (taskId: number, changes: Partial<Task>) => {
    const key = `task-${taskId}-offline-changes`;
    localStorage.setItem(key, JSON.stringify({
      changes,
      timestamp: Date.now()
    }));
  };

  const clearLocalStorage = (taskId: number) => {
    const key = `task-${taskId}-offline-changes`;
    localStorage.removeItem(key);
  };

  // 网络恢复时同步
  useEffect(() => {
    if (isOnline && editSession && !editSession.isOnline) {
      // 检查是否有离线变更需要同步
      const key = `task-${taskId}-offline-changes`;
      const offlineData = localStorage.getItem(key);
      
      if (offlineData) {
        const { changes } = JSON.parse(offlineData);
        saveChanges(changes);
      }
      
      setEditSession(prev => prev ? { ...prev, isOnline: true } : null);
    }
  }, [isOnline, editSession, taskId]);

  return {
    task,
    editSession,
    conflicts,
    saveStatus,
    isOnline,
    handleFieldChange,
    resolveConflicts,
    loadTask
  };
};
```

冲突解决界面：
```typescript
const ConflictResolutionModal: React.FC<{
  conflicts: ConflictResolution[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}> = ({ conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState(conflicts);

  const handleResolutionChange = (index: number, resolution: 'local' | 'remote') => {
    const newResolutions = [...resolutions];
    newResolutions[index].resolution = resolution;
    setResolutions(newResolutions);
  };

  return (
    <Modal
      title="解决编辑冲突"
      open={true}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="resolve" type="primary" onClick={() => onResolve(resolutions)}>
          解决冲突
        </Button>
      ]}
      width={800}
    >
      <Alert
        message="检测到编辑冲突"
        description="其他用户也在编辑此任务，请选择如何处理冲突的字段。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {resolutions.map((conflict, index) => (
        <Card key={conflict.field} size="small" style={{ marginBottom: 8 }}>
          <h4>字段: {conflict.field}</h4>
          <Row gutter={16}>
            <Col span={12}>
              <Radio.Group
                value={conflict.resolution}
                onChange={(e) => handleResolutionChange(index, e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value="local">
                    使用我的修改
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {JSON.stringify(conflict.localValue)}
                    </div>
                  </Radio>
                  <Radio value="remote">
                    使用其他用户的修改
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {JSON.stringify(conflict.remoteValue)}
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Col>
          </Row>
        </Card>
      ))}
    </Modal>
  );
};
```

请提供完整的实时保存和冲突检测实现。
```

### 任务193: API接口优化和错误处理
**预估工时**: 5小时

#### Prompt 3.2: 高效API调用和错误恢复

```
优化任务编辑页的API调用策略和错误处理机制：

优化目标：
1. 减少API调用次数
2. 提升响应速度
3. 优雅的错误处理
4. 离线功能支持

实现方案：
```typescript
interface APIOptimizationConfig {
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTimeout: number;
  offlineThreshold: number;
}

class TaskEditAPIService {
  private config: APIOptimizationConfig = {
    batchSize: 10,
    retryAttempts: 3,
    retryDelay: 1000,
    cacheTimeout: 5 * 60 * 1000, // 5分钟
    offlineThreshold: 3000 // 3秒
  };

  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: Array<{ key: string; request: () => Promise<any>; resolve: Function; reject: Function }> = [];

  // 批量请求处理
  async batchRequest<T>(requests: Array<{ key: string; request: () => Promise<T> }>): Promise<T[]> {
    return new Promise((resolve, reject) => {
      requests.forEach(({ key, request }) => {
        this.batchQueue.push({
          key,
          request,
          resolve: (data: T) => resolve([data]),
          reject
        });
      });

      this.processBatch();
    });
  }

  private async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.config.batchSize);
    
    try {
      const results = await Promise.allSettled(
        batch.map(item => item.request())
      );

      results.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled') {
          item.resolve(result.value);
        } else {
          item.reject(result.reason);
        }
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }

    // 继续处理剩余批次
    if (this.batchQueue.length > 0) {
      setTimeout(() => this.processBatch(), 100);
    }
  }

  // 缓存机制
  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params || {})}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.cacheTimeout;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  // 带重试的请求
  async requestWithRetry<T>(
    request: () => Promise<T>,
    options: Partial<APIOptimizationConfig> = {}
  ): Promise<T> {
    const config = { ...this.config, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        return await Promise.race([
          request(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), config.offlineThreshold)
          )
        ]);
      } catch (error) {
        lastError = error as Error;
        
        // 最后一次尝试失败
        if (attempt === config.retryAttempts) {
          throw lastError;
        }

        // 指数退避延迟
        const delay = config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // 智能请求（带缓存和去重）
  async smartRequest<T>(
    endpoint: string,
    request: () => Promise<T>,
    useCache: boolean = true
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint);

    // 检查缓存
    if (useCache) {
      const cached = this.getCache(cacheKey);
      if (cached) return cached;
    }

    // 检查是否有相同的请求正在进行
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) return pending;

    // 创建新请求
    const requestPromise = this.requestWithRetry(request)
      .then(data => {
        this.setCache(cacheKey, data);
        this.pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // 任务更新API
  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
    return this.smartRequest(
      `task_${taskId}_update`,
      () => axios.put(`/api/v1/tasks/${taskId}`, updates),
      false // 更新操作不使用缓存
    );
  }

  // 获取任务详情
  async getTask(taskId: number): Promise<Task> {
    return this.smartRequest(
      `task_${taskId}`,
      () => axios.get(`/api/v1/tasks/${taskId}`).then(res => res.data)
    );
  }

  // 获取项目任务列表
  async getProjectTasks(projectId: number): Promise<Task[]> {
    return this.smartRequest(
      `project_${projectId}_tasks`,
      () => axios.get(`/api/v1/projects/${projectId}/tasks`).then(res => res.data)
    );
  }

  // 清除缓存
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// 错误处理Hook
const useErrorHandler = () => {
  const [errors, setErrors] = useState<Array<{ id: string; message: string; type: 'error' | 'warning' | 'info' }>>([]);

  const addError = useCallback((message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const id = Date.now().toString();
    setErrors(prev => [...prev, { id, message, type }]);
    
    // 自动移除错误信息
    setTimeout(() => {
      setErrors(prev => prev.filter(error => error.id !== id));
    }, 5000);
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 通用错误处理函数
  const handleApiError = useCallback((error: any, context: string = '操作') => {
    let message = `${context}失败`;
    
    if (error.response) {
      // HTTP错误响应
      switch (error.response.status) {
        case 400:
          message = `${context}失败：请求参数错误`;
          break;
        case 401:
          message = `${context}失败：登录已过期，请重新登录`;
          break;
        case 403:
          message = `${context}失败：没有权限执行此操作`;
          break;
        case 404:
          message = `${context}失败：资源不存在`;
          break;
        case 409:
          message = `${context}失败：数据冲突，请刷新后重试`;
          break;
        case 429:
          message = `${context}失败：请求过于频繁，请稍后重试`;
          break;
        case 500:
          message = `${context}失败：服务器内部错误`;
          break;
        default:
          message = `${context}失败：${error.response.data?.message || '未知错误'}`;
      }
    } else if (error.request) {
      // 网络错误
      message = `${context}失败：网络连接错误，请检查网络状态`;
    } else {
      // 其他错误
      message = `${context}失败：${error.message}`;
    }
    
    addError(message, 'error');
    return message;
  }, [addError]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleApiError
  };
};

// 错误显示组件
const ErrorNotificationCenter: React.FC<{ errors: Array<{ id: string; message: string; type: 'error' | 'warning' | 'info' }> }> = ({ errors }) => {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
      {errors.map(error => (
        <Alert
          key={error.id}
          message={error.message}
          type={error.type}
          closable
          style={{ marginBottom: 8, maxWidth: 400 }}
          onClose={() => {
            // 这里需要调用removeError，但组件没有直接访问权限
            // 实际使用时需要通过context或props传递
          }}
        />
      ))}
    </div>
  );
};
```

请提供完整的API优化和错误处理实现。
```

---

## 🎯 Phase 4: 测试和完善

### 任务194: 功能测试和验证
**预估工时**: 4小时

#### Prompt 4.1: 自动化测试套件

```
为任务编辑页功能创建全面的测试套件：

测试策略：
1. 单元测试（Jest + React Testing Library）
2. 集成测试（API交互测试）
3. 端到端测试（Playwright）
4. 性能测试（加载和响应时间）

测试实现：
```typescript
describe('TaskEditPage', () => {
  const mockTask: Task = {
    id: 1,
    title: '测试任务',
    description: '测试描述',
    status: 'todo',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project_id: 1,
    version: 1
  };

  beforeEach(() => {
    // 重置模拟状态
    jest.clearAllMocks();
    
    // 模拟API响应
    (taskService.getTask as jest.Mock).mockResolvedValue({ data: mockTask });
    (taskService.updateTask as jest.Mock).mockResolvedValue({ data: { ...mockTask, version: 2 } });
  });

  describe('基础功能测试', () => {
    test('应该正确加载任务数据', async () => {
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
        expect(screen.getByDisplayValue('测试描述')).toBeInTheDocument();
      });
    });

    test('应该支持任务标题编辑', async () => {
      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('测试任务');
      await user.clear(titleInput);
      await user.type(titleInput, '修改后的任务标题');

      // 等待自动保存
      await waitFor(() => {
        expect(taskService.updateTask).toHaveBeenCalledWith(1, 
          expect.objectContaining({ title: '修改后的任务标题' })
        );
      }, { timeout: 3000 });
    });

    test('应该正确处理状态变更', async () => {
      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('todo')).toBeInTheDocument();
      });

      // 点击状态选择器
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('in_progress'));

      await waitFor(() => {
        expect(taskService.updateTask).toHaveBeenCalledWith(1,
          expect.objectContaining({ status: 'in_progress' })
        );
      });
    });
  });

  describe('高级功能测试', () => {
    test('应该支持Markdown编辑器', async () => {
      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      // 切换到文档标签
      await user.click(screen.getByText('任务文档'));
      
      const markdownEditor = screen.getByRole('textbox');
      await user.type(markdownEditor, '# 测试标题\n\n这是一个测试文档');

      // 验证预览更新
      await waitFor(() => {
        expect(screen.getByText('测试标题')).toBeInTheDocument();
      });
    });

    test('应该支持计时器功能', async () => {
      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      // 切换到计时器标签
      await user.click(screen.getByText('时间管理'));
      
      // 开始计时
      await user.click(screen.getByText('开始计时'));
      
      expect(screen.getByText('暂停')).toBeInTheDocument();
      expect(screen.getByText('停止')).toBeInTheDocument();
    });

    test('应该处理版本冲突', async () => {
      // 模拟版本冲突
      (taskService.updateTask as jest.Mock)
        .mockRejectedValueOnce(new Error('Version conflict'))
        .mockResolvedValueOnce({ data: { ...mockTask, version: 3, title: '其他用户修改的标题' } });

      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('测试任务');
      await user.clear(titleInput);
      await user.type(titleInput, '我的修改');

      // 等待冲突检测
      await waitFor(() => {
        expect(screen.getByText('检测到编辑冲突')).toBeInTheDocument();
      });
    });
  });

  describe('错误处理测试', () => {
    test('应该优雅处理网络错误', async () => {
      (taskService.getTask as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/网络连接错误/)).toBeInTheDocument();
      });
    });

    test('应该支持离线编辑', async () => {
      // 模拟离线状态
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const user = userEvent.setup();
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('测试任务');
      await user.clear(titleInput);
      await user.type(titleInput, '离线修改');

      // 验证本地存储
      await waitFor(() => {
        const stored = localStorage.getItem('task-1-offline-changes');
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!).changes.title).toBe('离线修改');
      });
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内加载', async () => {
      const startTime = performance.now();
      
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // 1秒内加载完成
    });

    test('应该高效处理大量数据', async () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTask,
        id: i + 1,
        title: `任务 ${i + 1}`
      }));
      
      (taskService.getProjectTasks as jest.Mock).mockResolvedValue({ data: largeTasks });
      
      const startTime = performance.now();
      render(<TaskEditPage taskId={1} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试任务')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000); // 2秒内处理完成
    });
  });
});

// 集成测试
describe('TaskEditPage Integration', () => {
  test('应该与实际API正确交互', async () => {
    // 使用真实API进行测试
    const response = await fetch('/api/v1/tasks/1');
    expect(response.ok).toBe(true);
    
    const task = await response.json();
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title');
  });
});

// E2E测试（Playwright）
describe('TaskEditPage E2E', () => {
  test('完整的任务编辑流程', async ({ page }) => {
    await page.goto('/tasks/1/edit');
    
    // 等待页面加载
    await page.waitForSelector('[data-testid="task-title-input"]');
    
    // 修改任务标题
    await page.fill('[data-testid="task-title-input"]', '端到端测试任务');
    
    // 等待自动保存
    await page.waitForSelector('[data-testid="save-status-saved"]');
    
    // 验证保存成功
    await page.reload();
    await page.waitForSelector('[data-testid="task-title-input"]');
    
    const titleValue = await page.inputValue('[data-testid="task-title-input"]');
    expect(titleValue).toBe('端到端测试任务');
  });

  test('多标签页功能验证', async ({ page }) => {
    await page.goto('/tasks/1/edit');
    
    // 测试基础信息标签
    await page.click('[data-testid="tab-basic-info"]');
    expect(await page.isVisible('[data-testid="task-title-input"]')).toBe(true);
    
    // 测试文档标签
    await page.click('[data-testid="tab-document"]');
    expect(await page.isVisible('[data-testid="markdown-editor"]')).toBe(true);
    
    // 测试时间管理标签
    await page.click('[data-testid="tab-time-management"]');
    expect(await page.isVisible('[data-testid="timer-controls"]')).toBe(true);
  });
});
```

请提供完整的测试套件实现。
```

### 任务195: 用户体验优化和文档
**预估工时**: 4小时

#### Prompt 4.2: UX优化和使用文档

```
完善任务编辑页的用户体验并创建完整的使用文档：

UX优化需求：
1. 加载状态和反馈
2. 键盘快捷键支持
3. 拖拽排序功能
4. 智能提示和建议
5. 可访问性改进

实现方案：
```typescript
// 加载状态管理
const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  return { setLoading, isLoading, loadingStates };
};

// 键盘快捷键
const useKeyboardShortcuts = (actions: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.indexOf('Mac') > -1;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            actions.save?.();
            break;
          case 'Enter':
            if (event.shiftKey) {
              event.preventDefault();
              actions.quickSave?.();
            }
            break;
          case 'Escape':
            event.preventDefault();
            actions.cancel?.();
            break;
          case '/':
            event.preventDefault();
            actions.search?.();
            break;
        }
      }

      // Tab导航
      if (event.key === 'Tab' && event.shiftKey) {
        // 处理反向Tab导航
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};

// 智能提示系统
const useSmartSuggestions = (task: Task, allTasks: Task[]) => {
  const [suggestions, setSuggestions] = useState<Array<{
    type: 'warning' | 'info' | 'tip';
    message: string;
    action?: () => void;
  }>>([]);

  useEffect(() => {
    const newSuggestions: typeof suggestions = [];

    // 检查截止时间
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        newSuggestions.push({
          type: 'warning',
          message: `任务已逾期 ${Math.abs(daysUntilDue)} 天`,
          action: () => {
            // 打开截止时间编辑
          }
        });
      } else if (daysUntilDue <= 3) {
        newSuggestions.push({
          type: 'warning',
          message: `任务将在 ${daysUntilDue} 天后到期`,
        });
      }
    }

    // 检查任务描述
    if (!task.description || task.description.length < 20) {
      newSuggestions.push({
        type: 'tip',
        message: '添加详细描述可以帮助团队更好地理解任务',
        action: () => {
          // 聚焦到描述输入框
          document.querySelector('[data-testid="task-description"]')?.focus();
        }
      });
    }

    // 检查预估工时
    if (!task.estimated_hours) {
      newSuggestions.push({
        type: 'info',
        message: '设置预估工时有助于项目时间管理',
        action: () => {
          // 聚焦到工时输入框
        }
      });
    }

    // 检查任务分配
    if (!task.assignee_id) {
      newSuggestions.push({
        type: 'tip',
        message: '分配负责人可以明确任务责任',
      });
    }

    // 检查重复任务标题
    const duplicateTitle = allTasks.find(t => 
      t.id !== task.id && 
      t.title.toLowerCase() === task.title.toLowerCase()
    );
    if (duplicateTitle) {
      newSuggestions.push({
        type: 'warning',
        message: '存在相同标题的任务，建议修改以避免混淆',
      });
    }

    setSuggestions(newSuggestions);
  }, [task, allTasks]);

  return suggestions;
};

// 拖拽排序功能
const useDragAndDrop = (items: any[], onReorder: (newOrder: any[]) => void) => {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);

  const handleDragStart = (event: React.DragEvent, item: any) => {
    setDraggedItem(item);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (event: React.DragEvent, dropIndex: number) => {
    event.preventDefault();
    
    if (!draggedItem) return;

    const currentIndex = items.findIndex(item => item.id === draggedItem.id);
    if (currentIndex === dropIndex) return;

    const newItems = [...items];
    newItems.splice(currentIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    onReorder(newItems);
    setDraggedItem(null);
    setDragOverIndex(-1);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(-1);
  };

  return {
    draggedItem,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  };
};

// 主任务编辑页组件
const TaskEditPageEnhanced: React.FC<{ taskId: number }> = ({ taskId }) => {
  const { setLoading, isLoading } = useLoadingStates();
  const { task, updateTask, saveTask } = useTaskEditor(taskId);
  const suggestions = useSmartSuggestions(task!, []);

  // 快捷键操作
  const shortcutActions = {
    save: () => saveTask(),
    quickSave: () => saveTask(true),
    cancel: () => window.history.back(),
    search: () => {
      // 打开搜索框
    }
  };

  useKeyboardShortcuts(shortcutActions);

  return (
    <div className="task-edit-page">
      {/* 键盘快捷键提示 */}
      <Card size="small" style={{ marginBottom: 16, background: '#f9f9f9' }}>
        <Space wrap>
          <Text type="secondary">快捷键：</Text>
          <Tag>Ctrl+S 保存</Tag>
          <Tag>Ctrl+Shift+Enter 快速保存</Tag>
          <Tag>Esc 返回</Tag>
          <Tag>Ctrl+/ 搜索</Tag>
        </Space>
      </Card>

      {/* 智能建议 */}
      {suggestions.length > 0 && (
        <Card size="small" title="智能建议" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {suggestions.map((suggestion, index) => (
              <Alert
                key={index}
                message={suggestion.message}
                type={suggestion.type}
                showIcon
                action={
                  suggestion.action ? (
                    <Button size="small" onClick={suggestion.action}>
                      操作
                    </Button>
                  ) : undefined
                }
                closable
              />
            ))}
          </Space>
        </Card>
      )}

      {/* 加载指示器 */}
      {isLoading('task-data') && (
        <Card>
          <Skeleton active />
        </Card>
      )}

      {/* 主要内容区域 */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>编辑任务</span>
            {isLoading('auto-save') && <SyncOutlined spin />}
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => window.history.back()}>
              返回
            </Button>
            <Button 
              type="primary" 
              onClick={() => saveTask()}
              loading={isLoading('manual-save')}
            >
              保存
            </Button>
          </Space>
        }
      >
        {/* 任务编辑表单内容 */}
      </Card>

      {/* 可访问性改进 */}
      <div role="region" aria-label="任务编辑页面" />
      
      {/* 屏幕阅读器提示 */}
      <div className="sr-only">
        当前正在编辑任务: {task?.title}
      </div>
    </div>
  );
};
```

使用文档：
```markdown
# 任务编辑页使用指南

## 功能概述

任务编辑页提供了完整的任务管理功能，包括基础信息编辑、文档管理、时间跟踪等。

## 主要功能

### 1. 基础信息编辑
- **任务标题**: 支持实时编辑和自动保存
- **任务描述**: 支持富文本和Markdown格式
- **状态管理**: 待开始、进行中、已完成、已取消
- **优先级**: 低、中、高三个级别
- **截止时间**: 支持日期和时间选择

### 2. 高级功能
- **层级关系**: 设置父子任务关系
- **任务分配**: 指定负责人和参与者
- **标签管理**: 自定义标签分类
- **附件上传**: 支持多种文件格式

### 3. 文档管理
- **Markdown编辑器**: 支持实时预览
- **格式化工具**: 粗体、斜体、标题、链接等
- **代码高亮**: 支持多种编程语言
- **表格编辑**: 可视化表格创建

### 4. 时间管理
- **实时计时器**: 开始、暂停、停止计时
- **手动记录**: 添加历史时间记录
- **统计分析**: 工时统计和效率分析
- **进度跟踪**: 预估vs实际工时对比

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 手动保存 |
| Ctrl+Shift+Enter | 快速保存并继续编辑 |
| Esc | 返回上一页 |
| Ctrl+/ | 打开搜索 |
| Tab | 切换表单字段 |
| Shift+Tab | 反向切换表单字段 |

## 智能功能

### 自动保存
- 编辑后1.5秒自动保存
- 网络异常时本地缓存
- 恢复网络后自动同步

### 冲突检测
- 多用户编辑检测
- 版本冲突提示
- 智能合并建议

### 智能建议
- 逾期任务提醒
- 描述完整性检查
- 重复标题警告
- 工时设置建议

## 最佳实践

### 任务标题
- 使用动词开头，明确行动目标
- 控制在50字符以内
- 避免使用模糊词汇

### 任务描述
- 使用Markdown格式提高可读性
- 包含背景、目标、验收标准
- 添加相关链接和参考资料

### 时间管理
- 设置合理的预估工时
- 及时记录实际工作时间
- 定期回顾时间使用效率

### 协作建议
- 明确指定任务负责人
- 使用标签进行分类管理
- 及时更新任务状态

## 故障排除

### 常见问题

**Q: 编辑后没有自动保存？**
A: 检查网络连接，确保表单验证通过。离线状态下会保存到本地缓存。

**Q: 出现版本冲突怎么办？**
A: 系统会显示冲突解决对话框，选择保留本地修改或接受远程修改。

**Q: 计时器数据丢失？**
A: 计时数据会实时同步到服务器，本地也有备份。如有问题请联系管理员。

**Q: 上传附件失败？**
A: 检查文件大小（不超过10MB）和格式（支持图片、PDF、文档）。

### 性能优化
- 大型项目建议分解为子任务
- 定期清理不需要的附件
- 避免在描述中插入超大图片

## 更新日志

### v2.0.0 (2025-08-03)
- ✨ 新增Markdown文档编辑器
- ✨ 新增实时计时器功能
- ✨ 新增智能建议系统
- 🐛 修复自动保存偶尔失效的问题
- 🎨 优化界面布局和交互体验

### v1.5.0 (2025-07-15)
- ✨ 新增层级任务管理
- ✨ 新增拖拽排序功能
- 🐛 修复版本冲突检测
- 📝 完善使用文档
```

请提供完整的UX优化和文档实现。
```

---

## 📋 快速开发指令

```bash
# 1. 创建功能分支
git checkout -b feature/task-edit-enhancement

# 2. 安装相关依赖
npm install react-markdown react-syntax-highlighter
npm install @types/react-syntax-highlighter --save-dev

# 3. 启动开发环境
npm run dev

# 4. 运行测试
npm run test -- --watch

# 5. 运行E2E测试
npm run test:e2e

# 6. 构建检查
npm run build && npm run type-check

# 7. 代码质量检查
npm run lint && npm run format
```

---

## 🎯 验收标准检查清单

- [ ] 基础信息编辑功能完整且与弹窗编辑一致
- [ ] 支持实时自动保存和版本冲突检测
- [ ] Markdown文档编辑器功能完善
- [ ] 计时器和时间管理功能正常工作
- [ ] 层级任务关系管理功能完整
- [ ] API调用优化，减少不必要的网络请求
- [ ] 错误处理优雅，支持离线编辑
- [ ] 智能建议系统提供有价值的提示
- [ ] 键盘快捷键支持和可访问性良好
- [ ] 单元测试覆盖率 >85%
- [ ] 集成测试通过
- [ ] E2E测试场景完整
- [ ] 性能指标满足要求（加载<1s，响应<500ms）
- [ ] 使用文档完整且准确
- [ ] 代码通过ESLint和TypeScript检查

---

**🔗 相关链接:**
- 原任务详情: http://localhost:3000/projects/1/tasks/183
- 弹窗编辑参考: 项目任务列表页的编辑功能
- 设计规范: [Ant Design Guidelines](https://ant.design/docs/spec/introduce)

**⏰ 预计完成时间:** 2025年8月8日
**👥 协作方式:** 使用MCP任务系统跟踪进度，每个子任务独立开发和测试

---

*这些prompts将帮助您系统性地完善任务编辑页功能，确保与弹窗编辑保持一致的用户体验。建议按Phase顺序实施，每个阶段完成后进行测试验证。*