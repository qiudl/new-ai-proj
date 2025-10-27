/**
 * 工作笔记权限检查 React Hook
 *
 * 提供便捷的React Hook API用于在组件中检查工作笔记权限
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserInfo,
  WorkNoteInfo,
  FolderInfo,
  WorkNotePermissionChecker,
  getCurrentUser
} from '../utils/workNotePermissions';

/**
 * Hook选项
 */
export interface UseWorkNotePermissionsOptions {
  user?: UserInfo;
  autoLoad?: boolean;
}

/**
 * 笔记权限状态
 */
export interface NotePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canComment: boolean;
  isCreator: boolean;
}

/**
 * 目录权限状态
 */
export interface FolderPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canMove: boolean;
  isCreator: boolean;
}

/**
 * 工作笔记权限Hook
 */
export function useWorkNotePermissions(options: UseWorkNotePermissionsOptions = {}) {
  const { user: providedUser, autoLoad = true } = options;

  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 创建权限检查器实例
  const permissionChecker = useMemo(() => {
    const user = providedUser || currentUser;
    return new WorkNotePermissionChecker(user || undefined);
  }, [providedUser, currentUser]);

  // 加载当前用户信息
  const loadCurrentUser = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const user = getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户信息失败');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 自动加载用户信息
  useEffect(() => {
    if (autoLoad && !providedUser) {
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, [autoLoad, providedUser, loadCurrentUser]);

  // 检查是否为系统管理员
  const isSystemAdmin = useCallback(() => {
    return permissionChecker.isSystemAdmin();
  }, [permissionChecker]);

  // 检查笔记权限
  const checkNotePermissions = useCallback((note: WorkNoteInfo): NotePermissions => {
    return permissionChecker.getNotePermissions(note);
  }, [permissionChecker]);

  // 检查目录权限
  const checkFolderPermissions = useCallback((folder: FolderInfo): FolderPermissions => {
    return permissionChecker.getFolderPermissions(folder);
  }, [permissionChecker]);

  // 检查是否可以查看笔记
  const canViewNote = useCallback((note: WorkNoteInfo): boolean => {
    return permissionChecker.canViewNote(note);
  }, [permissionChecker]);

  // 检查是否可以创建笔记
  const canCreateNote = useCallback((visibility: 'private' | 'team' | 'public'): boolean => {
    return permissionChecker.canCreateNote(visibility);
  }, [permissionChecker]);

  // 检查是否可以编辑笔记
  const canEditNote = useCallback((note: WorkNoteInfo): boolean => {
    return permissionChecker.canEditNote(note);
  }, [permissionChecker]);

  // 检查是否可以删除笔记
  const canDeleteNote = useCallback((note: WorkNoteInfo): boolean => {
    return permissionChecker.canDeleteNote(note);
  }, [permissionChecker]);

  // 检查是否可以发布笔记
  const canPublishNote = useCallback((note: WorkNoteInfo): boolean => {
    return permissionChecker.canPublishNote(note);
  }, [permissionChecker]);

  // 检查是否可以评论笔记
  const canCommentNote = useCallback((note: WorkNoteInfo): boolean => {
    return permissionChecker.canCommentNote(note);
  }, [permissionChecker]);

  // 检查是否可以创建目录
  const canCreateFolder = useCallback((treeType: 'private' | 'team' | 'public'): boolean => {
    return permissionChecker.canCreateFolder(treeType);
  }, [permissionChecker]);

  // 检查是否可以编辑目录
  const canEditFolder = useCallback((folder: FolderInfo): boolean => {
    return permissionChecker.canEditFolder(folder);
  }, [permissionChecker]);

  // 检查是否可以删除目录
  const canDeleteFolder = useCallback((folder: FolderInfo): boolean => {
    return permissionChecker.canDeleteFolder(folder);
  }, [permissionChecker]);

  // 检查是否可以移动目录
  const canMoveFolder = useCallback((folder: FolderInfo): boolean => {
    return permissionChecker.canMoveFolder(folder);
  }, [permissionChecker]);

  // 清除权限缓存
  const clearCache = useCallback(() => {
    permissionChecker.clearCache();
  }, [permissionChecker]);

  // 刷新用户信息
  const refreshUser = useCallback(() => {
    loadCurrentUser();
    clearCache();
  }, [loadCurrentUser, clearCache]);

  return {
    // 状态
    currentUser: providedUser || currentUser,
    loading,
    error,
    isSystemAdmin: isSystemAdmin(),

    // 笔记权限检查方法
    canViewNote,
    canCreateNote,
    canEditNote,
    canDeleteNote,
    canPublishNote,
    canCommentNote,
    checkNotePermissions,

    // 目录权限检查方法
    canCreateFolder,
    canEditFolder,
    canDeleteFolder,
    canMoveFolder,
    checkFolderPermissions,

    // 工具方法
    clearCache,
    refreshUser,
    loadCurrentUser
  };
}

/**
 * 便捷Hook: 检查特定笔记的权限
 */
export function useNotePermissions(note: WorkNoteInfo | null, options: UseWorkNotePermissionsOptions = {}) {
  const {
    checkNotePermissions,
    loading,
    error,
    currentUser
  } = useWorkNotePermissions(options);

  const permissions = useMemo(() => {
    if (!note) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canComment: false,
        isCreator: false
      };
    }
    return checkNotePermissions(note);
  }, [note, checkNotePermissions]);

  return {
    ...permissions,
    loading,
    error,
    currentUser
  };
}

/**
 * 便捷Hook: 检查特定目录的权限
 */
export function useFolderPermissions(folder: FolderInfo | null, options: UseWorkNotePermissionsOptions = {}) {
  const {
    checkFolderPermissions,
    loading,
    error,
    currentUser
  } = useWorkNotePermissions(options);

  const permissions = useMemo(() => {
    if (!folder) {
      return {
        canEdit: false,
        canDelete: false,
        canMove: false,
        isCreator: false
      };
    }
    return checkFolderPermissions(folder);
  }, [folder, checkFolderPermissions]);

  return {
    ...permissions,
    loading,
    error,
    currentUser
  };
}

export default useWorkNotePermissions;
