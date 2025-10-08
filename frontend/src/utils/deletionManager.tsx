import { WorkNote } from '../services/workNotesService';
import { notification } from 'antd';
import { UndoOutlined } from '@ant-design/icons';

// 删除日志接口
export interface DeletionLog {
  timestamp: string;
  userId: number;
  username: string;
  noteId: number;
  noteTitle: string;
  operationType: 'single' | 'batch';
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  errorMessage?: string;
  undoAvailable: boolean;
}

// 删除队列项
export interface DeletionQueueItem {
  noteId: number;
  note: WorkNote;
  status: 'pending' | 'deleting' | 'success' | 'failed' | 'cancelled';
  addedAt: number;
  errorMessage?: string;
  undoTimeoutId?: NodeJS.Timeout;
}

// 删除管理器类
export class DeletionManager {
  private deletionQueue: Map<number, DeletionQueueItem> = new Map();
  private deletionLogs: DeletionLog[] = [];
  private maxQueueSize = 100; // 最大队列大小
  private undoTimeout = 5000; // 撤销超时时间(毫秒)
  private maxRetries = 3; // 最大重试次数

  // 单例模式
  private static instance: DeletionManager;

  private constructor() {
    // 从localStorage恢复日志
    this.loadLogsFromStorage();
  }

  public static getInstance(): DeletionManager {
    if (!DeletionManager.instance) {
      DeletionManager.instance = new DeletionManager();
    }
    return DeletionManager.instance;
  }

  // 添加删除到队列
  public addToQueue(note: WorkNote): boolean {
    // 检查是否已在队列中
    if (this.deletionQueue.has(note.id)) {
      const existingItem = this.deletionQueue.get(note.id)!;
      if (existingItem.status === 'deleting' || existingItem.status === 'pending') {
        console.warn(`[DeletionManager] 笔记 #${note.id} 已在删除队列中，状态: ${existingItem.status}`);
        notification.warning({
          message: '删除进行中',
          description: `笔记"${note.title}"正在删除中，请稍候...`,
          duration: 2,
        });
        return false;
      }
    }

    // 检查队列大小
    if (this.deletionQueue.size >= this.maxQueueSize) {
      console.error('[DeletionManager] 删除队列已满');
      notification.error({
        message: '删除队列已满',
        description: '请等待之前的删除操作完成',
        duration: 3,
      });
      return false;
    }

    const queueItem: DeletionQueueItem = {
      noteId: note.id,
      note: note,
      status: 'pending',
      addedAt: Date.now(),
    };

    this.deletionQueue.set(note.id, queueItem);
    console.log(`[DeletionManager] 笔记 #${note.id} "${note.title}" 已添加到删除队列`);

    return true;
  }

  // 批量添加到队列
  public addBatchToQueue(notes: WorkNote[]): WorkNote[] {
    const addedNotes: WorkNote[] = [];

    notes.forEach(note => {
      if (this.addToQueue(note)) {
        addedNotes.push(note);
      }
    });

    console.log(`[DeletionManager] 批量添加 ${addedNotes.length}/${notes.length} 个笔记到删除队列`);
    return addedNotes;
  }

  // 从队列中移除
  public removeFromQueue(noteId: number): void {
    const item = this.deletionQueue.get(noteId);
    if (item && item.undoTimeoutId) {
      clearTimeout(item.undoTimeoutId);
    }
    this.deletionQueue.delete(noteId);
    console.log(`[DeletionManager] 笔记 #${noteId} 已从删除队列移除`);
  }

  // 更新队列项状态
  public updateQueueItemStatus(
    noteId: number,
    status: DeletionQueueItem['status'],
    errorMessage?: string
  ): void {
    const item = this.deletionQueue.get(noteId);
    if (item) {
      item.status = status;
      if (errorMessage) {
        item.errorMessage = errorMessage;
      }
      this.deletionQueue.set(noteId, item);
      console.log(`[DeletionManager] 笔记 #${noteId} 状态更新为: ${status}`);
    }
  }

  // 检查笔记是否在队列中
  public isInQueue(noteId: number): boolean {
    return this.deletionQueue.has(noteId);
  }

  // 获取队列项
  public getQueueItem(noteId: number): DeletionQueueItem | undefined {
    return this.deletionQueue.get(noteId);
  }

  // 获取队列大小
  public getQueueSize(): number {
    return this.deletionQueue.size;
  }

  // 清空队列
  public clearQueue(): void {
    this.deletionQueue.forEach(item => {
      if (item.undoTimeoutId) {
        clearTimeout(item.undoTimeoutId);
      }
    });
    this.deletionQueue.clear();
    console.log('[DeletionManager] 删除队列已清空');
  }

  // 记录删除日志
  public logDeletion(log: Omit<DeletionLog, 'timestamp'>): void {
    const fullLog: DeletionLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };

    this.deletionLogs.push(fullLog);

    // 限制日志数量
    if (this.deletionLogs.length > 500) {
      this.deletionLogs = this.deletionLogs.slice(-500);
    }

