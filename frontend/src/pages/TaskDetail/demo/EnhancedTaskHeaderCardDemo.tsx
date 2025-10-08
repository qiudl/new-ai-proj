/**
 * EnhancedTaskHeaderCardDemo - Demo page for testing EnhancedTaskHeaderCard
 *
 * This page demonstrates all features of the EnhancedTaskHeaderCard component:
 * - Different task statuses with background colors
 * - Task progress bar
 * - Daily Focus toggle
 * - Archive status and restore
 * - Edit and Delete actions
 */

import React, { useState } from 'react';
import { Card, Row, Col, Space, Button, Typography, Divider, Select } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { EnhancedTaskHeaderCard } from '../components/Header/EnhancedTaskHeaderCard';
import type { Task, TaskStatus } from '../types/task.types';

const { Title, Text, Paragraph } = Typography;

// Status configurations
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

// Priority configurations
const priorityConfigs = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' },
};

const EnhancedTaskHeaderCardDemo: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('in_progress');
  const [isArchived, setIsArchived] = useState(false);

  // Mock task data
  const mockTask: Task = {
    id: 2501,
    project_id: 1,
    title: '增强任务标题卡片组件 (TaskHeaderCard)',
    description: '实现状态背景色、任务进度条、Daily Focus切换等功能',
    status: isArchived ? 'archived' : selectedStatus,
    priority: 'high',
    assignee_id: 111,
    due_date: '2025-10-10T00:00:00Z',
    created_at: '2025-10-03T00:00:00Z',
    updated_at: '2025-10-03T11:46:00Z',
  };

  // Add assignee_name for display
  const taskWithAssignee = {
    ...mockTask,
    assignee_name: 'Claude AI',
  } as any;

  // Calculate time remaining
  const calculateTimeRemaining = () => {
    if (!mockTask.due_date) return undefined;

    const dueDate = new Date(mockTask.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `逾期 ${Math.abs(diffDays)} 天`,
        type: 'danger' as const,
      };
    } else if (diffDays === 0) {
      return {
        text: '今天到期',
        type: 'warning' as const,
      };
    } else if (diffDays <= 3) {
      return {
        text: `${diffDays} 天后到期`,
        type: 'warning' as const,
      };
    } else {
      return {
        text: `${diffDays} 天后到期`,
        type: 'normal' as const,
      };
    }
  };

  const handleEdit = () => {
    console.log('Edit task:', mockTask.id);
    alert(`编辑任务 #${mockTask.id}`);
  };

  const handleDelete = () => {
    console.log('Delete task:', mockTask.id);
    if (window.confirm('确定要删除这个任务吗？')) {
      alert(`已删除任务 #${mockTask.id}`);
    }
  };

  const handleUnarchive = () => {
    console.log('Unarchive task:', mockTask.id);
    setIsArchived(false);
    alert(`已恢复任务 #${mockTask.id}`);
  };

  const handleDailyFocusToggle = (isInFocus: boolean) => {
    console.log('Daily Focus toggled:', isInFocus);
    alert(`Daily Focus ${isInFocus ? '已添加' : '已移除'}`);
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Title level={2}>EnhancedTaskHeaderCard 组件演示</Title>
            <Paragraph>
              这个页面展示了EnhancedTaskHeaderCard组件的所有功能特性。
            </Paragraph>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>控制面板：</Text>
                <Space style={{ marginTop: 8 }}>
                  <Select
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    style={{ width: 150 }}
                    disabled={isArchived}
                  >
                    <Select.Option value="todo">待办</Select.Option>
                    <Select.Option value="in_progress">进行中</Select.Option>
                    <Select.Option value="completed">已完成</Select.Option>
                    <Select.Option value="blocked">阻塞</Select.Option>
                  </Select>
                  <Button
                    type={isArchived ? 'primary' : 'default'}
                    onClick={() => setIsArchived(!isArchived)}
                  >
                    {isArchived ? '取消归档' : '归档任务'}
                  </Button>
                </Space>
              </div>

              <Divider />

              <div>
                <Text strong>当前状态：</Text>
                <Space style={{ marginTop: 8 }}>
                  <Text>任务状态: {mockTask.status}</Text>
                  <Text>优先级: {mockTask.priority}</Text>
                  <Text>是否归档: {isArchived ? '是' : '否'}</Text>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="组件预览">
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
        </Col>

        <Col span={24}>
          <Card title="功能说明">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>1. 状态背景色和边框</Title>
                <Paragraph>
                  根据任务状态显示不同的背景色和边框颜色：
                  <ul>
                    <li>待办 (todo): 橙色 (#fa8c16 / #fff7e6)</li>
                    <li>进行中 (in_progress): 蓝色 (#1890ff / #e6f7ff)</li>
                    <li>已完成 (completed): 绿色 (#52c41a / #f6ffed)</li>
                    <li>阻塞 (blocked): 红色 (#ff4d4f / #fff1f0)</li>
                    <li>已归档 (archived): 灰色 (#8c8c8c / #f5f5f5)</li>
                  </ul>
                </Paragraph>
              </div>

              <div>
                <Title level={4}>2. 任务进度条</Title>
                <Paragraph>
                  使用TaskProgressInline组件显示任务进度，支持不同状态的颜色显示。
                </Paragraph>
              </div>

              <div>
                <Title level={4}>3. Daily Focus 切换按钮</Title>
                <Paragraph>
                  非归档任务显示Daily Focus切换按钮，可以快速将任务添加到今日焦点。
                </Paragraph>
              </div>

              <div>
                <Title level={4}>4. 归档状态提示</Title>
                <Paragraph>
                  归档的任务显示黄色警告提示框，说明任务已归档不可编辑。
                </Paragraph>
              </div>

              <div>
                <Title level={4}>5. 操作按钮</Title>
                <Paragraph>
                  根据任务状态显示不同的操作按钮：
                  <ul>
                    <li>非归档任务: 编辑任务、删除按钮</li>
                    <li>归档任务: 恢复任务按钮</li>
                  </ul>
                </Paragraph>
              </div>

              <div>
                <Title level={4}>6. 时间剩余显示</Title>
                <Paragraph>
                  根据截止日期显示时间剩余信息，并使用不同颜色标识紧急程度：
                  <ul>
                    <li>逾期: 红色 (danger)</li>
                    <li>今天到期或3天内: 橙色 (warning)</li>
                    <li>3天以上: 正常颜色</li>
                  </ul>
                </Paragraph>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="使用方法">
            <Paragraph>
              <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
{`import { EnhancedTaskHeaderCard } from './components/Header/EnhancedTaskHeaderCard';

<EnhancedTaskHeaderCard
  task={task}
  projectId={projectId}
  statusConfig={{
    text: 'In Progress',
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: <FileTextOutlined />
  }}
  priorityConfig={{
    text: 'High',
    color: 'red'
  }}
  timeRemaining={{
    text: '3 days left',
    type: 'warning'
  }}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onUnarchive={handleUnarchive}
  onDailyFocusToggle={handleDailyFocusToggle}
/>`}
              </pre>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

EnhancedTaskHeaderCardDemo.displayName = 'EnhancedTaskHeaderCardDemo';

export default EnhancedTaskHeaderCardDemo;
