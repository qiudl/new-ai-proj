import React, { useEffect } from 'react';
import { message } from 'antd';
import MemoryManager from '../utils/memoryManager';

// 内存调试快捷键Hook
const useMemoryDebugShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + M: 打开内存调试页面
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        window.open('/debug/memory', '_blank');
        message.info('内存调试页面已打开');
      }
      
      // Ctrl/Cmd + Shift + C: 强制清理内存
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        MemoryManager.performManualCleanup();
        message.success('内存清理完成');
      }
      
      // Ctrl/Cmd + Shift + I: 显示内存信息
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        const memoryInfo = MemoryManager.getMemoryUsageString();
        const isCritical = MemoryManager.isMemoryUsageCritical();
        
        message.info(
          <div>
            <div>内存使用情况:</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {memoryInfo}
            </div>
            {isCritical && <div style={{ color: '#ff4d4f' }}>⚠️ 内存使用过高！</div>}
          </div>
        );
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
};

export default useMemoryDebugShortcuts;