    // 保存到localStorage
    this.saveLogsToStorage();

    // 结构化日志输出
    const logLevel = fullLog.status === 'success' ? 'log' : fullLog.status === 'failed' ? 'error' : 'warn';
    console[logLevel](
      `[DeletionLog] ${fullLog.timestamp} | User: ${fullLog.username}(${fullLog.userId}) | ` +
      `Note #${fullLog.noteId} "${fullLog.noteTitle}" | ` +
      `Type: ${fullLog.operationType} | Status: ${fullLog.status}` +
      (fullLog.errorMessage ? ` | Error: ${fullLog.errorMessage}` : '') +
      (fullLog.undoAvailable ? ' | 可撤销' : '')
    );
  }

  // 获取删除日志
  public getLogs(limit?: number): DeletionLog[] {
    if (limit) {
      return this.deletionLogs.slice(-limit);
    }
    return [...this.deletionLogs];
  }

  // 清空日志
  public clearLogs(): void {
    this.deletionLogs = [];
    localStorage.removeItem('deletion_logs');
    console.log('[DeletionManager] 删除日志已清空');
  }

  // 保存日志到localStorage
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('deletion_logs', JSON.stringify(this.deletionLogs));
    } catch (error) {
      console.error('[DeletionManager] 保存日志到localStorage失败:', error);
    }
  }

  // 从localStorage加载日志
  private loadLogsFromStorage(): void {
    try {
      const logsJson = localStorage.getItem('deletion_logs');
      if (logsJson) {
        this.deletionLogs = JSON.parse(logsJson);
        console.log(`[DeletionManager] 从localStorage加载了 ${this.deletionLogs.length} 条删除日志`);
      }
    } catch (error) {
      console.error('[DeletionManager] 从localStorage加载日志失败:', error);
    }
  }

  // 获取统计信息
  public getStats(): {
    totalDeletions: number;
    successfulDeletions: number;
    failedDeletions: number;
    cancelledDeletions: number;
    queueSize: number;
  } {
    return {
      totalDeletions: this.deletionLogs.length,
      successfulDeletions: this.deletionLogs.filter(log => log.status === 'success').length,
      failedDeletions: this.deletionLogs.filter(log => log.status === 'failed').length,
      cancelledDeletions: this.deletionLogs.filter(log => log.status === 'cancelled').length,
      queueSize: this.deletionQueue.size,
    };
  }
}

// 导出单例实例
export const deletionManager = DeletionManager.getInstance();

// 获取当前用户信息的辅助函数
export function getCurrentUserInfo(): { userId: number; username: string } {
  try {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      const user = JSON.parse(userJson);
      return {
        userId: user.id || 0,
        username: user.username || 'Unknown',
      };
    }
  } catch (error) {
    console.error('[DeletionManager] 获取用户信息失败:', error);
  }
  return { userId: 0, username: 'Unknown' };
}

// 显示撤销通知的辅助函数
export function showUndoNotification(
  note: WorkNote,
  onUndo: () => void,
  duration: number = 5
): void {
  notification.success({
    message: '笔记删除成功',
    description: (
      <div>
        <div style={{ marginBottom: 8 }}>
          已删除笔记: <strong>{note.title}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          {duration}秒内可撤销
        </div>
      </div>
    ),
    duration: duration,
    btn: (
      <button
        onClick={() => {
          onUndo();
          notification.destroy();
        }}
        style={{
          padding: '4px 12px',
          background: '#1890ff',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <UndoOutlined /> 撤销删除
      </button>
    ),
    placement: 'bottomRight',
  });
}

// 解析错误消息的辅助函数
export function parseErrorMessage(error: any): {
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
} {
  if (!error) {
    return {
      userMessage: '未知错误',
      technicalMessage: 'Unknown error',
      retryable: false,
    };
  }

  // 网络错误
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return {
      userMessage: '网络连接失败，请检查网络后重试',
      technicalMessage: error.message,
      retryable: true,
    };
  }

  // HTTP状态码错误
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 404:
        return {
          userMessage: '笔记不存在或已被删除',
          technicalMessage: data?.message || 'Not found',
          retryable: false,
        };
      case 403:
        return {
          userMessage: '没有权限删除此笔记',
          technicalMessage: data?.message || 'Forbidden',
          retryable: false,
        };
      case 409:
        return {
          userMessage: '笔记正在被其他操作使用，无法删除',
          technicalMessage: data?.message || 'Conflict',
          retryable: true,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          userMessage: '服务器错误，请稍后重试',
          technicalMessage: data?.message || 'Server error',
          retryable: true,
        };
      default:
        return {
          userMessage: `删除失败 (${status})`,
          technicalMessage: data?.message || error.message,
          retryable: status >= 500,
        };
    }
  }

  // 其他错误
  return {
    userMessage: error.message || '删除失败',
    technicalMessage: error.toString(),
    retryable: false,
  };
}
