import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import io, { Socket } from 'socket.io-client';

// 协作用户接口
export interface CollaborativeUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    position: number;
    selection?: { start: number; end: number };
  };
  lastActivity: Date;
  status: 'active' | 'idle' | 'offline';
}

// 文档操作类型
export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'cursor';
  position: number;
  content?: string;
  length?: number;
  format?: Record<string, any>;
  userId: string;
  timestamp: Date;
  clientId: string;
}

// 评论接口
export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  position: number;
  range?: { start: number; end: number };
  resolved: boolean;
  replies: DocumentReply[];
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 回复接口
export interface DocumentReply {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  mentions: string[];
  createdAt: Date;
}

// 变更建议接口
export interface DocumentSuggestion {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  type: 'addition' | 'deletion' | 'modification';
  original: string;
  suggested: string;
  position: number;
  range: { start: number; end: number };
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewerId?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

// 冲突解决状态
export interface ConflictResolution {
  conflictId: string;
  operations: DocumentOperation[];
  resolution: 'mine' | 'theirs' | 'merged';
  resolvedBy: string;
  resolvedAt: Date;
}

// Hook配置接口
export interface CollaborativeEditingConfig {
  documentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  socketUrl?: string;
  autoSaveInterval?: number;
  conflictResolutionMode?: 'auto' | 'manual';
  enableComments?: boolean;
  enableSuggestions?: boolean;
  enableRealTimeSync?: boolean;
}

// Hook返回值接口
export interface CollaborativeEditingReturn {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string;
  
  // 协作用户
  collaborators: CollaborativeUser[];
  activeCollaborators: CollaborativeUser[];
  
  // 文档操作
  applyOperation: (operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'clientId'>) => void;
  undoOperation: () => void;
  redoOperation: () => void;
  
  // 评论功能
  comments: DocumentComment[];
  addComment: (content: string, position: number, range?: { start: number; end: number }, mentions?: string[]) => Promise<void>;
  replyToComment: (commentId: string, content: string, mentions?: string[]) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  
  // 变更建议
  suggestions: DocumentSuggestion[];
  addSuggestion: (suggestion: Omit<DocumentSuggestion, 'id' | 'userId' | 'userName' | 'createdAt'>) => Promise<void>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  
  // 冲突处理
  conflicts: ConflictResolution[];
  resolveConflict: (conflictId: string, resolution: ConflictResolution['resolution']) => Promise<void>;
  
  // 版本控制
  createBranch: (branchName: string) => Promise<void>;
  mergeBranch: (sourceBranch: string, targetBranch: string) => Promise<void>;
  switchBranch: (branchName: string) => Promise<void>;
  
  // 权限控制
  hasEditPermission: boolean;
  hasCommentPermission: boolean;
  hasSuggestionPermission: boolean;
  
  // 同步状态
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
  lastSyncTime?: Date;
  
  // 实用工具
  formatSelection: (format: Record<string, any>) => void;
  insertAtCursor: (content: string) => void;
  selectText: (start: number, end: number) => void;
  highlightChanges: boolean;
  toggleHighlightChanges: () => void;
}

// 操作转换算法 (OT - Operational Transformation)
class OperationalTransform {
  static transformOperation(op1: DocumentOperation, op2: DocumentOperation): DocumentOperation {
    if (op1.type === 'insert' && op2.type === 'insert') {
      // 两个插入操作
      if (op1.position <= op2.position) {
        return { ...op2, position: op2.position + (op1.content?.length || 0) };
      }
      return op2;
    }
    
    if (op1.type === 'delete' && op2.type === 'insert') {
      // 删除和插入操作
      if (op1.position < op2.position) {
        return { ...op2, position: op2.position - (op1.length || 0) };
      }
      return op2;
    }
    
    if (op1.type === 'insert' && op2.type === 'delete') {
      // 插入和删除操作
      if (op1.position <= op2.position) {
        return { ...op2, position: op2.position + (op1.content?.length || 0) };
      }
      return op2;
    }
    
    if (op1.type === 'delete' && op2.type === 'delete') {
      // 两个删除操作
      if (op1.position < op2.position) {
        return { ...op2, position: op2.position - (op1.length || 0) };
      } else if (op1.position > op2.position + (op2.length || 0)) {
        return op2;
      } else {
        // 重叠删除，需要调整
        const newLength = Math.max(0, (op2.length || 0) - Math.max(0, op1.position - op2.position + (op1.length || 0)));
        return { ...op2, length: newLength };
      }
    }
    
    return op2;
  }
  
  static applyOperation(content: string, operation: DocumentOperation): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position);
      
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + (operation.length || 0));
      
      default:
        return content;
    }
  }
}

