/**
 * TaskDetailModals - 任务详情相关的所有模态框
 * 集成现有的模态框组件: TaskModal, TaskArchiveModal, BulkSubTaskCreator
 */

import React, { useEffect } from 'react';
import { Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import TaskModal from '../../../../components/TaskModal';
import TaskArchiveModal from '../../../../components/TaskArchiveModal';
import BulkSubTaskCreator from '../../../../components/BulkSubTaskCreator';
import { useTaskDetailContext } from '../../hooks/useTaskDetailContext';
import { TaskService } from '../../../../services/taskService';
import { useNavigate } from 'react-router-dom';
import type { TaskRequest } from '../../types';

export interface TaskDetailModalsProps {
  projectId: number;
  onTaskModalSubmit: (taskData: Partial<TaskRequest>) => Promise<void>;
  onArchiveSuccess: () => void;
  onBulkSubTaskSuccess: () => void;
  onEditDetails?: () => void;
}

/**
 * TaskDetailModals组件
 * 统一管理所有任务详情相关的模态框
 */
const TaskDetailModals: React.FC<TaskDetailModalsProps> = ({
  projectId,
  onTaskModalSubmit,
  onArchiveSuccess,
  onBulkSubTaskSuccess,
  onEditDetails
}) => {
  const { task, ui, actions } = useTaskDetailContext();
  const navigate = useNavigate();

  if (!task) {
    return null;
  }

  // 关闭任务模态框
  const handleTaskModalCancel = () => {
    actions.closeModal('edit');
  };

  // 关闭归档模态框
  const handleArchiveModalCancel = () => {
    actions.closeModal('archive');
  };

  // 关闭批量子任务模态框
  const handleBulkSubTaskModalCancel = () => {
    actions.closeModal('bulkImport');
  };

  // 删除任务处理
  const handleDeleteTask = async () => {
    if (!task) return;

    try {
      await TaskService.deleteTask(projectId, task.id);
      message.success('任务已删除');
      actions.closeModal('delete');

      // 删除成功后跳转到任务列表
      navigate(`/projects/${projectId}/tasks`);
    } catch (error: any) {
      message.error(error?.message || '删除任务失败');
      console.error('Delete task error:', error);
    }
  };

  // 监听删除模态框状态，使用Modal.confirm
  useEffect(() => {
    if (ui.modals.delete?.visible && task) {
      Modal.confirm({
        title: '确认删除任务',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>您确定要删除任务 <strong>"{task.title}"</strong> 吗？</p>
            <p style={{ color: '#ff4d4f', marginTop: '12px' }}>
              ⚠️ 此操作不可撤销！删除后该任务及其所有相关数据将永久丢失。
            </p>
            {task.has_children && (
              <p style={{ color: '#ff4d4f', marginTop: '8px' }}>
                ⚠️ 该任务包含子任务，删除后所有子任务也将被删除。
              </p>
            )}
          </div>
        ),
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: handleDeleteTask,
        onCancel: () => {
          actions.closeModal('delete');
        },
      });
    }
  }, [ui.modals.delete?.visible, task, projectId, navigate, actions]);

  // 获取任务模态框的任务数据
  const getTaskForModal = () => {
    const mode = ui.modals.edit?.data?.mode;
    if (mode === 'edit') return task;
    if (mode === 'createSubtask') return undefined;
    if (mode === 'createSibling') return undefined;
    return undefined;
  };

  // 获取父任务（用于创建子任务）
  const getParentTask = () => {
    const mode = ui.modals.edit?.data?.mode;
    if (mode === 'createSubtask') return task;
    return undefined;
  };

  // 获取兄弟任务（用于创建兄弟任务）
  const getSiblingTask = () => {
    const mode = ui.modals.edit?.data?.mode;
    if (mode === 'createSibling') return task;
    return undefined;
  };

  return (
    <>
      {/* 统一的任务模态框 */}
      <TaskModal
        visible={ui.modals.edit?.visible || false}
        task={getTaskForModal()}
        parentTask={getParentTask()}
        siblingTask={getSiblingTask()}
        mode={ui.modals.edit?.data?.mode || 'create'}
        projectId={projectId}
        onOk={onTaskModalSubmit}
        onCancel={handleTaskModalCancel}
        loading={ui.modals.edit?.loading || false}
        allowParentSelection={true}
        onEditDetails={onEditDetails}
      />

      {/* Archive Modal */}
      <TaskArchiveModal
        visible={ui.modals.archive?.visible || false}
        onCancel={handleArchiveModalCancel}
        onSuccess={onArchiveSuccess}
        projectId={projectId}
        tasks={[task]}
        mode="single"
      />

      {/* Bulk SubTask Creator Modal */}
      <BulkSubTaskCreator
        visible={ui.modals.bulkImport?.visible || false}
        onCancel={handleBulkSubTaskModalCancel}
        onSuccess={onBulkSubTaskSuccess}
        parentTask={task}
        projectId={projectId}
      />
    </>
  );
};

TaskDetailModals.displayName = 'TaskDetailModals';

export default TaskDetailModals;
