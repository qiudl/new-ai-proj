/**
 * 协作编辑相关类型定义
 */

import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

/**
 * Yjs协作文档
 */
export type YDoc = Y.Doc;

/**
 * WebSocket协作提供者
 */
export type YjsProvider = WebsocketProvider;

/**
 * 协作用户信息
 */
export interface CollaborationUser {
  userId: number;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

/**
 * 协作会话信息
 */
export interface CollaborationSession {
  sessionId: string;
  documentId: number;
  fieldName: string;
  userId: number;
  userName: string;
  startedAt: Date;
}

/**
 * WebSocket消息类型
 */
export enum CollaborationMessageType {
  Sync = 'sync',
  Update = 'update',
  Awareness = 'awareness',
  QueryAwareness = 'query-awareness',
}

/**
 * WebSocket消息
 */
export interface CollaborationMessage {
  type: CollaborationMessageType;
  documentId?: number;
  fieldName?: string;
  userId?: number;
  data?: Uint8Array | any;
}

/**
 * 连接状态
 */
export enum ConnectionStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

/**
 * 同步状态
 */
export interface SyncStatus {
  isSynced: boolean;
  lastSyncTime?: Date;
  pendingUpdates: number;
}