// 协作编辑Hook
export const useCollaborativeEditing = (config: CollaborativeEditingConfig): CollaborativeEditingReturn => {
  // 状态管理
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [collaborators, setCollaborators] = useState<CollaborativeUser[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'conflict' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [highlightChanges, setHighlightChanges] = useState(true);
  
  // 权限状态
  const [hasEditPermission, setHasEditPermission] = useState(true);
  const [hasCommentPermission, setHasCommentPermission] = useState(true);
  const [hasSuggestionPermission, setHasSuggestionPermission] = useState(true);
  
  // 操作历史
  const operationHistory = useRef<DocumentOperation[]>([]);
  const undoStack = useRef<DocumentOperation[]>([]);
  const redoStack = useRef<DocumentOperation[]>([]);
  
  // Socket连接
  const socket = useRef<Socket | null>(null);
  const clientId = useRef<string>(`client_${Date.now()}_${Math.random()}`);
  
  // 初始化Socket连接
  useEffect(() => {
    const socketUrl = config.socketUrl || 'ws://localhost:8082';
    setIsConnecting(true);
    
    socket.current = io(socketUrl, {
      query: {
        documentId: config.documentId,
        userId: config.userId,
        userName: config.userName,
        clientId: clientId.current
      }
    });
    
    // 连接事件
    socket.current.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(undefined);
      message.success('已连接到协作服务器');
    });
    
    socket.current.on('disconnect', () => {
      setIsConnected(false);
      message.warning('与协作服务器连接断开');
    });
    
    socket.current.on('connect_error', (error) => {
      setIsConnecting(false);
      setConnectionError(error.message);
      message.error('连接协作服务器失败');
    });
    
    // 协作用户事件
    socket.current.on('collaborators_updated', (users: CollaborativeUser[]) => {
      setCollaborators(users);
    });
    
    socket.current.on('user_joined', (user: CollaborativeUser) => {
      setCollaborators(prev => [...prev.filter(u => u.id !== user.id), user]);
      message.info(`${user.name} 加入了协作`);
    });
    
    socket.current.on('user_left', (userId: string) => {
      setCollaborators(prev => prev.filter(u => u.id !== userId));
    });
    
    // 文档操作事件
    socket.current.on('operation_applied', (operation: DocumentOperation) => {
      if (operation.clientId !== clientId.current) {
        operationHistory.current.push(operation);
        // 这里应该触发文档内容更新
        setSyncStatus('syncing');
        setTimeout(() => setSyncStatus('synced'), 500);
        setLastSyncTime(new Date());
      }
    });
    
    socket.current.on('operation_conflict', (conflictData: ConflictResolution) => {
      setConflicts(prev => [...prev, conflictData]);
      setSyncStatus('conflict');
      message.warning('检测到操作冲突，请解决冲突');
    });
    
    // 评论事件
    socket.current.on('comment_added', (comment: DocumentComment) => {
      setComments(prev => [...prev, comment]);
    });
    
    socket.current.on('comment_updated', (comment: DocumentComment) => {
      setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
    });
    
    socket.current.on('comment_deleted', (commentId: string) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    });
    
    // 建议事件
    socket.current.on('suggestion_added', (suggestion: DocumentSuggestion) => {
      setSuggestions(prev => [...prev, suggestion]);
    });
    
    socket.current.on('suggestion_updated', (suggestion: DocumentSuggestion) => {
      setSuggestions(prev => prev.map(s => s.id === suggestion.id ? suggestion : s));
    });
    
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [config.documentId, config.userId]);
  
  // 应用操作
  const applyOperation = useCallback((operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'clientId'>) => {
    if (!hasEditPermission) {
      message.warning('您没有编辑权限');
      return;
    }
    
    const fullOperation: DocumentOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      clientId: clientId.current
    };
    
    // 应用操作转换
    const transformedOps = operationHistory.current.map(op => 
      OperationalTransform.transformOperation(fullOperation, op)
    );
    
    operationHistory.current.push(fullOperation);
    undoStack.current.push(fullOperation);
    redoStack.current = []; // 清空重做栈
    
    // 发送到服务器
    if (socket.current) {
      socket.current.emit('apply_operation', fullOperation);
    }
    
    setSyncStatus('syncing');
  }, [hasEditPermission]);
  
  // 撤销操作
  const undoOperation = useCallback(() => {
    const lastOp = undoStack.current.pop();
    if (lastOp) {
      redoStack.current.push(lastOp);
      
      // 创建逆向操作
      let reverseOp: DocumentOperation;
      if (lastOp.type === 'insert') {
        reverseOp = {
          ...lastOp,
          id: `undo_${Date.now()}`,
          type: 'delete',
          length: lastOp.content?.length || 0,
          content: undefined
        };
      } else if (lastOp.type === 'delete') {
        reverseOp = {
          ...lastOp,
          id: `undo_${Date.now()}`,
          type: 'insert',
          content: lastOp.content || '',
          length: undefined
        };
      } else {
        return;
      }
      
      applyOperation(reverseOp);
    }
  }, [applyOperation]);
  
  // 重做操作
  const redoOperation = useCallback(() => {
    const nextOp = redoStack.current.pop();
    if (nextOp) {
      undoStack.current.push(nextOp);
      applyOperation(nextOp);
    }
  }, [applyOperation]);
  
  // 添加评论
  const addComment = useCallback(async (
    content: string, 
    position: number, 
    range?: { start: number; end: number },
    mentions?: string[]
  ) => {
    if (!hasCommentPermission) {
      message.warning('您没有评论权限');
      return;
    }
    
    const comment: Omit<DocumentComment, 'id' | 'createdAt' | 'updatedAt'> = {
      documentId: config.documentId,
      userId: config.userId,
      userName: config.userName,
      userAvatar: config.userAvatar,
      content,
      position,
      range,
      resolved: false,
      replies: [],
      mentions: mentions || []
    };
    
    if (socket.current) {
      socket.current.emit('add_comment', comment);
    }
  }, [config, hasCommentPermission]);
  
  // 回复评论
  const replyToComment = useCallback(async (commentId: string, content: string, mentions?: string[]) => {
    const reply: Omit<DocumentReply, 'id' | 'createdAt'> = {
      commentId,
      userId: config.userId,
      userName: config.userName,
      userAvatar: config.userAvatar,
      content,
      mentions: mentions || []
    };
    
    if (socket.current) {
      socket.current.emit('reply_to_comment', reply);
    }
  }, [config]);
  
  // 解决评论
  const resolveComment = useCallback(async (commentId: string) => {
    if (socket.current) {
      socket.current.emit('resolve_comment', { commentId, userId: config.userId });
    }
  }, [config.userId]);
  
  // 删除评论
  const deleteComment = useCallback(async (commentId: string) => {
    if (socket.current) {
      socket.current.emit('delete_comment', { commentId, userId: config.userId });
    }
  }, [config.userId]);
  
  // 添加建议
  const addSuggestion = useCallback(async (suggestion: Omit<DocumentSuggestion, 'id' | 'userId' | 'userName' | 'createdAt'>) => {
    if (!hasSuggestionPermission) {
      message.warning('您没有建议权限');
      return;
    }
    
    const fullSuggestion = {
      ...suggestion,
      userId: config.userId,
      userName: config.userName
    };
    
    if (socket.current) {
      socket.current.emit('add_suggestion', fullSuggestion);
    }
  }, [config, hasSuggestionPermission]);
  
  // 接受建议
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    if (socket.current) {
      socket.current.emit('accept_suggestion', { suggestionId, reviewerId: config.userId });
    }
  }, [config.userId]);
  
  // 拒绝建议
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    if (socket.current) {
      socket.current.emit('reject_suggestion', { suggestionId, reviewerId: config.userId });
    }
  }, [config.userId]);
  
  // 解决冲突
  const resolveConflict = useCallback(async (conflictId: string, resolution: ConflictResolution['resolution']) => {
    if (socket.current) {
      socket.current.emit('resolve_conflict', { conflictId, resolution, resolvedBy: config.userId });
    }
    
    setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
    setSyncStatus('synced');
  }, [config.userId]);
  
  // 版本控制功能
  const createBranch = useCallback(async (branchName: string) => {
    if (socket.current) {
      socket.current.emit('create_branch', { branchName, userId: config.userId });
    }
  }, [config.userId]);
  
  const mergeBranch = useCallback(async (sourceBranch: string, targetBranch: string) => {
    if (socket.current) {
      socket.current.emit('merge_branch', { sourceBranch, targetBranch, userId: config.userId });
    }
  }, [config.userId]);
  
  const switchBranch = useCallback(async (branchName: string) => {
    if (socket.current) {
      socket.current.emit('switch_branch', { branchName, userId: config.userId });
    }
  }, []);
  
  // 实用工具函数
  const formatSelection = useCallback((format: Record<string, any>) => {
    applyOperation({
      type: 'format',
      position: 0, // 应该从选择开始
      format,
      userId: config.userId
    });
  }, [applyOperation, config.userId]);
  
  const insertAtCursor = useCallback((content: string) => {
    applyOperation({
      type: 'insert',
      position: 0, // 应该是当前光标位置
      content,
      userId: config.userId
    });
  }, [applyOperation, config.userId]);
  
  const selectText = useCallback((start: number, end: number) => {
    applyOperation({
      type: 'cursor',
      position: start,
      length: end - start,
      userId: config.userId
    });
  }, [applyOperation, config.userId]);
  
  const toggleHighlightChanges = useCallback(() => {
    setHighlightChanges(prev => !prev);
  }, []);
  
  // 计算活跃协作者
  const activeCollaborators = collaborators.filter(user => user.status === 'active');
  
  return {
    // 连接状态
    isConnected,
    isConnecting,
    connectionError,
    
    // 协作用户
    collaborators,
    activeCollaborators,
    
    // 文档操作
    applyOperation,
    undoOperation,
    redoOperation,
    
    // 评论功能
    comments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    
    // 变更建议
    suggestions,
    addSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    
    // 冲突处理
    conflicts,
    resolveConflict,
    
    // 版本控制
    createBranch,
    mergeBranch,
    switchBranch,
    
    // 权限控制
    hasEditPermission,
    hasCommentPermission,
    hasSuggestionPermission,
    
    // 同步状态
    syncStatus,
    lastSyncTime,
    
    // 实用工具
    formatSelection,
    insertAtCursor,
    selectText,
    highlightChanges,
    toggleHighlightChanges
  };
};

export default useCollaborativeEditing;