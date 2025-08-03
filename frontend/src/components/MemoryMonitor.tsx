import React, { useState, useEffect, useRef } from 'react';
import { Card, Alert, Button, Typography, Space, Statistic, Progress } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { globalCache } from '../hooks/useCache';

const { Text } = Typography;

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  cacheSize: number;
  cacheMemoryMB: number;
  timestamp: Date;
}

interface MemoryMonitorProps {
  warningThresholdMB?: number;
  criticalThresholdMB?: number;
  onMemoryWarning?: (stats: MemoryStats) => void;
}

const MemoryMonitor: React.FC<MemoryMonitorProps> = ({
  warningThresholdMB = 80,
  criticalThresholdMB = 120,
  onMemoryWarning
}) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const getMemoryStats = (): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as unknown).memory;
      const cacheStats = globalCache.getStats();
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        cacheSize: cacheStats.size,
        cacheMemoryMB: cacheStats.memoryUsageMB,
        timestamp: new Date()
      };
    }
    return null;
  };

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getMemoryStatus = (usedMB: number) => {
    if (usedMB >= criticalThresholdMB) {
      return { type: 'error' as const, text: '危险', color: '#ff4d4f' };
    } else if (usedMB >= warningThresholdMB) {
      return { type: 'warning' as const, text: '警告', color: '#faad14' };
    } else {
      return { type: 'success' as const, text: '正常', color: '#52c41a' };
    }
  };

  const triggerCleanup = () => {
    try {
      // Clear cache
      globalCache.clear();
      
      // Clear localStorage of expired data
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('cache_') || key.startsWith('timer_'))) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp && (now - data.timestamp > 24 * 60 * 60 * 1000)) {
              keysToRemove.push(key);
            }
          } catch (error) {
            keysToRemove.push(key); // Remove corrupted data
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as unknown).gc();
      }
      
      } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  };

  const startMonitoring = () => {
    if (monitorIntervalRef.current) return;
    
    monitorIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const stats = getMemoryStats();
      if (stats) {
        setMemoryStats(stats);
        
        const usedMB = stats.usedJSHeapSize / (1024 * 1024);
        
        // Trigger warning callback
        if (usedMB >= warningThresholdMB && onMemoryWarning) {
          onMemoryWarning(stats);
        }
        
        // Auto cleanup if memory usage is critical
        if (usedMB >= criticalThresholdMB) {
          console.warn(`Critical memory usage detected: ${usedMB.toFixed(2)}MB`);
          triggerCleanup();
        }
      }
    }, 10000); // Check every 10 seconds
  };

  const stopMonitoring = () => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
  };

  useEffect(() => {
    // Initial stats
    const initialStats = getMemoryStats();
    if (initialStats) {
      setMemoryStats(initialStats);
      
      // Auto-show monitor if memory usage is high
      const usedMB = initialStats.usedJSHeapSize / (1024 * 1024);
      if (usedMB >= warningThresholdMB) {
        setShowMonitor(true);
      }
    }

    // Start monitoring
    startMonitoring();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopMonitoring();
    };
  }, [warningThresholdMB, criticalThresholdMB]);

  // Auto-hide effect - must always be called (moved before early return)
  useEffect(() => {
    if (!memoryStats) return;
    
    const usedMB = memoryStats.usedJSHeapSize / (1024 * 1024);
    
    if (usedMB < warningThresholdMB && showMonitor) {
      const timer = setTimeout(() => {
        setShowMonitor(false);
      }, 5000); // Hide after 5 seconds if memory is normal
      
      return () => clearTimeout(timer);
    }
  }, [memoryStats, warningThresholdMB, showMonitor]);

  if (!memoryStats) return null;

  const usedMB = memoryStats.usedJSHeapSize / (1024 * 1024);
  const totalMB = memoryStats.totalJSHeapSize / (1024 * 1024);
  const limitMB = memoryStats.jsHeapSizeLimit / (1024 * 1024);
  const usage = (usedMB / limitMB) * 100;
  const status = getMemoryStatus(usedMB);

  return (
    <>
      {/* Always show memory indicator */}
      <div 
        style={{ 
          position: 'fixed', 
          top: '70px', 
          right: '20px', 
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowMonitor(!showMonitor)}
      >
        <Card size="small" style={{ minWidth: '120px' }}>
          <Space direction="vertical" size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {status.type === 'error' ? <ExclamationCircleOutlined style={{ color: status.color }} /> :
               status.type === 'warning' ? <WarningOutlined style={{ color: status.color }} /> :
               <CheckCircleOutlined style={{ color: status.color }} />}
              <Text strong style={{ color: status.color }}>
                {formatBytes(memoryStats.usedJSHeapSize)}
              </Text>
            </div>
            <Progress 
              percent={Math.round(usage)} 
              size="small" 
              strokeColor={status.color}
              format={() => `${Math.round(usage)}%`}
            />
          </Space>
        </Card>
      </div>

      {/* Detailed monitor panel */}
      {showMonitor && (
        <div 
          style={{ 
            position: 'fixed', 
            top: '140px', 
            right: '20px', 
            zIndex: 1000,
            width: '300px'
          }}
        >
          <Card 
            title="内存使用监控"
            size="small"
            extra={
              <Button 
                type="text" 
                onClick={() => setShowMonitor(false)}
                style={{ fontSize: '12px' }}
              >
                ×
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Alert
                message={`内存状态: ${status.text}`}
                type={status.type}
                showIcon
                style={{ fontSize: '12px' }}
              />
              
              <div>
                <Statistic
                  title="JS 堆内存使用"
                  value={usedMB}
                  suffix="MB"
                  precision={2}
                  valueStyle={{ fontSize: '16px' }}
                />
                <Progress 
                  percent={Math.round(usage)} 
                  strokeColor={status.color}
                  format={() => `${Math.round(usage)}%`}
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {formatBytes(memoryStats.usedJSHeapSize)} / {formatBytes(memoryStats.jsHeapSizeLimit)}
                </Text>
              </div>

              <div>
                <Text strong style={{ fontSize: '12px' }}>缓存统计:</Text>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  <div>项目数: {memoryStats.cacheSize}</div>
                  <div>内存占用: {memoryStats.cacheMemoryMB.toFixed(2)} MB</div>
                </div>
              </div>

              <div>
                <Button 
                  size="small" 
                  onClick={triggerCleanup}
                  style={{ width: '100%' }}
                >
                  清理内存
                </Button>
              </div>

              <Text type="secondary" style={{ fontSize: '10px' }}>
                最后更新: {memoryStats.timestamp.toLocaleTimeString()}
              </Text>
            </Space>
          </Card>
        </div>
      )}
    </>
  );
};

export default MemoryMonitor;