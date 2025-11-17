/**
 * useCollaboration - 协作编辑Hook
 * 管理Yjs文档和WebSocket连接
 */

import { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CollaborationUser } from '../components/CollaborativeEditor/ActiveUsersPanel';

export interface UseCollaborationOptions {
  documentId: number;
  fieldName: string;
  enabled?: boolean;
  currentUser?: {
    id: number;
    username: string;
  };
}

export interface UseCollaborationReturn {
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  activeUsers: CollaborationUser[];
  isConnected: boolean;
  isSynced: boolean;
  error: Error | null;
}

// 生成随机用户颜色
const generateUserColor = (userId: number): string => {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  ];
  return colors[userId % colors.length];
};

export function useCollaboration({
  documentId,
  fieldName,
  enabled = true,
  currentUser,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !currentUser) {
      return;
    }

    let mounted = true;

    try {
      // 创建Yjs文档
      const doc = new Y.Doc();

      // 构建WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const apiUrl = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.host}`;
      const host = new URL(apiUrl).host;

      // 构建完整的WebSocket URL，包含所有查询参数
      const token = localStorage.getItem('token') || '';
      const queryParams = new URLSearchParams({
        room: fieldName,
        userId: currentUser.id.toString(),
        userName: currentUser.username || 'Anonymous',
        token: token,
      });
      const wsUrl = `${protocol}//${host}/ws/collaboration/${documentId}?${queryParams.toString()}`;

      // 创建WebSocket Provider
      // 注意：不使用room参数，因为我们已经在URL中包含了
      const wsProvider = new WebsocketProvider(
        wsUrl,
        '', // 空字符串，因为room已在URL查询参数中
        doc,
        {
          connect: true,
        }
      );

      // 监听连接状态
      wsProvider.on('status', (event: { status: string }) => {
        if (mounted) {
          setIsConnected(event.status === 'connected');
          if (event.status === 'disconnected') {
            setError(new Error('WebSocket disconnected'));
          }
        }
      });

      // 监听同步状态
      wsProvider.on('sync', (isSynced: boolean) => {
        if (mounted) {
          setIsSynced(isSynced);
        }
      });

      // 监听连接错误
      wsProvider.on('connection-error', (event: any) => {
        if (mounted) {
          setError(new Error(`Connection error: ${event.message || 'Unknown error'}`));
        }
      });

      // 设置本地用户awareness信息
      wsProvider.awareness.setLocalStateField('user', {
        userId: currentUser.id,
        userName: currentUser.username || 'Anonymous',
        color: generateUserColor(currentUser.id),
      });

      // 监听其他用户的awareness变化
      wsProvider.awareness.on('change', () => {
        if (mounted) {
          const states = wsProvider.awareness.getStates();
          const users: CollaborationUser[] = [];

          states.forEach((state, clientId) => {
            // 排除本地用户
            if (clientId !== wsProvider.awareness.clientID) {
              const user = state.user;
              if (user) {
                users.push({
                  userId: user.userId || 0,
                  userName: user.userName || 'Unknown',
                  userColor: user.color || '#1890ff',
                  cursor: state.cursor,
                  selection: state.selection,
                });
              }
            }
          });

          setActiveUsers(users);
        }
      });

      setYDoc(doc);
      setProvider(wsProvider);
    } catch (err) {
      console.error('Failed to initialize collaboration:', err);
      if (mounted) {
        setError(err instanceof Error ? err : new Error('Failed to initialize collaboration'));
      }
    }

    return () => {
      mounted = false;
      if (provider) {
        provider.destroy();
      }
    };
  }, [documentId, fieldName, enabled, currentUser]);

  return {
    yDoc,
    provider,
    activeUsers,
    isConnected,
    isSynced,
    error,
  };
}
