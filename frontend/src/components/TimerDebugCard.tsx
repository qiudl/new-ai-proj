import React, { useState, useCallback } from 'react';
import { Card, Button, Space, message, Typography } from 'antd';
import TimerService from '../services/timerService';

const { Text, Title } = Typography;

const TimerDebugCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Ready to test...');

  const testGetCurrent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await TimerService.getCurrentTimer();
      setDebugInfo(`Current Timer: ${JSON.stringify(response, null, 2)}`);
      message.success('Successfully got current timer');
    } catch (error) {
      console.error('getCurrentTimer failed:', error);
      setDebugInfo(`Error: ${error}`);
      message.error('Failed to get current timer');
    } finally {
      setLoading(false);
    }
  }, []);

  const testStartTimer = useCallback(async () => {
    setLoading(true);
    try {
      // Use a hardcoded task ID for testing
      const response = await TimerService.startTimer(47);
      setDebugInfo(`Start Timer: ${JSON.stringify(response, null, 2)}`);
      message.success('Successfully started timer');
    } catch (error) {
      console.error('startTimer failed:', error);
      setDebugInfo(`Error: ${error}`);
      message.error('Failed to start timer');
    } finally {
      setLoading(false);
    }
  }, []);

  const testStopTimer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await TimerService.stopTimer();
      setDebugInfo(`Stop Timer: ${JSON.stringify(response, null, 2)}`);
      message.success('Successfully stopped timer');
    } catch (error) {
      console.error('stopTimer failed:', error);
      setDebugInfo(`Error: ${error}`);
      message.error('Failed to stop timer');
    } finally {
      setLoading(false);
    }
  }, []);

  const testToken = useCallback(() => {
    const token = localStorage.getItem('token');
    setDebugInfo(`Token: ${token ? 'Present (length: ' + token.length + ')' : 'Not found'}\n\nToken preview: ${token ? token.substring(0, 50) + '...' : 'N/A'}`);
  }, []);

  return (
    <Card title="Timer Debug Tool" style={{ margin: '16px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Button onClick={testToken}>Check Token</Button>
          <Button onClick={testGetCurrent} loading={loading}>
            Test Get Current
          </Button>
          <Button onClick={testStartTimer} loading={loading}>
            Test Start Timer (Task 47)
          </Button>
          <Button onClick={testStopTimer} loading={loading}>
            Test Stop Timer
          </Button>
        </Space>
        
        <div style={{ marginTop: '16px' }}>
          <Title level={5}>Debug Info:</Title>
          <Text code style={{ whiteSpace: 'pre-wrap', display: 'block', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
            {debugInfo}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default TimerDebugCard;