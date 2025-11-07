import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Input,
  List,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  Tooltip,
  Typography,
  Card,
  Row,
  Col
} from 'antd';
import {
  SearchOutlined,
  LinkOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
// ✅ FIXED - Import TaskService class instead of instance (TS2576)
import { TaskService } from '../services/taskService';
import { workNotesService, AssociatedTask } from '../services/workNotesService';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

interface TaskAssociationManagerProps {
  visible: boolean;
  noteId: number;
  onClose: () => void;
  onAssociationChange?: () => void;
}

/**
 * 任务关联管理组件
 *
 * 功能：
 * 1. 显示已关联的任务列表
 * 2. 搜索并添加新任务关联
 * 3. 移除任务关联
 */
const TaskAssociationManager: React.FC<TaskAssociationManagerProps> = ({
  visible,
  noteId,
  onClose,
  onAssociationChange
}) => {
  const [associatedTasks, setAssociatedTasks] = useState<AssociatedTask[]>([]);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [associating, setAssociating] = useState<number | null>(null);

  // 加载已关联的任务
  const loadAssociatedTasks = useCallback(async () => {
    try {
      setLoading(true);
      const tasks = await workNotesService.getAssociatedTasks(noteId);
      setAssociatedTasks(tasks);
    } catch (error: any) {
      console.error('Failed to load associated tasks:', error);
      message.error(error.message || '加载关联任务失败');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  // 搜索任务
  const handleSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // 使用项目ID 1 进行搜索，实际使用时应该动态获取
      const result = await TaskService.getTasks(1, {
        search: keyword,
        page: 1,
        limit: 20
      });

      // 过滤掉已关联的任务
      const associatedTaskIds = associatedTasks.map(t => t.id);
      const filtered = (result.data || result.tasks || []).filter(
        (task: Task) => !associatedTaskIds.includes(task.id)
      );

      setSearchResults(filtered);
    } catch (error: any) {
      console.error('Failed to search tasks:', error);
      message.error(error.message || '搜索任务失败');
    } finally {
      setSearching(false);
    }
  }, [associatedTasks]);

  // 关联任务
  const handleAssociate = async (taskId: number) => {
    try {
      setAssociating(taskId);
      await workNotesService.associateTask(noteId, taskId);
      message.success('关联成功');

      // 重新加载关联列表
      await loadAssociatedTasks();

      // 清空搜索结果
      setSearchResults([]);
      setSearchKeyword('');

      // 通知父组件
      onAssociationChange?.();
    } catch (error: any) {
      console.error('Failed to associate task:', error);
      message.error(error.message || '关联失败');
    } finally {
      setAssociating(null);
    }
  };

  // 移除关联
  const handleDisassociate = async (taskId: number) => {
    try {
      await workNotesService.disassociateTask(noteId, taskId);
      message.success('已移除关联');

      // 重新加载关联列表
      await loadAssociatedTasks();

      // 通知父组件
      onAssociationChange?.();
    } catch (error: any) {
      console.error('Failed to disassociate task:', error);
      message.error(error.message || '移除关联失败');
    }
  };

  // 初始加载
  useEffect(() => {
    if (visible) {
      loadAssociatedTasks();
    }
  }, [visible, loadAssociatedTasks]);

  // 渲染状态标签
  const renderStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      todo: { color: 'default', text: '待办', icon: <ClockCircleOutlined /> },
      in_progress: { color: 'blue', text: '进行中', icon: <SyncOutlined spin /> },
      completed: { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> },
      blocked: { color: 'red', text: '受阻', icon: <ExclamationCircleOutlined /> }
    };

    const config = statusConfig[status] || { color: 'default', text: status, icon: null };

    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 渲染优先级标签
  const renderPriorityTag = (priority?: string) => {
    if (!priority) return null;

    const priorityConfig: Record<string, { color: string; text: string }> = {
      low: { color: 'default', text: '低' },
      medium: { color: 'blue', text: '中' },
      high: { color: 'orange', text: '高' },
      critical: { color: 'red', text: '紧急' }
    };

    const config = priorityConfig[priority] || { color: 'default', text: priority };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined />
          <span>管理任务关联</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 搜索区域 */}
        <Card title="添加任务关联" size="small">
          <Search
            placeholder="搜索任务标题或描述..."
            enterButton={<SearchOutlined />}
            size="large"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            loading={searching}
            style={{ marginBottom: 16 }}
          />

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <List
              dataSource={searchResults}
              loading={searching}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Button
                      key="associate"
                      type="primary"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => handleAssociate(task.id)}
                      loading={associating === task.id}
                    >
                      关联
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>#{task.id}</Text>
                        <Text>{task.title}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        {task.description && (
                          <Text type="secondary" ellipsis style={{ maxWidth: 500 }}>
                            {task.description}
                          </Text>
                        )}
                        <Space size={8}>
                          {renderStatusTag(task.status)}
                          {renderPriorityTag(task.priority)}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            创建于 {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}

          {searchKeyword && searchResults.length === 0 && !searching && (
            <Empty description="未找到匹配的任务" />
          )}
        </Card>

        {/* 已关联任务列表 */}
        <Card
          title={`已关联任务 (${associatedTasks.length})`}
          size="small"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="加载中...">
                <div style={{ minHeight: '80px' }} />
              </Spin>
            </div>
          ) : associatedTasks.length === 0 ? (
            <Empty description="暂无关联任务" />
          ) : (
            <List
              dataSource={associatedTasks}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Tooltip key="delete" title="移除关联">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDisassociate(task.id)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>#{task.id}</Text>
                        <Text>{task.title}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        {task.description && (
                          <Text type="secondary" ellipsis style={{ maxWidth: 500 }}>
                            {task.description}
                          </Text>
                        )}
                        <Space size={8}>
                          {renderStatusTag(task.status)}
                          {renderPriorityTag(task.priority)}
                          {task.created_at && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              关联于 {dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
                            </Text>
                          )}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>
    </Modal>
  );
};

export default TaskAssociationManager;
