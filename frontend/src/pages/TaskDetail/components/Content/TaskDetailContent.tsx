/**
 * TaskDetailContent - 任务详情主内容区域
 * 包含: 完成统计、子任务树、详情Tab面板
 */

import React, { useRef, useMemo, lazy, Suspense } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Space,
  Button,
  Spin,
  Statistic,
  Badge,
  Tooltip,
  Typography,
  Tabs,
  message
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  ImportOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EditOutlined,
  BarChartOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { TaskDetailDescendantsTreeV2, TaskDetailDescendantsTreeRef } from '../../../../components/TaskDetailDescendantsTreeV2';
import { UnifiedTaskRefresh, RefreshContext } from '../../../../components/UnifiedTaskRefresh';
import AnimatedContainer, { UpdateAnimation } from '../../../../components/AnimatedContainer';
import { RefreshConfigButton } from '../../../../components/RefreshConfigModal';
import TaskInfoEditor from '../../../../components/TaskInfoEditor';
import TaskSummaryEditor from '../../../../components/TaskSummaryEditor';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import { TaskBreadcrumb } from '../Header/TaskBreadcrumb';
import { EnhancedTaskHeaderCard } from '../Header/EnhancedTaskHeaderCard';
import { useTaskDetailContext } from '../../hooks/useTaskDetailContext';
import type { TaskRequest } from '../../types';
import { TaskService } from '../../../../services/taskService';

const { Text } = Typography;

// Lazy load UnifiedTaskDocumentArea for better performance
const LazyUnifiedTaskDocumentArea = lazy(
  () => import('../../../../components/UnifiedTaskDocumentArea')
);

// Lazy load TaskAnalysisPanel
const TaskAnalysisPanel = lazy(
  () => import('../../../../components/TaskAnalysisPanel')
);

export interface TaskDetailContentProps {
  projectId: number;
  onCreateSubtask: () => void;
  onBulkImportSubtasks: () => void;
  onUpdateTask: (taskData: Partial<TaskRequest>) => Promise<void>;
  onDocsChange?: () => void;
}

/**
 * TaskDetailContent组件
 */
