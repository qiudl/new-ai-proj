import React, { useMemo, useState, useEffect } from 'react';
import { Breadcrumb, Card, Form, Input, Button, Alert, Space, Descriptions } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { apiWithRetry, safeApiCall } from '../services/api';

const DEFAULT_FILE_KEY = '';
const DEFAULT_NODE_ID = '';

const buildEmbedUrl = (fileKey: string, nodeId?: string) => {
  const base = `https://www.figma.com/file/${fileKey}`;
  const url = nodeId ? `${base}?node-id=${encodeURIComponent(nodeId)}` : base;
  const host = 'app';
  return `https://www.figma.com/embed?embed_host=${host}&url=${encodeURIComponent(url)}`;
};

const FigmaIntegrationPage: React.FC = () => {
  const [fileKey, setFileKey] = useState<string>(() => localStorage.getItem('figma_file_key') || DEFAULT_FILE_KEY);
  const [nodeId, setNodeId] = useState<string>(() => localStorage.getItem('figma_node_id') || DEFAULT_NODE_ID);
  const [figmaUrl, setFigmaUrl] = useState<string>(() => localStorage.getItem('figma_url') || '');
  const [usingDirectUrl, setUsingDirectUrl] = useState<boolean>(() => (localStorage.getItem('figma_using_direct_url') === 'true'));

  useEffect(() => {
    localStorage.setItem('figma_file_key', fileKey);
  }, [fileKey]);

  useEffect(() => {
    localStorage.setItem('figma_node_id', nodeId);
  }, [nodeId]);

  useEffect(() => {
    localStorage.setItem('figma_url', figmaUrl);
  }, [figmaUrl]);

  useEffect(() => {
    localStorage.setItem('figma_using_direct_url', usingDirectUrl ? 'true' : 'false');
  }, [usingDirectUrl]);

  const embedSrc = useMemo(() => {
    if (usingDirectUrl && figmaUrl) {
      return `https://www.figma.com/embed?embed_host=app&url=${encodeURIComponent(figmaUrl)}`;
    }
    if (!fileKey) return '';
    return buildEmbedUrl(fileKey, nodeId || undefined);
  }, [usingDirectUrl, figmaUrl, fileKey, nodeId]);

  const handleSubmit = () => {
    if (usingDirectUrl) {
      if (!figmaUrl) return;
    } else {
      if (!fileKey) return;
    }
  };

  const [fileInfo, setFileInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const fetchFileInfo = async () => {
    if (!fileKey) return;
    setLoadingInfo(true);
    const data = await safeApiCall(async () => {
      const res = await apiWithRetry.get(`/api/v1/integrations/figma/files/${encodeURIComponent(fileKey)}`);
      return res;
    }, null, '获取Figma文件信息失败');
    setFileInfo(data);
    setLoadingInfo(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: '系统管理' },
        { title: '集成' },
        { title: 'Figma预览' }
      ]} />

      <Card title={<Space><AppstoreOutlined /> 集成 · Figma 预览</Space>}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="支持两种方式：输入文件Key/节点ID，或直接粘贴Figma文件/原型URL"
        />

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="使用直接URL">
            <Space>
              <Button type={usingDirectUrl ? 'primary' : 'default'} onClick={() => setUsingDirectUrl(true)}>直接URL</Button>
              <Button type={!usingDirectUrl ? 'primary' : 'default'} onClick={() => setUsingDirectUrl(false)}>文件Key模式</Button>
            </Space>
          </Form.Item>

          {usingDirectUrl ? (
            <Form.Item label="Figma 文件或原型 URL">
              <Input
                placeholder="https://www.figma.com/file/FILE_KEY 或 https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value.trim())}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item label="文件 Key">
                <Input
                  placeholder="在 Figma 分享链接中可见的 FILE_KEY"
                  value={fileKey}
                  onChange={(e) => setFileKey(e.target.value.trim())}
                />
              </Form.Item>
              <Form.Item label="节点 ID（可选）">
                <Input
                  placeholder="例如 1%3A2；可在 Figma 地址栏 node-id 查询"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value.trim())}
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">更新预览</Button>
              <Button onClick={fetchFileInfo} loading={loadingInfo} disabled={!fileKey}>获取文件信息</Button>
            </Space>
          </Form.Item>
        </Form>

        {embedSrc ? (
          <div style={{ marginTop: 16 }}>
            <iframe
              title="Figma Embed"
              style={{ width: '100%', minHeight: '70vh', border: 0 }}
              allowFullScreen
              src={embedSrc}
            />
          </div>
        ) : (
          <Alert type="warning" showIcon message="请填写 Figma URL 或文件 Key" />
        )}

        {fileInfo && (
          <Card style={{ marginTop: 16 }} title="文件信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="文档名">{(fileInfo.document && fileInfo.document.name) || fileInfo.name || '未知'}</Descriptions.Item>
              <Descriptions.Item label="包含页数">{Array.isArray(fileInfo.document?.children) ? fileInfo.document.children.length : '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default FigmaIntegrationPage;
