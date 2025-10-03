/**
 * TaskDetailModals - 任务详情相关的所有模态框
 * 集成现有的模态框组件: TaskModal, TaskArchiveModal, BulkSubTaskCreator
 */

import React from 'react';
import TaskModal from '../../../../components/TaskModal';
import TaskArchiveModal from '../../../../components/TaskArchiveModal';
import BulkSubTaskCreator from '../../../../components/BulkSubTaskCreator';
import { useTaskDetailContext } from '../../hooks/useTaskDetailContext';
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

  if (!task) {
    return null;
  }

  // 关闭任务模态框
  const handleTaskModalCancel = () => {
    actions.closeModal('taskModal');
  };

  // 关闭归档模态框
  const handleArchiveModalCancel = () => {
    actions.closeModal('archiveModal');
  };

  // 关闭批量子任务模态框
  const handleBulkSubTaskModalCancel = () => {
    actions.closeModal('bulkSubTaskModal');
  };

  // 获取任务模态框的任务数据
  const getTaskForModal = () => {
    const mode = ui.modals.taskModal.mode;
    if (mode === 'edit') return task;
    if (mode === 'createSubtask') return undefined;
    if (mode === 'createSibling') return undefined;
    return undefined;
  };

  // 获取父任务（用于创建子任务）
  const getParentTask = () => {
    const mode = ui.modals.taskModal.mode;
    if (mode === 'createSubtask') return task;
    return undefined;
  };

  // 获取兄弟任务（用于创建兄弟任务）
  const getSiblingTask = () => {
    const mode = ui.modals.taskModal.mode;
    if (mode === 'createSibling') return task;
    return undefined;
  };

  return (
    <>
      {/* 统一的任务模态框 */}
      {ui.modals.taskModal.visible && (
        <TaskModal
          visible={ui.modals.taskModal.visible}
          task={getTaskForModal()}
          parentTask={getParentTask()}
          siblingTask={getSiblingTask()}
          mode={ui.modals.taskModal.mode || 'create'}
          projectId={projectId}
          onOk={onTaskModalSubmit}
          onCancel={handleTaskModalCancel}
          loading={ui.loading.modal}
          allowParentSelection={true}
          onEditDetails={onEditDetails}
        />
      )}

      {/* Archive Modal */}
      {ui.modals.archiveModal.visible && (
        <TaskArchiveModal
          visible={ui.modals.archiveModal.visible}
          onCancel={handleArchiveModalCancel}
          onSuccess={onArchiveSuccess}
          projectId={projectId}
          tasks={[task]}
          mode="single"
        />
      )}

      {/* Bulk SubTask Creator Modal */}
      {ui.modals.bulkSubTaskModal.visible && (
        <BulkSubTaskCreator
          visible={ui.modals.bulkSubTaskModal.visible}
          onCancel={handleBulkSubTaskModalCancel}
          onSuccess={onBulkSubTaskSuccess}
          parentTask={task}
          projectId={projectId}
        />
      )}
    </>
  );
};

TaskDetailModals.displayName = 'TaskDetailModals';

export default TaskDetailModals;
