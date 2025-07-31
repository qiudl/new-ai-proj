// @ts-nocheck
import React, { useState } from 'react';
import { Button, Modal, Input, message, Space, Alert } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import api from '../services/api';

const { TextArea } = Input;

interface TaskDocumentDebuggerProps {
  projectId: number;
  taskId: number;
}

export const TaskDocumentDebugger: React.FC<TaskDocumentDebuggerProps> = ({ projectId, taskId }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (log: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };
  
  const testSaveAPI = async () => {
    setLoading(true);
    setLogs([]);
    addLog('开始测试任务文档保存API...');
    
    try {
      // 测试1: PUT请求（兼容版API）
      addLog('测试1: PUT /api/v1/projects/:id/tasks/:taskId/document');
      const putResponse = await api.put(
        `/projects/${projectId}/tasks/${taskId}/document`,
        { content: '# 测试文档\n\n测试时间: ' + new Date().toISOString() }
      );
      addLog('✅ PUT请求成功: ' + JSON.stringify(putResponse));
      
      // 测试2: GET请求
      addLog('\n测试2: GET /api/v1/projects/:id/tasks/:taskId/document');
      const getResponse = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      addLog('✅ GET请求成功，文档长度: ' + (getResponse.data?.content?.length || 0));
      
      // 测试3: PATCH请求（增强版API）
      addLog('\n测试3: PATCH /api/v1/projects/:id/tasks/:taskId/document/advanced');
      const patchResponse = await api.patch(
        `/projects/${projectId}/tasks/${taskId}/document/advanced`,
        { content: '# 增强版测试\n\n更新时间: ' + new Date().toISOString() }
      );
      addLog('✅ PATCH请求成功: ' + JSON.stringify(patchResponse));
      
      message.success('所有API测试通过！');
      
    } catch (error: any) {
      addLog('❌ 错误: ' + error.message);
      addLog('状态码: ' + error.status);
      addLog('响应: ' + JSON.stringify(error.response?.data));
      message.error('API测试失败，请查看日志');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button
        icon={<BugOutlined />}
        onClick={() => setVisible(true)}
        type="dashed"
        size="small"
      >
        调试文档API
      </Button>
      
      <Modal
        title="任务文档API调试器"
        visible={visible}
        onCancel={() => setVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            关闭
          </Button>,
          <Button key="clear" onClick={() => setLogs([])}>
            清空日志
          </Button>,
          <Button
            key="test"
            type="primary"
            loading={loading}
            onClick={testSaveAPI}
          >
            运行测试
          </Button>
        ]}
      >
        <Alert
          message="调试信息"
          description={`项目ID: ${projectId}, 任务ID: ${taskId}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <TextArea
          value={logs.join('\n')}
          rows={15}
          readOnly
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        />
      </Modal>
    </>
  );
};

export default TaskDocumentDebugger;
