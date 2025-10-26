// 工作笔记相关的localStorage管理工具

// 工作笔记相关的localStorage键
const STORAGE_KEYS = {
  FOLDER_COLLAPSED: 'workNotes_folderTreeCollapsed',
  LAST_FILTERS: 'workNotes_lastFilters',
  VIEW_PREFERENCE: 'workNotes_viewPreference',
  COLUMN_WIDTHS: 'workNotes_columnWidths'
} as const;

export interface SavedFilters {
  statusFilter?: string;
  categoryFilter?: string | null;
  tagFilter?: string[];
  timeRangeFilter?: string | null;
  quickFilter?: string | null;
}

export interface ViewPreference {
  pageSize: number;
  sortField: string;
  sortOrder: 'ascend' | 'descend';
}

class WorkNotesStorage {
  // 保存折叠状态
  saveFolderCollapsed(collapsed: boolean): void {
    localStorage.setItem(STORAGE_KEYS.FOLDER_COLLAPSED, String(collapsed));
  }

  // 读取折叠状态
  getFolderCollapsed(defaultValue: boolean = false): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.FOLDER_COLLAPSED);
    return saved !== null ? saved === 'true' : defaultValue;
  }

  // 保存筛选条件
  saveFilters(filters: SavedFilters): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_FILTERS, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }

  // 读取筛选条件
  getFilters(): SavedFilters | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_FILTERS);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load filters:', error);
      return null;
    }
  }

  // 保存视图偏好
  saveViewPreference(preference: ViewPreference): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_PREFERENCE, JSON.stringify(preference));
    } catch (error) {
      console.warn('Failed to save view preference:', error);
    }
  }

  // 读取视图偏好
  getViewPreference(): ViewPreference | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_PREFERENCE);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load view preference:', error);
      return null;
    }
  }

  // 清除所有缓存
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const workNotesStorage = new WorkNotesStorage();
