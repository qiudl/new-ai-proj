/**
 * 自动保存 Hook
 * Auto-save Hook for form data
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { message } from 'antd';

export interface AutoSaveOptions {
  /** 存储键名 */
  key: string;
  /** 要保存的数据 */
  data: any;
  /** 自动保存间隔（毫秒），默认30秒 */
  interval?: number;
  /** 防抖延迟（毫秒），默认2秒 */
  debounceDelay?: number;
  /** 是否启用自动保存，默认true */
  enabled?: boolean;
  /** 保存成功回调 */
  onSave?: () => void;
  /** 保存失败回调 */
  onError?: (error: Error) => void;
}

export interface AutoSaveStatus {
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后保存时间 */
  lastSaved: Date | null;
  /** 是否有草稿 */
  hasDraft: boolean;
}

/**
 * 使用自动保存功能
 */
export const useAutoSave = (options: AutoSaveOptions) => {
  const {
    key,
    data,
    interval = 30000, // 30秒
    debounceDelay = 2000, // 2秒
    enabled = true,
    onSave,
    onError,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>({
    isSaving: false,
    lastSaved: null,
    hasDraft: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const intervalTimerRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<string>('');

  /**
   * 保存到本地存储
   */
  const saveDraft = useCallback(() => {
    try {
      setStatus((prev) => ({ ...prev, isSaving: true }));

      const draftData = {
        data,
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorage.setItem(key, JSON.stringify(draftData));

      const now = new Date();
      setStatus({
        isSaving: false,
        lastSaved: now,
        hasDraft: true,
      });

      onSave?.();
    } catch (error) {
      console.error('Auto-save error:', error);
      setStatus((prev) => ({ ...prev, isSaving: false }));
      onError?.(error as Error);
    }
  }, [key, data, onSave, onError]);

  /**
   * 防抖保存
   */
  const debouncedSave = useCallback(() => {
    if (!enabled) return;

    // 清除之前的防抖计时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的防抖计时器
    debounceTimerRef.current = setTimeout(() => {
      const currentData = JSON.stringify(data);
      // 只有数据变化时才保存
      if (currentData !== lastDataRef.current) {
        lastDataRef.current = currentData;
        saveDraft();
      }
    }, debounceDelay);
  }, [enabled, data, debounceDelay, saveDraft]);

  /**
   * 手动保存
   */
  const manualSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    saveDraft();
    message.success('草稿已保存');
  }, [saveDraft]);

  /**
   * 加载草稿
   */
  const loadDraft = useCallback(() => {
    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setStatus((prev) => ({
          ...prev,
          hasDraft: true,
          lastSaved: new Date(parsed.timestamp),
        }));
        return parsed.data;
      }
    } catch (error) {
      console.error('Load draft error:', error);
    }
    return null;
  }, [key]);

  /**
   * 清除草稿
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStatus({
        isSaving: false,
        lastSaved: null,
        hasDraft: false,
      });
    } catch (error) {
      console.error('Clear draft error:', error);
    }
  }, [key]);

  /**
   * 检查是否有草稿
   */
  const checkDraft = useCallback(() => {
    const savedData = localStorage.getItem(key);
    return !!savedData;
  }, [key]);

  // 数据变化时触发防抖保存
  useEffect(() => {
    if (enabled && data) {
      debouncedSave();
    }
  }, [data, enabled, debouncedSave]);

  // 定期自动保存
  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      const currentData = JSON.stringify(data);
      if (currentData !== lastDataRef.current && currentData !== '{}') {
        lastDataRef.current = currentData;
        saveDraft();
      }
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, interval, data, saveDraft]);

  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    manualSave,
    loadDraft,
    clearDraft,
    checkDraft,
  };
};

export default useAutoSave;
