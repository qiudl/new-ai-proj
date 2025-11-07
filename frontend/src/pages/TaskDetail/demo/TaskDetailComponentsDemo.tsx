/**
 * TaskDetailComponentsDemo - 完整的TaskDetail组件演示页面
 *
 * 集成展示所有TaskDetail相关组件：
 * - TaskBreadcrumb (2500)
 * - EnhancedTaskHeaderCard (2501)
 * - TaskDetailContent (2502)
 * - TaskDetailSidebar (2503)
 * - TaskDetailModals (2504)
 * - TaskDetailLayout (2505)
 */

import React, { useState } from 'react';
import { Card, Row, Col, Space, Button, Typography, Divider, Tabs, Switch, Select, message } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  InboxOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { TaskBreadcrumb } from '../components/Header/TaskBreadcrumb';
import { EnhancedTaskHeaderCard } from '../components/Header/EnhancedTaskHeaderCard';
import TaskDetailContent from '../components/Content/TaskDetailContent';
import TaskDetailSidebar from '../components/Sidebar/TaskDetailSidebar';
import TaskDetailModals from '../components/Modals/TaskDetailModals';
import { TaskDetailLayout } from '../components/Layout/TaskDetailLayout';
import { TaskDetailProvider } from '../context/TaskDetailProvider';
import type { Task, TaskStatus } from '../types/task.types';

const { Title, Text, Paragraph } = Typography;

// Mock任务数据
const createMockTask = (status: TaskStatus, isArchived: boolean): Task => ({
  id: 2501,
  project_id: 1,
  title: 'TaskDetail组件重构演示任务',
  description: `## 任务描述

这是一个用于展示TaskDetail组件系统的演示任务。

### 主要目标
- 展示所有TaskDetail组件的功能
- 验证组件集成效果
- 测试交互体验

### 技术栈
- React 18
- TypeScript
- Ant Design
- Context API`,
  status: isArchived ? 'archived' : status,
  priority: 'high',
  assignee_id: 111,
  due_date: '2025-10-15T00:00:00Z',
  created_at: '2025-10-03T00:00:00Z',
  updated_at: '2025-10-03T12:00:00Z',
  custom_fields: {
    task_summary: 'TaskDetail组件系统的完整演示，包含所有功能模块的集成展示',
  },
  // ✅ FIXED - Add required Task properties (TS2739)
  task_level: 1,
  sort_order: 0,
});

const mockParentTask: Task = {
  id: 2487,
  project_id: 1,
  title: 'Phase 2: 实现TaskDetail功能对等',
  description: 'TaskDetail重构Phase 2',
  status: 'in_progress',
  priority: 'medium',
  assignee_id: 111,
  due_date: null,
  created_at: '2025-10-01T00:00:00Z',
  updated_at: '2025-10-03T00:00:00Z',
  // ✅ FIXED - Add required Task properties (TS2739)
  task_level: 0,
  sort_order: 0,
};

// 状态配置
const statusConfigs = {
  todo: {
    text: '待办',
    color: '#fa8c16',
    bgColor: '#fff7e6',
    icon: <ClockCircleOutlined />,
  },
  in_progress: {
    text: '进行中',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: <FileTextOutlined />,
  },
  completed: {
    text: '已完成',
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: <CheckCircleOutlined />,
  },
  blocked: {
    text: '阻塞',
    color: '#ff4d4f',
    bgColor: '#fff1f0',
    icon: <StopOutlined />,
  },
  archived: {
    text: '已归档',
    color: '#8c8c8c',
    bgColor: '#f5f5f5',
    icon: <InboxOutlined />,
  },
};

const priorityConfigs = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' },
};

const TaskDetailComponentsDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('standalone');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('in_progress');
  const [isArchived, setIsArchived] = useState(false);
  const [showLayout, setShowLayout] = useState(false);

  const mockTask = createMockTask(selectedStatus, isArchived);
  const taskWithAssignee = { ...mockTask, assignee_name: 'Claude AI' } as any;

  // 计算时间剩余
  const calculateTimeRemaining = () => {
    if (!mockTask.due_date) return undefined;
    const dueDate = new Date(mockTask.due_date);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `逾期 ${Math.abs(diffDays)} 天`, type: 'danger' as const };
    } else if (diffDays === 0) {
      return { text: '今天到期', type: 'warning' as const };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天后到期`, type: 'warning' as const };
    } else {
      return { text: `${diffDays} 天后到期`, type: 'normal' as const };
    }
  };

  // 事件处理
  const handleEdit = () => message.info('编辑任务');
  const handleDelete = () => {
    if (window.confirm('确定要删除这个任务吗？')) {
      message.success('已删除任务');
    }
  };
  const handleUnarchive = () => {
    setIsArchived(false);
    message.success('已恢复任务');
  };
  const handleDailyFocusToggle = (isInFocus: boolean) => {
    message.success(`Daily Focus ${isInFocus ? '已添加' : '已移除'}`);
  };

  const tabItems = [
    {
      key: 'standalone',
      label: (
        <span>
          <AppstoreOutlined /> 独立组件展示
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 面包屑导航 */}
          <Card title="1. TaskBreadcrumb - 面包屑导航 (任务2500)" size="small">
            <TaskBreadcrumb
              task={mockTask}
              parentTask={mockParentTask}
              projectId={1}
            />
          </Card>

          {/* 增强型任务头部卡片 */}
          <Card title="2. EnhancedTaskHeaderCard - 增强型任务头部 (任务2501)" size="small">
            <EnhancedTaskHeaderCard
              task={taskWithAssignee}
              projectId={1}
              statusConfig={statusConfigs[mockTask.status as keyof typeof statusConfigs]}
              priorityConfig={priorityConfigs[mockTask.priority as keyof typeof priorityConfigs]}
              timeRemaining={calculateTimeRemaining()}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUnarchive={handleUnarchive}
              onDailyFocusToggle={handleDailyFocusToggle}
            />
          </Card>

          {/* 任务详情内容 - 包裹在Provider中 */}
          <Card title="3. TaskDetailContent - 任务详情内容 (任务2502)" size="small">
            <TaskDetailProvider projectId={1} taskId={mockTask.id}>
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                <Text type="secondary">
                  TaskDetailContent组件需要完整的TaskDetailProvider上下文，
                  建议在"完整布局"标签页中查看效果
                </Text>
              </div>
            </TaskDetailProvider>
          </Card>

          {/* 任务详情侧边栏 */}
          <Card title="4. TaskDetailSidebar - 任务详情侧边栏 (任务2503)" size="small">
            <TaskDetailProvider projectId={1} taskId={mockTask.id}>
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                <Text type="secondary">
                  TaskDetailSidebar组件需要完整的TaskDetailProvider上下文，
                  建议在"完整布局"标签页中查看效果
                </Text>
              </div>
            </TaskDetailProvider>
          </Card>

          {/* 任务详情弹窗 */}
          <Card title="5. TaskDetailModals - 任务详情弹窗 (任务2504)" size="small">
            <TaskDetailProvider projectId={1} taskId={mockTask.id}>
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                <Text type="secondary">
                  TaskDetailModals组件包含创建子任务、批量导入等弹窗，
                  建议在"完整布局"标签页中查看效果
                </Text>
              </div>
            </TaskDetailProvider>
          </Card>

          {/* 任务详情布局 */}
          <Card title="6. TaskDetailLayout - 任务详情布局 (任务2505)" size="small">
            <Text type="secondary">
              TaskDetailLayout是最外层的布局组件，整合了所有子组件。
              请切换到"完整布局"标签页查看完整效果。
            </Text>
          </Card>
        </Space>
      ),
    },
    {
      key: 'integrated',
      label: (
        <span>
          <LayoutOutlined /> 完整布局展示
        </span>
      ),
      children: (
        <Card>
          <TaskDetailProvider projectId={1} taskId={mockTask.id}>
            <TaskDetailLayout
              content={
                <TaskDetailContent
                  projectId={1}
                  onCreateSubtask={() => message.info('创建子任务')}
                  onBulkImportSubtasks={() => message.info('批量导入子任务')}
                  onUpdateTask={async () => {}}
                  onDocsChange={() => {}}
                />
              }
              sidebar={<TaskDetailSidebar />}
            />
          </TaskDetailProvider>
        </Card>
      ),
    },
    {
      key: 'docs',
      label: (
        <span>
          <FormOutlined /> 组件文档
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="组件清单">
            <Paragraph>
              <ul>
                <li><strong>TaskBreadcrumb</strong> (任务2500): 面包屑导航组件，显示任务层级关系</li>
                <li><strong>EnhancedTaskHeaderCard</strong> (任务2501): 增强型任务头部卡片，包含状态、进度、操作按钮</li>
                <li><strong>TaskDetailContent</strong> (任务2502): 任务详情主内容区域，包含摘要、统计、子任务树、详情Tab</li>
                <li><strong>TaskDetailSidebar</strong> (任务2503): 任务详情侧边栏，包含元信息、关联任务、操作历史</li>
                <li><strong>TaskDetailModals</strong> (任务2504): 任务详情弹窗集合，包含创建子任务、批量导入等</li>
                <li><strong>TaskDetailLayout</strong> (任务2505): 任务详情布局组件，整合所有子组件</li>
              </ul>
            </Paragraph>
          </Card>

          <Card title="技术架构">
            <Paragraph>
              <h4>状态管理</h4>
              <ul>
                <li>使用Context API进行状态管理</li>
                <li>TaskDetailProvider提供统一的上下文</li>
                <li>useTaskDetailContext Hook访问状态</li>
              </ul>

              <h4>组件设计原则</h4>
              <ul>
                <li><strong>模块化</strong>: 每个组件职责单一，易于维护</li>
                <li><strong>可复用</strong>: 组件接口清晰，可在不同场景使用</li>
                <li><strong>类型安全</strong>: 完整的TypeScript类型定义</li>
                <li><strong>性能优化</strong>: React.memo、useMemo、useCallback</li>
              </ul>

              <h4>测试覆盖</h4>
              <ul>
                <li>单元测试: 每个组件都有对应的test文件</li>
                <li>集成测试: TaskDetailPage.test.tsx</li>
                <li>测试工具: Jest + React Testing Library</li>
              </ul>
            </Paragraph>
          </Card>

          <Card title="使用示例">
            <Paragraph>
              <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
{`// 1. 独立使用组件
import { TaskBreadcrumb, EnhancedTaskHeaderCard } from '@/pages/TaskDetail/components';

<TaskBreadcrumb task={task} parentTask={parent} projectId={1} />
<EnhancedTaskHeaderCard task={task} projectId={1} {...otherProps} />

// 2. 使用完整布局
import { TaskDetailProvider } from '@/pages/TaskDetail/context';
import TaskDetailLayout from '@/pages/TaskDetail/components/Layout/TaskDetailLayout';

<TaskDetailProvider projectId={projectId} taskId={taskId}>
  <TaskDetailLayout />
</TaskDetailProvider>

// 3. 使用Context
import { useTaskDetailContext } from '@/pages/TaskDetail/hooks';

const { task, relations, ui, actions } = useTaskDetailContext();`}
              </pre>
            </Paragraph>
          </Card>

          <Card title="API文档">
            <Paragraph>
              <h4>TaskBreadcrumbProps</h4>
              <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
{`interface TaskBreadcrumbProps {
  task: Task;
  parentTask?: Task | null;
  projectId: number;
  className?: string;
  testId?: string;
}`}
              </pre>

              <h4>EnhancedTaskHeaderCardProps</h4>
              <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
{`interface EnhancedTaskHeaderCardProps {
  task: Task;
  projectId: number;
  statusConfig?: { text: string; color: string; bgColor: string; icon: ReactNode };
  priorityConfig?: { text: string; color: string };
  timeRemaining?: { text: string; type: 'danger' | 'warning' | 'normal' };
  onEdit?: () => void;
  onDelete?: () => void;
  onUnarchive?: () => void;
  onDailyFocusToggle?: (isInFocus: boolean) => void;
  loading?: boolean;
}`}
              </pre>
            </Paragraph>
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        {/* 控制面板 */}
        <Col span={24}>
          <Card>
            <Title level={2}>TaskDetail 组件系统演示</Title>
            <Paragraph>
              完整展示TaskDetail重构后的所有组件（任务2500-2511）
            </Paragraph>

            <Divider />

            <Space size="large">
              <div>
                <Text strong>任务状态：</Text>
                <Select
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  style={{ width: 150, marginLeft: 8 }}
                  disabled={isArchived}
                >
                  <Select.Option value="todo">待办</Select.Option>
                  <Select.Option value="in_progress">进行中</Select.Option>
                  <Select.Option value="completed">已完成</Select.Option>
                  <Select.Option value="blocked">阻塞</Select.Option>
                </Select>
              </div>

              <div>
                <Text strong>归档状态：</Text>
                <Switch
                  checked={isArchived}
                  onChange={setIsArchived}
                  checkedChildren="已归档"
                  unCheckedChildren="正常"
                  style={{ marginLeft: 8 }}
                />
              </div>

              <Button type="primary" onClick={() => setActiveTab('integrated')}>
                查看完整布局
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 组件展示区域 */}
        <Col span={24}>
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>

        {/* 底部信息 */}
        <Col span={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>访问信息</Title>
              <Text>访问路径: <code>/demo/task-detail-components</code></Text>
              <Text>完整URL: <code>http://localhost:3000/demo/task-detail-components</code></Text>
              <Divider />
              <Text type="secondary">
                提示: 建议在开发环境中测试所有组件功能，确保与实际数据的集成正常。
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

TaskDetailComponentsDemo.displayName = 'TaskDetailComponentsDemo';

export default TaskDetailComponentsDemo;
