/**
 * CollaborationTestPage - 测试实时协作功能
 */

import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, InputNumber, Input, message } from 'antd';
import CollaborativeEditor from '../components/CollaborativeEditor';
import { getCurrentUser } from '../utils/userUtils';
import { User } from '../types/user';

const { Title, Paragraph } = Typography;

export default function CollaborationTestPage(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);
  const [documentId, setDocumentId] = useState<number>(1);
  const [fieldName, setFieldName] = useState<string>('description');

  if (!user) {
    return (
      <Card>
        <Title level={3}>请先登录</Title>
        <Paragraph>您需要登录才能使用协作编辑功能</Paragraph>
      </Card>
    );
  }

  const handleRefresh = () => {
    message.info('重新连接WebSocket...');
    // 通过改变key强制重新挂载组件
    setDocumentId((prev) => prev);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>实时协作编辑测试</Title>
        <Paragraph>
          此页面用于测试基于Yjs和WebSocket的实时协作编辑功能。
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 测试参数配置 */}
          <Card size="small" title="测试参数">
            <Space>
              <div>
                <label>文档ID: </label>
                <InputNumber
                  min={1}
                  value={documentId}
                  onChange={(val) => setDocumentId(val || 1)}
                />
              </div>
              <div>
                <label>字段名: </label>
                <Input
                  style={{ width: 200 }}
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="字段名"
                />
              </div>
              <Button onClick={handleRefresh}>重新连接</Button>
            </Space>
          </Card>

          {/* 协作编辑器 */}
          <Card title="协作编辑器">
            <CollaborativeEditor
              key={`${documentId}_${fieldName}`}
              documentId={documentId}
              fieldName={fieldName}
              placeholder="开始输入内容，其他用户会实时看到您的编辑..."
              minHeight={300}
              maxHeight={600}
              enableCollaboration={true}
            />
          </Card>

          {/* 使用说明 */}
          <Card size="small" title="使用说明">
            <ul>
              <li>在另一个浏览器窗口打开此页面，使用相同的文档ID和字段名</li>
              <li>在一个窗口中输入内容，另一个窗口会实时显示</li>
              <li>顶部显示当前连接状态和在线用户</li>
              <li>支持富文本格式：标题、列表、链接等</li>
              <li>所有编辑会自动保存到数据库</li>
            </ul>
          </Card>

          {/* 当前用户信息 */}
          <Card size="small" title="当前用户">
            <Paragraph>
              用户ID: {user.id}<br />
              用户名: {user.username}<br />
              企业ID: {user.enterprise_id || '未分配'}
            </Paragraph>
          </Card>
        </Space>
      </Card>
    </div>
  );
}
