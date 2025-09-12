import React from 'react';
import { Card, Tag, Space, Typography, Tooltip, Button, Descriptions, Badge, Avatar } from 'antd';
import { 
  TagOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TaskBasicInfoProps {
  task: Task;
  projectInfo?: any;
  onEdit: () => void;
  onDelete: () => void;
  statusConfig: {
    color: string;
    text: string;
    icon: React.ReactNode;
    bgColor: string;
  };
  priorityConfig: {
    color: string;
    text: string;
  };
  timeRemaining?: {
    text: string;
    type: 'normal' | 'warning' | 'danger';
  } | null;
}

/**
 * 任务基本信息组件
 * 显示任务的核心信息，经过内存优化
 */
export const TaskBasicInfo: React.FC<TaskBasicInfoProps> = React.memo(({
  task,
  projectInfo,
  onEdit,
  onDelete,
  statusConfig,
  priorityConfig,
  timeRemaining
}) => {
  return (
    <Card 
      className="task-status-card"
      style={{ 
        marginBottom: '24px',
        background: statusConfig.bgColor,
        border: `2px solid ${statusConfig.color}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px', color: statusConfig.color }}>
              {statusConfig.icon}
            </div>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              {task.title}
            </Title>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TagOutlined style={{ color: '#666' }} />
              <Text>优先级:</Text>
              <Tag color={priorityConfig.color}>{priorityConfig.text}</Tag>
            </div>
            
            {task.assignee_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserOutlined style={{ color: '#666' }} />
                <Text>负责人: 用户 {task.assignee_id}</Text>
              </div>
            )}
            
            {timeRemaining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarOutlined style={{ 
                  color: timeRemaining.type === 'danger' ? '#ff4d4f' : 
                         timeRemaining.type === 'warning' ? '#fa8c16' : '#666' 
                }} />
                <Text style={{ 
                  color: timeRemaining.type === 'danger' ? '#ff4d4f' : 
                         timeRemaining.type === 'warning' ? '#fa8c16' : '#666' 
                }}>
                  {timeRemaining.text}
                </Text>
              </div>
            )}
          </div>

          {/* 标签 */}
          {task.custom_fields?.tags && Array.isArray(task.custom_fields.tags) && task.custom_fields.tags.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary" style={{ marginRight: '8px' }}>标签:</Text>
              <Space wrap>
                {task.custom_fields.tags.map((tag: string, index: number) => (
                  <Tag key={index} color="blue">{tag}</Tag>
                ))}
              </Space>
            </div>
          )}
        </div>

        <Space>
          <Tooltip title="编辑任务">
            <Button type="primary" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          <Tooltip title="删除任务">
            <Button danger icon={<DeleteOutlined />} onClick={onDelete} />
          </Tooltip>
        </Space>
      </div>
    </Card>
  );
});

TaskBasicInfo.displayName = 'TaskBasicInfo';

interface TaskDetailInfoProps {
  task: Task;
  projectInfo?: any;
  parentTask?: Task | null;
}

/**
 * 任务详细信息组件
 * 右侧边栏的基本信息显示
 */
export const TaskDetailInfo: React.FC<TaskDetailInfoProps> = React.memo(({
  task,
  projectInfo,
  parentTask
}) => {
  return (
    <Card title="基本信息" style={{ marginBottom: '16px' }}>
      <Descriptions column={1} >
        <Descriptions.Item label="任务ID">#{task.id}</Descriptions.Item>
        
        <Descriptions.Item label="所属项目">
          {projectInfo ? (
            <span>{projectInfo.name} (#{task.project_id})</span>
          ) : task.project_name ? (
            <span>{task.project_name} (#{task.project_id})</span>
          ) : (
            `项目 #${task.project_id}`
          )}
        </Descriptions.Item>
        
        {task.parent_id && parentTask && (
          <Descriptions.Item label="父任务">
            <span>{parentTask.title} (#{task.parent_id})</span>
          </Descriptions.Item>
        )}
        
        <Descriptions.Item label="创建时间">
          {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        
        <Descriptions.Item label="更新时间">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}</span>
            {(task.updated_by_username || task.updated_by) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#8c8c8c' }}>by</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Avatar 
                    size={16} 
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff', fontSize: '8px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#595959' }}>
                    {task.updated_by_username || `用户${task.updated_by}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Descriptions.Item>
        
        {task.due_date && (
          <Descriptions.Item label="截止时间">
            {dayjs(task.due_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
        )}
        
        {task.custom_fields?.estimated_hours && (
          <Descriptions.Item label="预估工时">
            {task.custom_fields.estimated_hours} 小时
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
});

TaskDetailInfo.displayName = 'TaskDetailInfo';
