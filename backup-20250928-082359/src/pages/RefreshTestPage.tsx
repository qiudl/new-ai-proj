import React, { useState } from 'react';
import { Card, Space, Button, Typography, Divider } from 'antd';
import TaskCompletionRefresh from '../components/TaskCompletionRefresh';
import RefreshWithCountdown from '../components/RefreshWithCountdown';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

const { Title, Text } = Typography;

const RefreshTestPage: React.FC = () => {
  const { config } = useRefreshConfig();
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
    console.log('刷新执行，次数:', refreshCount + 1);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>刷新倒计时组件测试页面</Title>
      
      <Card title="当前刷新配置">
        <Text>
          completionStatsInterval: {config.completionStatsInterval}秒<br/>
          defaultInterval: {config.defaultInterval}秒<br/>
          enableVisibilityDetection: {config.enableVisibilityDetection.toString()}
        </Text>
      </Card>
      
      <Divider />
      
      <Card title="TaskCompletionRefresh 组件测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>刷新次数: {refreshCount}</Text>
          
          <Space>
            <Text>带进度环:</Text>
            <TaskCompletionRefresh 
              onRefreshCompletionStats={handleRefresh}
              showProgress={true}
              
            />
          </Space>
          
          <Space>
            <Text>不带进度环:</Text>
            <TaskCompletionRefresh 
              onRefreshCompletionStats={handleRefresh}
              showProgress={false}
              
            />
          </Space>
        </Space>
      </Card>
      
      <Divider />
      
      <Card title="RefreshWithCountdown 直接测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Text>20秒间隔，带进度环:</Text>
            <RefreshWithCountdown 
              onRefresh={handleRefresh}
              interval={20}
              showProgress={true}
              
            />
          </Space>
          
          <Space>
            <Text>10秒间隔，不带进度环:</Text>
            <RefreshWithCountdown 
              onRefresh={handleRefresh}
              interval={10}
              showProgress={false}
              
            />
          </Space>
          
          <Space>
            <Text>5秒间隔，中等尺寸:</Text>
            <RefreshWithCountdown 
              onRefresh={handleRefresh}
              interval={5}
              showProgress={true}
              size="middle"
            />
          </Space>
        </Space>
      </Card>
      
      <Divider />
      
      <Button onClick={() => setRefreshCount(0)}>重置计数</Button>
    </div>
  );
};

export default RefreshTestPage;