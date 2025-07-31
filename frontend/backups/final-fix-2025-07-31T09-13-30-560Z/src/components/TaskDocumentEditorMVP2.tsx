// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Input, Button, Space, message, Spin, Alert, Drawer, Timeline, Modal, 
  Tag, Tooltip, Dropdown, Popconfirm, Card, Typography, Descriptions, 
  Row, Col, Switch 
} from 'antd';
import { 
  SaveOutlined, EditOutlined, EyeOutlined, HistoryOutlined, 
  RollbackOutlined, CloudDownloadOutlined, SettingOutlined,
  FileTextOutlined, BranchesOutlined, TagOutlined, UserOutlined,
  CalendarOutlined, ExclamationCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { TaskDocumentMVP2Service, TaskDocumentWithVersions, TaskDocumentVersion } from '../services/taskDocumentMVP2Service';
import { TaskCreationNotification } from './TaskCreationNotification';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface TaskDocumentEditorMVP2Props {
  taskId: number;
  projectId: number;
  onSave?: (content: string, version: number) => void;
  style?: React.CSSProperties;
  className?: string;
  initialMode?: 'edit' | 'preview';
  showVersionHistory?: boolean; // 是否显示版本历史按钮
  autoSave?: boolean; // 是否启用自动保存
}

const TaskDocumentEditorMVP2: React.FC<TaskDocumentEditorMVP2Props> = ({
  taskId,
  projectId,
  onSave,
  style,
  className,
  initialMode = 'preview',
  showVersionHistory = true,
  autoSave = false}) => {
  // 基础状态
  const [mode, setMode] = useState<'edit' | 'preview'>(initialMode);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 文档元数据
  const [documentData, setDocumentData] = useState<TaskDocumentWithVersions | null>(null);
  const [documentExists, setDocumentExists] = useState(false);
  
  // 版本管理相关状态
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [versions, setVersions] = useState<TaskDocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  
  // 自动保存定时器
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // 加载文档数据
  const loadDocument = useCallback(async () => {
    if (!taskId || !projectId) return;
    
    setLoading(true);
    try {
      const data = await TaskDocumentMVP2Service.getTaskDocumentWithVersions(projectId, taskId);
      setDocumentData(data);
      setDocumentExists(data.document_exists);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
      setVersions(data.versions || []);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Failed to load document:', error);
      
      // 如果文档不存在，尝试自动创建
      if (error.message?.includes('not found')) {
        try {
          const result = await TaskDocumentMVP2Service.autoCreateTaskDocument(projectId, taskId);
          if (result.document_created) {
            message.success('文档已自动创建');
            // 重新加载
            await loadDocument();
            return;
          }
        } catch (createError) {
          console.error('Failed to auto-create document:', createError);
        }
      }
      
      message.error('加载文档失败: ' + error.message);
      setDocumentExists(false);
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  // 保存文档
  const saveDocument = useCallback(async (newContent?: string) => {
    if (!documentData && !documentExists) return;
    
    const contentToSave = newContent || content;
    if (contentToSave === originalContent) {
      message.info('内容未发生变化');
      return;
    }
    
    setSaving(true);
    try {
      // 这里需要调用保存API（未在MVP2Service中实现）
      // 暂时使用模拟保存
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOriginalContent(contentToSave);
      setHasChanges(false);
      
      // 更新版本信息
      if (documentData) {
        const newVersion = documentData.version + 1;
        setDocumentData({
          ...documentData,
          version: newVersion,
          content: contentToSave,
          updated_at: new Date().toISOString()});
        
        // 添加新版本到历史记录
        const newVersionRecord: TaskDocumentVersion = {
          id: Date.now(), // 临时ID
          version_number: newVersion,
          title: documentData.title,
          change_summary: '手动保存',
          created_at: new Date().toISOString(),
          is_major_version: false,
          created_by_name: '当前用户'};
        setVersions([newVersionRecord, ...versions]);
        
        onSave?.(contentToSave, newVersion);
      }
      
      message.success('文档保存成功');
    } catch (error: any) {
      console.error('Failed to save document:', error);
      message.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [content, originalContent, documentData, documentExists, versions, onSave]);

  // 内容变化处理
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setHasChanges(value !== originalContent);
    
    // 自动保存逻辑
    if (autoSave) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        if (value !== originalContent) {
          saveDocument(value);
        }
      }, 3000); // 3秒后自动保存
      
      setAutoSaveTimer(timer);
    }
  }, [originalContent, autoSave, autoSaveTimer, saveDocument]);

  // 版本回滚
  const handleRollback = useCallback(async (versionId: number, versionNumber: number) => {
    Modal.confirm({
      title: '确认回滚',
      content: `确定要回滚到版本 ${versionNumber} 吗？当前未保存的修改将会丢失。`,
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        setRollingBack(true);
        try {
          await TaskDocumentMVP2Service.rollbackToVersion(projectId, taskId, versionId);
          TaskCreationNotification.showVersionNotification('rollback', versionNumber).success();
          
          // 重新加载文档
          await loadDocument();
          setMode('preview');
        } catch (error: any) {
          TaskCreationNotification.showVersionNotification('rollback').error(error.message);
        } finally {
          setRollingBack(false);
        }
      }});
  }, [projectId, taskId, loadDocument]);

  // 切换模式
  const toggleMode = useCallback(() => {
    if (mode === 'edit' && hasChanges) {
      Modal.confirm({
        title: '未保存的修改',
        content: '您有未保存的修改，确定要切换到预览模式吗？',
        icon: <ExclamationCircleOutlined />,
        onOk: () => {
          setContent(originalContent);
          setHasChanges(false);
          setMode('preview');
        }});
    } else {
      setMode(mode === 'edit' ? 'preview' : 'edit');
    }
  }, [mode, hasChanges, originalContent]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadDocument();
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [loadDocument]);

  // 渲染版本历史抽屉
  const renderVersionDrawer = () => (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>版本历史</span>
          <Tag color="blue">共 {versions.length} 个版本</Tag>
        </Space>
      }
      width={400}
      open={versionDrawerVisible}
      onClose={() => setVersionDrawerVisible(false)}
      loading={loadingVersions}
    >
      <Timeline>
        {versions.map((version, index) => (
          <Timeline.Item
            key={version.id}
            color={version.is_major_version ? 'red' : 'blue'}
            dot={version.is_major_version ? <TagOutlined /> : <FileTextOutlined />}
          >
            <Card size="small" style={{ marginBottom: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong>版本 {version.version_number}</Text>
                    {version.is_major_version && (
                      <Tag color="red" style={{ marginLeft: 8, fontSize: '12px' }}>
                        主要版本
                      </Tag>
                    )}
                    {index === 0 && (
                      <Tag color="green" style={{ marginLeft: 8, fontSize: '12px' }}>
                        当前版本
                      </Tag>
                    )}
                  </Col>
                  <Col>
                    {index !== 0 && (
                      <Tooltip title="回滚到此版本">
                        <Button
                          type="text"
                          size="small"
                          icon={<RollbackOutlined />}
                          loading={rollingBack}
                          onClick={() => handleRollback(version.id, version.version_number)}
                        />
                      </Tooltip>
                    )}
                  </Col>
                </Row>
                
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="修改摘要">
                    {version.change_summary || '无说明'}
                  </Descriptions.Item>
                  <Descriptions.Item label="修改时间">
                    <Space>
                      <CalendarOutlined />
                      {dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Space>
                  </Descriptions.Item>
                  {version.created_by_name && (
                    <Descriptions.Item label="修改者">
                      <Space>
                        <UserOutlined />
                        {version.created_by_name}
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Space>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    </Drawer>
  );

  // 渲染工具栏
  const renderToolbar = () => (
    <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
      <Col>
        <Space>
          <Button
            type={mode === 'edit' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={toggleMode}
            disabled={loading}
          >
            {mode === 'edit' ? '编辑中' : '编辑'}
          </Button>
          
          <Button
            type={mode === 'preview' ? 'primary' : 'default'}
            icon={<EyeOutlined />}
            onClick={toggleMode}
            disabled={loading}
          >
            预览
          </Button>
          
          {mode === 'edit' && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!hasChanges}
              onClick={() => saveDocument()}
            >
              保存
            </Button>
          )}
          
          {showVersionHistory && documentExists && (
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setVersionDrawerVisible(true)}
            >
              版本历史 ({versions.length})
            </Button>
          )}
        </Space>
      </Col>
      
      <Col>
        <Space>
          {autoSave && (
            <Tooltip title="自动保存已启用">
              <Switch 
                size="small" 
                checked={autoSave} 
                checkedChildren="自动保存" 
                unCheckedChildren="手动保存"
                disabled
              />
            </Tooltip>
          )}
          
          {documentData && (
            <Tag icon={<BranchesOutlined />} color="blue">
              v{documentData.version}
            </Tag>
          )}
          
          {hasChanges && (
            <Tag icon={<ExclamationCircleOutlined />} color="orange">
              未保存
            </Tag>
          )}
        </Space>
      </Col>
    </Row>
  );

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载文档中...</div>
        </div>
      );
    }

    if (!documentExists && !content) {
      return (
        <Alert
          message="文档不存在"
          description="此任务尚未创建文档，您可以手动创建一个。"
          type="info"
          showIcon
          action={
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                try {
                  const result = await TaskDocumentMVP2Service.autoCreateTaskDocument(projectId, taskId);
                  if (result.document_created) {
                    message.success('文档创建成功');
                    await loadDocument();
                  }
                } catch (error: any) {
                  message.error('创建文档失败: ' + error.message);
                }
              }}
            >
              创建文档
            </Button>
          }
        />
      );
    }

    if (mode === 'edit') {
      return (
        <TextArea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="在这里编写任务文档..."
          autoSize={{ minRows: 10, maxRows: 30 }}
          style={{ fontSize: '14px', lineHeight: '1.6' }}
        />
      );
    }

    return (
      <div
        style={{
          minHeight: '300px',
          padding: '16px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          backgroundColor: '#fafafa'}}
      >
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '50px 0' }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>文档内容为空</div>
            <Button 
              type="link" 
              onClick={() => setMode('edit')}
              style={{ marginTop: '8px' }}
            >
              开始编写
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={style} className={className}>
      {renderToolbar()}
      {renderContent()}
      {renderVersionDrawer()}
    </div>
  );
};

export default TaskDocumentEditorMVP2;