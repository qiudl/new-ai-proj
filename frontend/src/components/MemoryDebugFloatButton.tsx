import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, Card, Typography, Space, Progress, Button, Alert, Tag } from 'antd';
import { BugOutlined, DeleteOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import MemoryManager from '../utils/memoryManager';
import TimerPerformanceMonitor from '../utils/timerPerformance';

const { Text } = Typography;

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

const MemoryDebugFloatButton: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alertLevel, setAlertLevel] = useState<'success' | 'warning' | 'error'>('success');

  // 获取内存信息
  const getMemoryInfo = (): MemoryInfo | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
      const total = Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100;
      const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100;
      const percentage = Math.round(used / limit * 100 * 100) / 100;
      
      return { used, total, limit, percentage };
    }
    return null;
  };

  // 更新内存信息
  const updateMemoryInfo = () => {
    const info = getMemoryInfo();
    setMemoryInfo(info);
    
    if (info) {
      if (info.percentage > 80) {
        setAlertLevel('error');
      } else if (info.percentage > 60) {
        setAlertLevel('warning');
      } else {
        setAlertLevel('success');
      }
    }
    
    return info;
  };

  // 强制清理
  const forceCleanup = () => {
    MemoryManager.performManualCleanup();
    TimerPerformanceMonitor.forceCleanup();
    
    // 清理测试数据
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('test_') || key.includes('debug_') || key.includes('timer')) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // 忽略清理错误
        }
      }
    });
    
    setTimeout(() => {
      updateMemoryInfo();
    }, 1000);
  };

  // 开始监控
  const startMonitoring = () => {
    setIsMonitoring(true);
    MemoryManager.startMonitoring();
  };

  // 停止监控
  const stopMonitoring = () => {
    setIsMonitoring(false);
    MemoryManager.stopMonitoring();
  };

  // 组件挂载时开始监控
  useEffect(() => {
    updateMemoryInfo();
    
    // 每5秒更新一次内存信息
    const interval = setInterval(updateMemoryInfo, 5000);
    
    return () => {
      clearInterval(interval);
      stopMonitoring();
    };
  }, []);

  // 只在开发环境或内存使用过高时显示
  const shouldShowButton = process.env.NODE_ENV === 'development' || 
                          (memoryInfo && memoryInfo.percentage > 60);

  if (!shouldShowButton) {
    return null;
  }

  const getButtonColor = () => {
    switch (alertLevel) {
      case 'error': return '#ff4d4f';
      case 'warning': return '#faad14';
      default: return '#52c41a';
    }
  };

  return (
    <>
      <FloatButton
        icon={<BugOutlined />}
        type="primary"
        style={{ 
          right: 24, 
          bottom: 80,
          backgroundColor: getButtonColor(),
          borderColor: getButtonColor()
        }}
        onClick={() => setVisible(true)}
        tooltip="内存调试"
        badge={{ 
          count: memoryInfo ? `${memoryInfo.percentage.toFixed(0)}%` : '?',
          color: getButtonColor(),
          style: { fontSize: '10px' }
        }}
      />

      <Modal
        title={
          <Space>
            <BugOutlined />
            内存调试面板
            <Tag color={alertLevel === 'error' ? 'red' : alertLevel === 'warning' ? 'orange' : 'green'}>
              {alertLevel === 'error' ? '内存过高' : alertLevel === 'warning' ? '内存偏高' : '内存正常'}
            </Tag>
          </Space>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 内存状态 */}
          {memoryInfo ? (
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>内存使用: </Text>
                  <Text code>{memoryInfo.used} MB / {memoryInfo.total} MB</Text>
                  <Text type="secondary"> (限制: {memoryInfo.limit} MB)</Text>
                </div>
                
                <Progress 
                  percent={memoryInfo.percentage} 
                  status={
                    alertLevel === 'error' ? 'exception' : 
                    alertLevel === 'warning' ? 'active' : 'success'
                  }
                  format={percent => `${percent}%`}
                />
                
                <Alert
                  message={
                    alertLevel === 'error' ? '⚠️ 内存使用过高，建议立即清理' :
                    alertLevel === 'warning' ? '⚡ 内存使用偏高，建议关注' :
                    '✅ 内存使用正常'
                  }
                  type={alertLevel}
                  showIcon
                  style={{ fontSize: '12px' }}
                />
              </Space>
            </Card>
          ) : (
            <Alert message="此浏览器不支持内存监控" type="warning" />
          )}

          {/* 控制按钮 */}
          <Space wrap>
            <Button 
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={forceCleanup}
              size="small"
            >
              强制清理
            </Button>
            
            <Button 
              type={isMonitoring ? "default" : "primary"}
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              size="small"
            >
              {isMonitoring ? '停止监控' : '开始监控'}
            </Button>
            
            <Button 
              icon={<EyeOutlined />}
              onClick={() => {
                setVisible(false);
                // 打开完整的调试页面
                window.open('/debug/memory', '_blank');
              }}
              size="small"
            >
              完整调试
            </Button>
          </Space>

          {/* 快速信息 */}
          <div style={{ fontSize: '12px', color: '#666' }}>
            <div>• 监控状态: {isMonitoring ? '🟢 运行中' : '🔴 已停止'}</div>
            <div>• 更新频率: 每5秒</div>
            <div>• 清理阈值: 60% 警告, 80% 严重</div>
            {process.env.NODE_ENV === 'development' && (
              <div>• 开发模式: 总是显示此面板</div>
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default MemoryDebugFloatButton;
