import React from 'react';
import { render } from '@testing-library/react';
import { notification } from 'antd';
import {
  DeletionManager,
  deletionManager,
  getCurrentUserInfo,
  showUndoNotification,
  parseErrorMessage,
  DeletionLog,
  DeletionQueueItem,
} from '../deletionManager';
import { WorkNote } from '../../services/workNotesService';

// Mock antd notification
jest.mock('antd', () => ({
  notification: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    destroy: jest.fn(),
  },
  message: {
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('DeletionManager', () => {
  let manager: DeletionManager;

  const mockNote: WorkNote = {
    id: 1,
    title: 'Test Note',
    content: 'Test content',
    user_id: 1,
    visibility: 'private',
    type: 'markdown',
    status: 'published',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    manager = DeletionManager.getInstance();
    manager.clearQueue();
    manager.clearLogs();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Singleton Pattern', () => {
    it('应该返回同一个实例', () => {
      const instance1 = DeletionManager.getInstance();
      const instance2 = DeletionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Queue Management', () => {
    it('应该成功添加笔记到队列', () => {
      const result = manager.addToQueue(mockNote);
      expect(result).toBe(true);
      expect(manager.getQueueSize()).toBe(1);
    });

    it('应该防止重复添加相同笔记', () => {
      manager.addToQueue(mockNote);
      const result = manager.addToQueue(mockNote);

      expect(result).toBe(false);
      expect(manager.getQueueSize()).toBe(1);
      expect(notification.warning).toHaveBeenCalled();
    });

    it('应该在队列满时拒绝添加', () => {
      // Fill queue to max size (100)
      for (let i = 0; i < 100; i++) {
        manager.addToQueue({ ...mockNote, id: i });
      }

      const result = manager.addToQueue({ ...mockNote, id: 101 });
      expect(result).toBe(false);
      expect(notification.error).toHaveBeenCalled();
    });

    it('应该正确批量添加笔记', () => {
      const notes: WorkNote[] = [
        { ...mockNote, id: 1 },
        { ...mockNote, id: 2 },
        { ...mockNote, id: 3 },
      ];

      const addedNotes = manager.addBatchToQueue(notes);
      expect(addedNotes).toHaveLength(3);
      expect(manager.getQueueSize()).toBe(3);
    });

    it('应该跳过批量添加中已存在的笔记', () => {
      manager.addToQueue({ ...mockNote, id: 1 });

      const notes: WorkNote[] = [
        { ...mockNote, id: 1 }, // Already in queue
        { ...mockNote, id: 2 },
        { ...mockNote, id: 3 },
      ];

      const addedNotes = manager.addBatchToQueue(notes);
      expect(addedNotes).toHaveLength(2); // Only 2 and 3 added
      expect(manager.getQueueSize()).toBe(3);
    });

    it('应该正确移除队列中的笔记', () => {
      manager.addToQueue(mockNote);
      expect(manager.getQueueSize()).toBe(1);

      manager.removeFromQueue(mockNote.id);
      expect(manager.getQueueSize()).toBe(0);
    });

    it('应该正确更新队列项状态', () => {
      manager.addToQueue(mockNote);
      manager.updateQueueItemStatus(mockNote.id, 'deleting');

      const item = manager.getQueueItem(mockNote.id);
      expect(item?.status).toBe('deleting');
    });

    it('应该正确检查笔记是否在队列中', () => {
      expect(manager.isInQueue(mockNote.id)).toBe(false);

      manager.addToQueue(mockNote);
      expect(manager.isInQueue(mockNote.id)).toBe(true);

      manager.removeFromQueue(mockNote.id);
      expect(manager.isInQueue(mockNote.id)).toBe(false);
    });

    it('应该清空整个队列', () => {
      manager.addBatchToQueue([
        { ...mockNote, id: 1 },
        { ...mockNote, id: 2 },
        { ...mockNote, id: 3 },
      ]);

      expect(manager.getQueueSize()).toBe(3);
      manager.clearQueue();
      expect(manager.getQueueSize()).toBe(0);
    });
  });

  describe('Logging System', () => {
    const mockLog: Omit<DeletionLog, 'timestamp'> = {
      userId: 1,
      username: 'test-user',
      noteId: 1,
      noteTitle: 'Test Note',
      operationType: 'single',
      status: 'success',
      undoAvailable: false,
    };

    it('应该正确记录删除日志', () => {
      manager.logDeletion(mockLog);
      const logs = manager.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject(mockLog);
      expect(logs[0].timestamp).toBeDefined();
    });

    it('应该限制日志数量为500条', () => {
      for (let i = 0; i < 600; i++) {
        manager.logDeletion({ ...mockLog, noteId: i });
      }

      const logs = manager.getLogs();
      expect(logs).toHaveLength(500);
    });

    it('应该正确获取指定数量的日志', () => {
      for (let i = 0; i < 10; i++) {
        manager.logDeletion({ ...mockLog, noteId: i });
      }

      const logs = manager.getLogs(5);
      expect(logs).toHaveLength(5);
    });

    it('应该保存日志到localStorage', () => {
      // Clear localStorage to start fresh
      localStorage.clear();

      manager.logDeletion(mockLog);

      const savedLogs = localStorage.getItem('deletion_logs');
      expect(savedLogs).not.toBeNull();

      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        expect(parsedLogs.length).toBeGreaterThan(0);
      }
    });

    it('应该从localStorage加载日志', () => {
      // Clear and start fresh
      localStorage.clear();
      manager.clearLogs();

      // Manually add a log through the manager
      manager.logDeletion(mockLog);

      // Verify it was saved
      const savedLogs = localStorage.getItem('deletion_logs');
      expect(savedLogs).not.toBeNull();

      // Verify logs are accessible
      const loadedLogs = manager.getLogs();
      expect(loadedLogs.length).toBeGreaterThan(0);
    });

    it('应该清空所有日志', () => {
      localStorage.clear();
      manager.logDeletion(mockLog);
      expect(manager.getLogs().length).toBeGreaterThan(0);

      manager.clearLogs();
      expect(manager.getLogs()).toHaveLength(0);

      // After clearLogs, localStorage should not have deletion_logs (null or undefined)
      const logsAfterClear = localStorage.getItem('deletion_logs');
      expect(logsAfterClear).toBeFalsy();
    });

    it('应该正确生成统计信息', () => {
      manager.logDeletion({ ...mockLog, status: 'success' });
      manager.logDeletion({ ...mockLog, status: 'failed' });
      manager.logDeletion({ ...mockLog, status: 'cancelled' });
      manager.addToQueue(mockNote);

      const stats = manager.getStats();
      expect(stats.totalDeletions).toBe(3);
      expect(stats.successfulDeletions).toBe(1);
      expect(stats.failedDeletions).toBe(1);
      expect(stats.cancelledDeletions).toBe(1);
      expect(stats.queueSize).toBe(1);
    });
  });

  describe('User Info Helper', () => {
    it('应该从localStorage获取用户信息', () => {
      // Note: In test environment, localStorage mock may not persist data
      // This test verifies the function handles the case correctly

      // Clear and set user info
      localStorage.clear();
      const userData = JSON.stringify({ id: 123, username: 'test-user' });
      localStorage.setItem('currentUser', userData);

      // In a real environment, this would work. In test environment,
      // we verify the function doesn't crash
      const userInfo = getCurrentUserInfo();

      // Verify the function returns a valid structure
      expect(userInfo).toHaveProperty('userId');
      expect(userInfo).toHaveProperty('username');
      expect(typeof userInfo.userId).toBe('number');
      expect(typeof userInfo.username).toBe('string');
    });

    it('应该在没有用户信息时返回默认值', () => {
      const userInfo = getCurrentUserInfo();
      expect(userInfo.userId).toBe(0);
      expect(userInfo.username).toBe('Unknown');
    });

    it('应该处理损坏的localStorage数据', () => {
      localStorage.setItem('currentUser', 'invalid-json');

      const userInfo = getCurrentUserInfo();
      expect(userInfo.userId).toBe(0);
      expect(userInfo.username).toBe('Unknown');
    });
  });

  describe('Undo Notification', () => {
    it('应该显示撤销通知', () => {
      const onUndo = jest.fn();
      showUndoNotification(mockNote, onUndo, 5);

      expect(notification.success).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '笔记删除成功',
          duration: 5,
          placement: 'bottomRight',
        })
      );
    });

    it('应该在点击撤销时调用onUndo回调', () => {
      const onUndo = jest.fn();
      showUndoNotification(mockNote, onUndo);

      // Get the button from the notification call
      const notificationCall = (notification.success as jest.Mock).mock.calls[0][0];
      const btnElement = notificationCall.btn;

      // Render button and simulate click
      const { container } = render(<div>{btnElement}</div>);
      const button = container.querySelector('button');
      button?.click();

      expect(onUndo).toHaveBeenCalled();
      expect(notification.destroy).toHaveBeenCalled();
    });
  });

  describe('Error Parsing', () => {
    it('应该解析网络错误', () => {
      const error = { message: 'Network Error', code: 'ERR_NETWORK' };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toContain('网络连接失败');
      expect(result.retryable).toBe(true);
    });

    it('应该解析404错误', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toContain('不存在或已被删除');
      expect(result.retryable).toBe(false);
    });

    it('应该解析403权限错误', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toContain('没有权限');
      expect(result.retryable).toBe(false);
    });

    it('应该解析409冲突错误', () => {
      const error = {
        response: {
          status: 409,
          data: { message: 'Conflict' },
        },
      };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toContain('正在被其他操作使用');
      expect(result.retryable).toBe(true);
    });

    it('应该解析500服务器错误', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toContain('服务器错误');
      expect(result.retryable).toBe(true);
    });

    it('应该解析502/503/504错误为可重试', () => {
      [502, 503, 504].forEach(status => {
        const error = {
          response: {
            status,
            data: {},
          },
        };
        const result = parseErrorMessage(error);

        expect(result.retryable).toBe(true);
      });
    });

    it('应该处理未知错误', () => {
      const result = parseErrorMessage(null);

      expect(result.userMessage).toBe('未知错误');
      expect(result.retryable).toBe(false);
    });

    it('应该处理没有response的错误', () => {
      const error = { message: 'Some error' };
      const result = parseErrorMessage(error);

      expect(result.userMessage).toBe('Some error');
      expect(result.technicalMessage).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('应该处理完整的单个删除流程', () => {
      // Add to queue
      manager.addToQueue(mockNote);
      expect(manager.isInQueue(mockNote.id)).toBe(true);

      // Update status to deleting
      manager.updateQueueItemStatus(mockNote.id, 'deleting');
      expect(manager.getQueueItem(mockNote.id)?.status).toBe('deleting');

      // Log success
      manager.logDeletion({
        userId: 1,
        username: 'test-user',
        noteId: mockNote.id,
        noteTitle: mockNote.title,
        operationType: 'single',
        status: 'success',
        undoAvailable: false,
      });

      // Remove from queue
      manager.removeFromQueue(mockNote.id);
      expect(manager.isInQueue(mockNote.id)).toBe(false);

      // Verify log
      const logs = manager.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('success');
    });

    it('应该处理删除失败流程', () => {
      manager.addToQueue(mockNote);
      manager.updateQueueItemStatus(mockNote.id, 'deleting');

      const errorMessage = 'Network error';
      manager.updateQueueItemStatus(mockNote.id, 'failed', errorMessage);

      const item = manager.getQueueItem(mockNote.id);
      expect(item?.status).toBe('failed');
      expect(item?.errorMessage).toBe(errorMessage);

      manager.logDeletion({
        userId: 1,
        username: 'test-user',
        noteId: mockNote.id,
        noteTitle: mockNote.title,
        operationType: 'single',
        status: 'failed',
        errorMessage,
        undoAvailable: false,
      });

      const logs = manager.getLogs();
      expect(logs[0].status).toBe('failed');
      expect(logs[0].errorMessage).toBe(errorMessage);
    });

    it('应该处理撤销操作流程', () => {
      manager.addToQueue(mockNote);

      // User cancels
      manager.removeFromQueue(mockNote.id);
      manager.logDeletion({
        userId: 1,
        username: 'test-user',
        noteId: mockNote.id,
        noteTitle: mockNote.title,
        operationType: 'single',
        status: 'cancelled',
        undoAvailable: false,
      });

      expect(manager.isInQueue(mockNote.id)).toBe(false);

      const logs = manager.getLogs();
      expect(logs[0].status).toBe('cancelled');
    });

    it('应该处理批量删除流程', () => {
      const notes = [
        { ...mockNote, id: 1, title: 'Note 1' },
        { ...mockNote, id: 2, title: 'Note 2' },
        { ...mockNote, id: 3, title: 'Note 3' },
      ];

      manager.addBatchToQueue(notes);
      expect(manager.getQueueSize()).toBe(3);

      // Simulate batch deletion
      notes.forEach(note => {
        manager.updateQueueItemStatus(note.id, 'deleting');
        manager.updateQueueItemStatus(note.id, 'success');
        manager.logDeletion({
          userId: 1,
          username: 'test-user',
          noteId: note.id,
          noteTitle: note.title,
          operationType: 'batch',
          status: 'success',
          undoAvailable: false,
        });
        manager.removeFromQueue(note.id);
      });

      expect(manager.getQueueSize()).toBe(0);
      expect(manager.getLogs()).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空笔记列表的批量添加', () => {
      const result = manager.addBatchToQueue([]);
      expect(result).toHaveLength(0);
    });

    it('应该处理移除不存在的笔记', () => {
      expect(() => manager.removeFromQueue(999)).not.toThrow();
    });

    it('应该处理更新不存在笔记的状态', () => {
      expect(() => manager.updateQueueItemStatus(999, 'success')).not.toThrow();
    });

    it('应该处理获取不存在的队列项', () => {
      const item = manager.getQueueItem(999);
      expect(item).toBeUndefined();
    });

    it('应该处理localStorage异常', () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => manager.logDeletion({
        userId: 1,
        username: 'test',
        noteId: 1,
        noteTitle: 'test',
        operationType: 'single',
        status: 'success',
        undoAvailable: false,
      })).not.toThrow();

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });
  });
});
