import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import MemoryManager from '../utils/memoryManager';

const { Title, Text } = Typography;

const MemoryTestPage: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = React.useState<string>('');

  const updateMemoryInfo = () => {
    const info = MemoryManager.getMemoryUsageString();
    const percentage = MemoryManager.getMemoryUsagePercentage();
    const isCritical = MemoryManager.isMemoryUsageCritical();
    
    setMemoryInfo(`${info} (${percentage.toFixed(1)}%) ${isCritical ? '🚨 CRITICAL' : ''}`);
  };

  const performCleanup = () => {
    MemoryManager.performManualCleanup();
    setTimeout(updateMemoryInfo, 1000); // Update after cleanup
  };

  React.useEffect(() => {
    MemoryManager.startMonitoring();
    updateMemoryInfo();
    
    const interval = setInterval(updateMemoryInfo, 5000);
    
    return () => {
      clearInterval(interval);
      MemoryManager.stopMonitoring();
    };
  }, []);

  return (
    <Card title="内存监控测试页面" style={{ maxWidth: 600, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Title level={4}>当前内存使用情况</Title>
          <Text code style={{ fontSize: '12px' }}>{memoryInfo}</Text>
        </div>
        
        <Space>
          <Button onClick={updateMemoryInfo}>刷新内存信息</Button>
          <Button type="primary" onClick={performCleanup}>执行内存清理</Button>
        </Space>
        
        <div style={{ fontSize: '12px', color: '#666' }}>
          <p>内存监控每30秒自动检查一次</p>
          <p>警告阈值: 100MB | 严重阈值: 200MB</p>
        </div>
      </Space>
    </Card>
  );
};

export default MemoryTestPage;