const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  projectId,
  onCreateSubtask,
  onBulkImportSubtasks,
  onUpdateTask,
  onDocsChange
}) => {
  const { task, relations, ui, statistics, actions } = useTaskDetailContext();
  const subtasksRef = useRef<TaskDetailDescendantsTreeRef>(null);

  // 如果没有任务数据，不渲染
  if (!task) {
    return null;
  }

  // 状态配置
  const statusConfig = useMemo(() => {
    const configs = {
      todo: {
        text: '待开始',
        color: '#d9d9d9',
        bgColor: '#fafafa',
        icon: <PauseCircleOutlined />
      },
      in_progress: {
        text: '进行中',
        color: '#1890ff',
        bgColor: '#e6f7ff',
        icon: <PlayCircleOutlined />
      },
      completed: {
        text: '已完成',
        color: '#52c41a',
        bgColor: '#f6ffed',
        icon: <CheckCircleOutlined />
      },
      cancelled: {
        text: '已取消',
        color: '#ff4d4f',
        bgColor: '#fff2f0',
        icon: <StopOutlined />
      },
      archived: {
        text: '已归档',
        color: '#8c8c8c',
        bgColor: '#f0f0f0',
        icon: <InboxOutlined />
      }
    };
    return configs[task.status as keyof typeof configs] || configs.todo;
  }, [task.status]);

  // 优先级配置
  const priorityConfig = useMemo(() => {
    const configs = {
      low: { text: '低', color: '#52c41a' },
      medium: { text: '中', color: '#faad14' },
      high: { text: '高', color: '#ff4d4f' },
      critical: { text: '紧急', color: '#f5222d' }
    };
    const priority = (task.custom_fields?.priority || 'medium') as keyof typeof configs;
    return configs[priority] || configs.medium;
  }, [task.custom_fields?.priority]);

  // 恢复任务处理
  const handleUnarchive = async () => {
    try {
      await TaskService.updateTask(projectId, task.id, { status: 'todo' });
      message.success('任务已恢复到待开始状态');
      await actions.refreshTask();
    } catch (error) {
      message.error('恢复任务失败');
      console.error('Unarchive task error:', error);
    }
  };

  // 编辑任务处理
  const handleEdit = () => {
    actions.setUI({
      modals: {
        ...ui.modals,
        edit: {
          visible: true,
          data: { mode: 'edit' }
        }
      }
    });
  };

  // 删除任务处理
  const handleDelete = () => {
    actions.setUI({
      modals: {
        ...ui.modals,
        delete: {
          visible: true
        }
      }
    });
  };

  // 计算完成统计数据
  const completionState = useMemo(() => {
    if (!statistics?.completionStats) {
      return {
        totalSubtasks: 0,
        completedSubtasks: 0,
        inProgressSubtasks: 0,
        todoSubtasks: 0,
        completionRate: 0
      };
    }

    const { total, completed, inProgress, todo } = statistics.completionStats;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalSubtasks: total,
      completedSubtasks: completed,
      inProgressSubtasks: inProgress,
      todoSubtasks: todo,
      completionRate: rate
    };
  }, [statistics?.completionStats]);

  // 刷新完成统计数据
  const refreshCompletionStats = async () => {
    await actions.loadStatistics();
  };

  // 刷新子任务
  const refreshSubtasks = () => {
    subtasksRef.current?.refresh();
  };

  // Tab定义
  const tabItems = useMemo(() => {
    const documentTabLabel = (
      <Space>
        <EditOutlined />
        <span>文档</span>
      </Space>
    );

    return [
      {
        key: 'info',
        label: '任务信息',
        children: (
          <div>
            {task.description ? (
              <TaskInfoEditor
                task={task}
                onUpdate={onUpdateTask}
                style={{ marginBottom: '16px' }}
              />
            ) : (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#8c8c8c',
                  background: '#fafafa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: '4px'
                }}
              >
                <EditOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <div>暂无任务描述</div>
              </div>
            )}

            <TaskSummaryEditor
              summary={task.custom_fields?.task_summary || ''}
              description={task.description || ''}
              onUpdate={async (summary) => {
                await onUpdateTask({
                  custom_fields: {
                    ...task.custom_fields,
                    task_summary: summary
                  }
                } as any);
              }}
              loading={false}
              style={{ marginBottom: '16px' }}
            />
          </div>
        )
      },
      {
        key: 'document',
        label: documentTabLabel,
        children:
          ui.activeTab === 'document' ? (
            <div>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      background: '#fafafa',
                      borderRadius: '8px',
                      minHeight: '400px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Spin size="large" />
                    <div
                      style={{
                        marginTop: '24px',
                        fontSize: '16px',
                        color: '#1890ff',
                        fontWeight: 500
                      }}
                    >
                      ⚡ 正在加载文档编辑器...
                    </div>
                    <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '14px' }}>
                      首次加载可能需要几秒钟
                    </div>
                  </div>
                }
              >
                <LazyUnifiedTaskDocumentArea
                  taskId={task.id}
                  projectId={projectId}
                  defaultViewMode="edit"
                  showToolbar={true}
                  showDocumentList={true}
                  compactMode={false}
                  headerVisible={false}
                  includeSubtaskDocuments={false}
                  onDocumentChange={onDocsChange}
                  onViewModeChange={undefined}
                />
              </Suspense>
            </div>
          ) : (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#8c8c8c',
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: '4px'
              }}
            >
              <EditOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>切换到此标签页以加载文档</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                为了提升性能，文档组件采用懒加载模式
              </div>
            </div>
          )
      },
      {
        key: 'progress',
        label: (
          <Space>
            <BarChartOutlined />
            <span>进度分析</span>
          </Space>
        ),
        children:
          ui.activeTab === 'progress' ? (
            <div>
              <Suspense fallback={<Spin size="large" />}>
                <TaskAnalysisPanel task={task} subtasks={relations.subtasks} />
              </Suspense>
            </div>
          ) : (
            <div
              style={{
                minHeight: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Spin size="large" />
            </div>
          )
      }
    ];
  }, [task, ui.activeTab, relations.subtasks, projectId, onUpdateTask, onDocsChange]);

  return (
    <Col xs={24} sm={24} md={24} lg={16} xl={16} className="content-area">
      {/* Breadcrumb Navigation */}
      <TaskBreadcrumb
        task={task}
        parentTask={relations.parent}
        projectId={projectId}
      />

      {/* Enhanced Task Header Card */}
      <EnhancedTaskHeaderCard
        task={task}
        projectId={projectId}
        statusConfig={statusConfig}
        priorityConfig={priorityConfig}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUnarchive={handleUnarchive}
        testId="task-header-card"
      />

      {/* 任务摘要（AI提炼）*/}
      {task.custom_fields?.task_summary && (
        <Card style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Text strong>任务摘要</Text>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.8)',
              padding: '12px',
              borderRadius: '6px',
              margin: 0
            }}>
              {task.status === 'archived' ? (
                <div style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  {task.custom_fields?.task_summary || '暂无任务摘要'}
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    任务已归档，无法编辑摘要
                  </Text>
                </div>
              ) : (
                <TaskSummaryEditor
                  summary={task.custom_fields?.task_summary || ''}
                  description={task.description || ''}
                  onUpdate={async (summary) => {
                    await onUpdateTask({
                      custom_fields: {
                        ...task.custom_fields,
                        task_summary: summary
                      }
                    } as any);
                  }}
                  loading={false}
                />
              )}
            </div>
          </Card>
        )}

        {/* 完成情况统计 - 如果有子任务 */}
        {completionState.totalSubtasks > 0 && (
        <AnimatedContainer type="fade" visible={true}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>任务完成情况</span>
                <UnifiedTaskRefresh
                  onRefreshCompletionStats={refreshCompletionStats}
                  onRefreshSubtasks={refreshSubtasks}
                  showProgress={true}
                  tooltip="任务完成情况和子任务智能刷新"
                />
                <RefreshConfigButton />
              </div>
            }
            style={{ marginBottom: '24px' }}
          >
            <UpdateAnimation
              updateTrigger={completionState.completionRate}
              type="highlight"
              duration="normal"
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={completionState.completionRate}
                      size={120}
                      format={() =>
                        `${completionState.completedSubtasks}/${completionState.totalSubtasks}`
                      }
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068'
                      }}
                    />
                    <div style={{ marginTop: '12px' }}>
                      <Text strong style={{ fontSize: '16px' }}>
                        {completionState.completionRate}% 完成
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <UpdateAnimation
                      updateTrigger={completionState.completedSubtasks}
                      type="pulse"
                      duration="fast"
                    >
                      <Statistic
                        title="已完成子任务"
                        value={completionState.completedSubtasks}
                        suffix={`/ ${completionState.totalSubtasks}`}
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </UpdateAnimation>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <UpdateAnimation
                          updateTrigger={completionState.inProgressSubtasks}
                          type="highlight"
                          duration="fast"
                          highlightColor="#e6f7ff"
                        >
                          <Badge
                            color="#1890ff"
                            text={`进行中 ${completionState.inProgressSubtasks}`}
                          />
                        </UpdateAnimation>
                      </div>
                      <div>
                        <UpdateAnimation
                          updateTrigger={completionState.todoSubtasks}
                          type="highlight"
                          duration="fast"
                          highlightColor="#f5f5f5"
                        >
                          <Badge color="#d9d9d9" text={`待开始 ${completionState.todoSubtasks}`} />
                        </UpdateAnimation>
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>
            </UpdateAnimation>
          </Card>
        </AnimatedContainer>
      )}

      {/* 子任务树（懒加载） */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BranchesOutlined />
            <span>子任务树</span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>(自动刷新)</span>
          </div>
        }
        style={{ marginBottom: '24px' }}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreateSubtask}>
              添加子任务
            </Button>
            <Button type="default" icon={<ImportOutlined />} onClick={onBulkImportSubtasks}>
              批量导入
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '4px 0' }}>
          <TaskDetailDescendantsTreeV2
            ref={subtasksRef}
            projectId={projectId}
            rootTaskId={task.id}
            limit={200}
          />
        </div>
      </Card>

      {/* 任务详情Tabs */}
      <Card style={{ marginBottom: '24px' }}>
        <Tabs
          activeKey={ui.activeTab}
          onChange={actions.setActiveTab}
          type="card"
          size="large"
          items={tabItems}
        />
      </Card>
    </Col>
  );
};

TaskDetailContent.displayName = 'TaskDetailContent';

export default TaskDetailContent;
