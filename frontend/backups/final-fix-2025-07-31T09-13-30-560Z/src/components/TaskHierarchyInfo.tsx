// @ts-nocheck
import React from 'react';
import { Card, Typography, Tag, Space, Descriptions, Button, Divider, Alert } from 'antd';
import { 
  BranchesOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TaskHierarchyInfoProps {
  task: Task;
  parent?: Task;
  children: Task[];
  siblings: Task[];
  onNavigateToTask?: (taskId: number) => void;
}

const TaskHierarchyInfo: React.FC<TaskHierarchyInfoProps> = ({
  task,
  parent,
  children,
  siblings,
  onNavigateToTask
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const TaskItem: React.FC<{ task: Task; icon?: React.ReactNode; prefix?: string }> = ({ 
    task: taskItem, 
    icon, 
    prefix 
  }) => (
    <div style={{ padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '8px' }}>
      <Space>
        {icon}
        <Button 
          type="link" 
          style={{ padding: 0, fontWeight: 'bold' }}
          onClick={() => onNavigateToTask?.(taskItem.id)}
        >
          {prefix}{taskItem.title}
        </Button>
        <Tag color={getStatusColor(taskItem.status)}>
          {getStatusText(taskItem.status)}
        </Tag>
        {taskItem.assignee_name && (
          <Text type="secondary">
            <UserOutlined /> {taskItem.assignee_name}
          </Text>
        )}
        {taskItem.due_date && (
          <Text type="secondary">
            <CalendarOutlined /> {dayjs(taskItem.due_date).format('MM-DD')}
          </Text>
        )}
      </Space>
    </div>
  );

  return (
    <Card 
      title={
        <Space>
          <BranchesOutlined />
          任务层级关系
        </Space>
      }
      size="small"
    >
      {/* 层级逻辑提示 */}
      <Alert
        message="任务层级逻辑"
        description={
          <div>
            <p>• 子任务截止时间默认继承父任务</p>
            <p>• 子任务截止时间晚于父任务时，会提示更新父任务截止时间</p>
            <p>• 有子任务进行中时，父任务自动变为进行中</p>
            <p>• 所有子任务完成时，父任务自动完成</p>
            <p>• 父任务开始计时时，所有子任务变为进行中</p>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* 父任务信息 */}
      {parent && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>
            <ArrowUpOutlined /> 父任务
          </Title>
          <TaskItem task={parent} prefix="📁 " />
        </div>
      )}

      {/* 当前任务信息 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>当前任务</Title>
        <div style={{ 
          padding: '8px', 
          border: '2px solid #1890ff', 
          borderRadius: '4px', 
          backgroundColor: '#f6ffed',
          marginBottom: '8px' 
        }}>
          <Space>
            <Text strong>{task.title}</Text>
            <Tag color={getStatusColor(task.status)}>
              {getStatusText(task.status)}
            </Tag>
            {task.assignee_name && (
              <Text type="secondary">
                <UserOutlined /> {task.assignee_name}
              </Text>
            )}
            {task.due_date && (
              <Text type="secondary">
                <CalendarOutlined /> {dayjs(task.due_date).format('YYYY-MM-DD')}
              </Text>
            )}
          </Space>
        </div>
      </div>

      {/* 子任务信息 */}
      {children.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>
            <ArrowDownOutlined /> 子任务 ({children.length})
          </Title>
          {children.map(child => (
            <TaskItem key={child.id} task={child} prefix="📄 " />
          ))}
        </div>
      )}

      {/* 兄弟任务信息 */}
      {siblings.length > 0 && (
        <div>
          <Title level={5}>兄弟任务 ({siblings.length})</Title>
          {siblings.slice(0, 3).map(sibling => (
            <TaskItem key={sibling.id} task={sibling} prefix="📄 " />
          ))}
          {siblings.length > 3 && (
            <Text type="secondary">还有 {siblings.length - 3} 个兄弟任务...</Text>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <Divider />
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="任务层级">
          {task.task_level || 0} 级
        </Descriptions.Item>
        <Descriptions.Item label="子任务数量">
          {children.length} 个
        </Descriptions.Item>
        {parent && (
          <Descriptions.Item label="父任务">
            {parent.title}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="兄弟任务数量">
          {siblings.length} 个
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default TaskHierarchyInfo;
