import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { TaskDashboardFilters } from './useUrlState';

export interface FilterBookmark {
  name: string;
  filters: TaskDashboardFilters;
  createdAt: string;
  updatedAt: string;
  usage: number; // 使用次数
}

export interface FilterPersistenceOptions {
  storageKey?: string;
  maxBookmarks?: number;
  autoSave?: boolean;
  syncAcrossWindows?: boolean;
}

const DEFAULT_OPTIONS: Required<FilterPersistenceOptions> = {
  storageKey: 'taskDashboardBookmarks',
  maxBookmarks: 10,
  autoSave: true,
  syncAcrossWindows: true,
};

// 筛选条件持久化管理hook
export const useFilterPersistence = (
  currentFilters: TaskDashboardFilters,
  options: FilterPersistenceOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [bookmarks, setBookmarks] = useState<FilterBookmark[]>([]);
  const [lastUsedFilters, setLastUsedFilters] = useState<TaskDashboardFilters | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载书签
  const loadBookmarks = useCallback(() => {
    try {
      const stored = localStorage.getItem(config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as FilterBookmark[];
        // 按使用次数和更新时间排序
        const sorted = parsed.sort((a, b) => {
          if (a.usage !== b.usage) {
            return b.usage - a.usage; // 使用次数多的在前
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setBookmarks(sorted);
      }
    } catch (error) {
      console.error('Failed to load filter bookmarks:', error);
      message.error('加载筛选书签失败');
    } finally {
      setIsLoading(false);
    }
  }, [config.storageKey]);

  // 保存书签到localStorage
  const saveBookmarks = useCallback((newBookmarks: FilterBookmark[]) => {
    try {
      // 限制书签数量
      const trimmed = newBookmarks.slice(0, config.maxBookmarks);
      localStorage.setItem(config.storageKey, JSON.stringify(trimmed));
      setBookmarks(trimmed);
    } catch (error) {
      console.error('Failed to save filter bookmarks:', error);
      message.error('保存筛选书签失败');
    }
  }, [config.storageKey, config.maxBookmarks]);

  // 加载最后使用的筛选条件
  const loadLastUsedFilters = useCallback(() => {
    try {
      const stored = localStorage.getItem(`${config.storageKey}_lastUsed`);
      if (stored) {
        const parsed = JSON.parse(stored) as TaskDashboardFilters;
        setLastUsedFilters(parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load last used filters:', error);
    }
    return null;
  }, [config.storageKey]);

  // 保存最后使用的筛选条件
  const saveLastUsedFilters = useCallback((filters: TaskDashboardFilters) => {
    try {
      localStorage.setItem(`${config.storageKey}_lastUsed`, JSON.stringify(filters));
      setLastUsedFilters(filters);
    } catch (error) {
      console.warn('Failed to save last used filters:', error);
    }
  }, [config.storageKey]);

  // 创建新书签
  const saveBookmark = useCallback((name: string, filters: TaskDashboardFilters) => {
    const now = new Date().toISOString();
    const existingIndex = bookmarks.findIndex(b => b.name === name);
    
    let newBookmarks: FilterBookmark[];
    
    if (existingIndex >= 0) {
      // 更新existing bookmark
      newBookmarks = [...bookmarks];
      newBookmarks[existingIndex] = {
        ...newBookmarks[existingIndex],
        filters,
        updatedAt: now,
        usage: newBookmarks[existingIndex].usage + 1,
      };
      message.success('书签已更新');
    } else {
      // 创建新书签
      const newBookmark: FilterBookmark = {
        name,
        filters,
        createdAt: now,
        updatedAt: now,
        usage: 1,
      };
      newBookmarks = [newBookmark, ...bookmarks];
      message.success('书签已保存');
    }
    
    saveBookmarks(newBookmarks);
  }, [bookmarks, saveBookmarks]);

  // 加载书签
  const loadBookmark = useCallback((bookmark: FilterBookmark) => {
    // 增加使用次数
    const updatedBookmarks = bookmarks.map(b => 
      b.name === bookmark.name 
        ? { ...b, usage: b.usage + 1, updatedAt: new Date().toISOString() }
        : b
    );
    saveBookmarks(updatedBookmarks);
    
    return bookmark.filters;
  }, [bookmarks, saveBookmarks]);

  // 删除书签
  const deleteBookmark = useCallback((name: string) => {
    const filtered = bookmarks.filter(b => b.name !== name);
    saveBookmarks(filtered);
  }, [bookmarks, saveBookmarks]);

  // 重命名书签
  const renameBookmark = useCallback((oldName: string, newName: string) => {
    if (bookmarks.some(b => b.name === newName)) {
      message.error('书签名称已存在');
      return false;
    }
    
    const updated = bookmarks.map(b => 
      b.name === oldName 
        ? { ...b, name: newName, updatedAt: new Date().toISOString() }
        : b
    );
    saveBookmarks(updated);
    message.success('书签已重命名');
    return true;
  }, [bookmarks, saveBookmarks]);

  // 导出书签
  const exportBookmarks = useCallback(() => {
    try {
      const data = {
        bookmarks,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-dashboard-bookmarks-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('书签已导出');
    } catch (error) {
      console.error('Failed to export bookmarks:', error);
      message.error('导出书签失败');
    }
  }, [bookmarks]);

  // 导入书签
  const importBookmarks = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const importedBookmarks = data.bookmarks as FilterBookmark[];
          // 合并书签，避免重复
          const merged = [...bookmarks];
          
          importedBookmarks.forEach(imported => {
            const existingIndex = merged.findIndex(b => b.name === imported.name);
            if (existingIndex >= 0) {
              // 保留使用次数更高的版本
              if (imported.usage > merged[existingIndex].usage) {
                merged[existingIndex] = imported;
              }
            } else {
              merged.push(imported);
            }
          });
          
          saveBookmarks(merged);
          message.success(`成功导入 ${importedBookmarks.length} 个书签`);
        } else {
          message.error('无效的书签文件格式');
        }
      } catch (error) {
        console.error('Failed to import bookmarks:', error);
        message.error('导入书签失败');
      }
    };
    reader.readAsText(file);
  }, [bookmarks, saveBookmarks]);

  // 获取智能推荐书签
  const getRecommendedBookmarks = useCallback(() => {
    return bookmarks
      .filter(b => b.usage > 1) // 使用过多次的
      .slice(0, 3) // 最多3个
      .map(b => ({
        ...b,
        score: b.usage * 0.7 + (Date.now() - new Date(b.updatedAt).getTime()) / (1000 * 60 * 60 * 24) * 0.3,
      }))
      .sort((a, b) => b.score - a.score);
  }, [bookmarks]);

  // 清理过期或少用的书签
  const cleanupBookmarks = useCallback(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cleaned = bookmarks.filter(b => 
      b.usage > 0 && new Date(b.updatedAt) > thirtyDaysAgo
    );
    
    if (cleaned.length < bookmarks.length) {
      saveBookmarks(cleaned);
      message.info(`已清理 ${bookmarks.length - cleaned.length} 个无用书签`);
    }
  }, [bookmarks, saveBookmarks]);

  // 获取书签统计
  const getBookmarkStats = useCallback(() => {
    const totalUsage = bookmarks.reduce((sum, b) => sum + b.usage, 0);
    const avgUsage = totalUsage / Math.max(bookmarks.length, 1);
    const mostUsed = bookmarks.reduce((max, b) => b.usage > max.usage ? b : max, bookmarks[0]);
    const recentlyUsed = bookmarks
      .filter(b => new Date(b.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;

    return {
      total: bookmarks.length,
      totalUsage,
      avgUsage: Math.round(avgUsage * 10) / 10,
      mostUsed,
      recentlyUsed,
    };
  }, [bookmarks]);

  // 跨窗口同步
  useEffect(() => {
    if (!config.syncAcrossWindows) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === config.storageKey && e.newValue) {
        try {
          const newBookmarks = JSON.parse(e.newValue) as FilterBookmark[];
          setBookmarks(newBookmarks);
        } catch (error) {
          console.warn('Failed to sync bookmarks across windows:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [config.syncAcrossWindows, config.storageKey]);

  // 自动保存当前筛选条件
  useEffect(() => {
    if (config.autoSave && !isLoading) {
      const timer = setTimeout(() => {
        saveLastUsedFilters(currentFilters);
      }, 1000); // 延迟1秒保存，避免频繁保存

      return () => clearTimeout(timer);
    }
  }, [currentFilters, config.autoSave, isLoading, saveLastUsedFilters]);

  // 初始化
  useEffect(() => {
    loadBookmarks();
    loadLastUsedFilters();
  }, [loadBookmarks, loadLastUsedFilters]);

  return {
    // 状态
    bookmarks,
    lastUsedFilters,
    isLoading,
    
    // 书签操作
    saveBookmark,
    loadBookmark,
    deleteBookmark,
    renameBookmark,
    
    // 导入导出
    exportBookmarks,
    importBookmarks,
    
    // 智能功能
    getRecommendedBookmarks,
    cleanupBookmarks,
    getBookmarkStats,
    
    // 实用工具
    reload: loadBookmarks,
  };
};