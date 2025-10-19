/**
 * TaskDetailContent - 任务详情主内容区域
 * 包含: 完成统计、子任务树、详情Tab面板
 */

import React, { useRef, useMemo, lazy, Suspense, useState } from 'react';
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
  InboxOutlined,
  CommentOutlined
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
import AICreateDropdown from '../../../../components/TaskDetail/AICreateDropdown';
import SubtaskPreviewModal, { SubtaskPreview } from '../../../../components/TaskDetail/SubtaskPreviewModal';
import AIGeneratingModal from '../../../../components/TaskDetail/AIGeneratingModal';
import type { AIModel } from '../../../../config/aiModels';
import { aiTaskService, buildGenerateRequest } from '../../../../services/aiTaskService';
import { TaskComments } from '../../../../components/TaskComment';

const { Text } = Typography;

// Use SimpleTaskDocumentViewer for fast loading (<1s)
// UnifiedTaskDocumentArea has been replaced with a lightweight viewer
// Old component: 2376 lines, 53 hooks, 3-5s loading time
// New component: 353 lines, ~10 hooks, <1s loading time (85% reduction)
import SimpleTaskDocumentViewer from '../../../../components/SimpleTaskDocumentViewer';

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

  // AI生成相关状态
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel | null>(null);
  const [previewSubtasks, setPreviewSubtasks] = useState<SubtaskPreview[]>([]);
  const [creating, setCreating] = useState(false);

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

  // AI模型选择回调
  const handleAIModelSelect = async (
    modelKey: string,
    modelInfo: AIModel,
    customPrompt: string | null
  ) => {
    console.log('Selected AI model:', modelKey, modelInfo);
    console.log('Custom prompt:', customPrompt ? customPrompt.substring(0, 50) + '...' : 'using system default');
    setSelectedAIModel(modelInfo);
    setShowGeneratingModal(true);

    try {
      // 使用buildGenerateRequest构建请求
      const request = buildGenerateRequest(
        modelKey,
        customPrompt || undefined,
        {
          includeDescription: true,
          includeSiblings: false,
          maxSubtasks: 10
        }
      );

      // 调用AI生成API
      const result = await aiTaskService.generateSubtasks(task.id, request);

      setPreviewSubtasks(result.subtasks);
      setShowGeneratingModal(false);
      setShowPreviewModal(true);

      message.success(
        customPrompt
          ? `使用自定义提示词生成了 ${result.subtasks.length} 个子任务`
          : `使用系统默认Prompt生成了 ${result.subtasks.length} 个子任务`
      );
    } catch (error) {
      setShowGeneratingModal(false);
      message.error(error instanceof Error ? error.message : 'AI生成失败');
      console.error('AI generate error:', error);
    }
  };

  // 重新生成
  const handleRegenerate = async () => {
    if (!selectedAIModel) return;
    setShowPreviewModal(false);
    await handleAIModelSelect(selectedAIModel.key, selectedAIModel);
  };

  // 确认创建子任务
  const handleConfirmCreate = async (subtasks: SubtaskPreview[]) => {
    setCreating(true);
    try {
      // 调用批量创建API
      const result = await aiTaskService.batchCreateSubtasks({
        parent_id: task.id,
        subtasks: subtasks.map(st => ({
          title: st.title,
          description: st.description,
          estimated_hours: st.estimated_hours,
          priority: st.priority,
          tags: st.tags
        }))
      });

      message.success(`成功创建 ${result.created_count} 个子任务`);
      setShowPreviewModal(false);
      setPreviewSubtasks([]);

      // 刷新子任务列表
      refreshSubtasks();
      await actions.loadStatistics();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量创建失败');
      throw error;
    } finally {
      setCreating(false);
    }
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
        children: (
          <div>
            {/* SimpleTaskDocumentViewer - Lightweight viewer (353 lines, <1s loading) */}
            <SimpleTaskDocumentViewer
              taskId={task.id}
              projectId={projectId}
              onDocumentChange={onDocsChange}
              height={600}
            />
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
        children: (
          <div>
            <Suspense
              fallback={
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
              }
            >
              <TaskAnalysisPanel task={task} subtasks={relations.subtasks} />
            </Suspense>
          </div>
        )
      },
      {
        key: 'comments',
        label: (
          <Space>
            <CommentOutlined />
            <span>评论</span>
          </Space>
        ),
        children: (
          <div>
            <TaskComments
              taskId={task.id}
              showStats={true}
              defaultPageSize={20}
            />
          </div>
        )
      }
    ];
  }, [task, ui.activeTab, relations.subtasks, projectId, onUpdateTask, onDocsChange]);

  return (
    <>
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
            <AICreateDropdown
              taskId={task.id}
              taskTitle={task.title}
              onModelSelect={handleAIModelSelect}
            />
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

      {/* AI生成加载Modal */}
      <AIGeneratingModal
        visible={showGeneratingModal}
        modelName={selectedAIModel?.label || 'AI'}
      />

      {/* 子任务预览Modal */}
      <SubtaskPreviewModal
        visible={showPreviewModal}
        parentTask={task ? { id: task.id, title: task.title } : null}
        aiModel={selectedAIModel?.label || ''}
        initialSubtasks={previewSubtasks}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewSubtasks([]);
        }}
        onConfirm={handleConfirmCreate}
        onRegenerate={handleRegenerate}
        loading={showGeneratingModal}
        creating={creating}
      />
    </>
  );
};

TaskDetailContent.displayName = 'TaskDetailContent';

export default TaskDetailContent;
