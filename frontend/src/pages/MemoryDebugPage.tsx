import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Typography, Space, Progress, Alert, Table, Tag } from 'antd';
import { BugOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';
import MemoryManager from '../utils/memoryManager';
import TimerPerformanceMonitor from '../utils/timerPerformance';

const { Title, Text } = Typography;

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

interface TestLog {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

const MemoryDebugPage: React.FC = () => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [simulatedTimers, setSimulatedTimers] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const testTimersRef = useRef<NodeJS.Timeout[]>([]);

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
    return info;
  };

  // 添加日志
  const addLog = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: TestLog = { timestamp, message, type };
    
    setTestLogs(prev => {
      const updated = [...prev, newLog];
      // 保持最新50条日志
      return updated.length > 50 ? updated.slice(-50) : updated;
    });
  };

  // 开始监控
  const startMonitoring = () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    addLog('开始内存监控', 'info');
    
    MemoryManager.startMonitoring();
    TimerPerformanceMonitor.startMonitoring();
    
    const initialMemory = updateMemoryInfo();
    if (initialMemory) {
      addLog(`初始内存: ${initialMemory.used} MB (${initialMemory.percentage}%)`, 'info');
    }
    
    intervalRef.current = setInterval(() => {
      const memory = updateMemoryInfo();
      if (memory) {
        if (memory.percentage > 80) {
          addLog(`🚨 内存使用过高: ${memory.used} MB (${memory.percentage}%)`, 'error');
        } else if (memory.percentage > 60) {
          addLog(`⚠️ 内存使用偏高: ${memory.used} MB (${memory.percentage}%)`, 'warning');
        }
      }
    }, 2000);
  };

  // 停止监控
  const stopMonitoring = () => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    addLog('停止内存监控', 'info');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    MemoryManager.stopMonitoring();
    TimerPerformanceMonitor.stopMonitoring();
  };

  // 强制清理
  const forceCleanup = () => {
    addLog('开始强制清理...', 'info');
    
    // 清理模拟计时器
    testTimersRef.current.forEach(timer => clearInterval(timer));
    testTimersRef.current = [];
    setSimulatedTimers([]);
    
    // 执行系统清理
    MemoryManager.performManualCleanup();
    TimerPerformanceMonitor.forceCleanup();
    
    // 清理localStorage中的测试数据
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    keys.forEach(key => {
      if (key.includes('test_') || key.includes('debug_')) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    addLog(`清理完成，清除了 ${clearedCount} 个存储项`, 'info');
    
    // 更新内存信息
    setTimeout(() => {
      updateMemoryInfo();
      addLog('清理后内存状态已更新', 'info');
    }, 1000);
  };

  // 模拟内存压力测试
  const simulateMemoryPressure = () => {
    addLog('开始模拟内存压力测试...', 'warning');
    
    const timerCount = 10;
    const newTimers: NodeJS.Timeout[] = [];
    const timerIds: number[] = [];
    
    for (let i = 0; i < timerCount; i++) {
      const timerId = Date.now() + i;
      timerIds.push(timerId);
      
      // 创建内存消耗任务
      const timer = setInterval(() => {
        // 模拟创建大量数据
        const data = new Array(5000).fill('x').join('');
        
        try {
          localStorage.setItem(`test_timer_${timerId}`, JSON.stringify({
            id: timerId,
            timestamp: Date.now(),
            data: data,
            counter: Math.random()
          }));
        } catch (e) {
          addLog(`存储写入失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
      }, 1000);
      
      newTimers.push(timer);
    }
    
    testTimersRef.current.push(...newTimers);
    setSimulatedTimers(prev => [...prev, ...timerIds]);
    
    addLog(`创建了 ${timerCount} 个模拟计时器`, 'info');
    
    // 30秒后自动清理
    setTimeout(() => {
      newTimers.forEach(timer => clearInterval(timer));
      timerIds.forEach(id => {
        localStorage.removeItem(`test_timer_${id}`);
      });
      
      setSimulatedTimers(prev => 
        prev.filter(id => !timerIds.includes(id))
      );
      
      addLog('自动清理模拟计时器', 'info');
    }, 30000);
  };

  // 清空日志
  const clearLogs = () => {
    setTestLogs([]);
  };

  // 组件挂载时开始监控
  useEffect(() => {
    updateMemoryInfo();
    startMonitoring();
    
    return () => {
      stopMonitoring();
      forceCleanup();
    };
  }, []);

  // 日志表格列定义
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const color = type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'blue';
        return <Tag color={color}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  const getMemoryStatus = () => {
    if (!memoryInfo) return { status: 'normal', text: '检测中...' };
    
    if (memoryInfo.percentage > 80) {
      return { status: 'exception', text: '内存使用过高' };
    } else if (memoryInfo.percentage > 60) {
      return { status: 'active', text: '内存使用偏高' };
    } else {
      return { status: 'success', text: '内存使用正常' };
    }
  };

  const memoryStatus = getMemoryStatus();

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <BugOutlined /> 内存泄漏调试工具
      </Title>
      
      {/* 内存状态卡片 */}
      <Card title="实时内存状态" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {memoryInfo ? (
            <>
              <div>
                <Text strong>内存使用: </Text>
                <Text code>{memoryInfo.used} MB / {memoryInfo.total} MB</Text>
                <Text type="secondary"> (限制: {memoryInfo.limit} MB)</Text>
              </div>
              
              <Progress 
                percent={memoryInfo.percentage} 
                status={memoryStatus.status as any}
                format={percent => `${percent}%`}
              />
              
              <Alert
                message={memoryStatus.text}
                type={
                  memoryStatus.status === 'exception' ? 'error' :
                  memoryStatus.status === 'active' ? 'warning' : 'success'
                }
                showIcon
              />
            </>
          ) : (
            <Alert message="此浏览器不支持内存监控" type="warning" />
          )}
          
          <div>
            <Text strong>活动模拟器: </Text>
            <Text>{simulatedTimers.length} 个</Text>
          </div>
        </Space>
      </Card>

      {/* 控制面板 */}
      <Card title="控制面板" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button 
            type={isMonitoring ? "default" : "primary"}
            icon={isMonitoring ? <StopOutlined /> : <PlayCircleOutlined />}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </Button>
          
          <Button 
            icon={<DeleteOutlined />}
            onClick={forceCleanup}
            type="primary"
            danger
          >
            强制清理
          </Button>
          
          <Button 
            icon={<BugOutlined />}
            onClick={simulateMemoryPressure}
            disabled={simulatedTimers.length > 0}
          >
            模拟内存压力
          </Button>
          
          <Button 
            icon={<ReloadOutlined />}
            onClick={updateMemoryInfo}
          >
            刷新状态
          </Button>
          
          <Button onClick={clearLogs}>
            清空日志
          </Button>
        </Space>
      </Card>

      {/* 日志表格 */}
      <Card title={`调试日志 (${testLogs.length})`}>
        <Table 
          dataSource={testLogs}
          columns={logColumns}
          rowKey={(record, index) => `${record.timestamp}-${index}`}
          size="small"
          scroll={{ y: 400 }}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default MemoryDebugPage;
