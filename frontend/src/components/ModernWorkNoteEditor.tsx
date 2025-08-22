import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Button,
  Input,
  Select,
  Form,
  Space,
  Divider,
  Typography,
  Tag,
  Row,
  Col,
  Card,
  message,
  Tooltip,
  Badge,
  Switch,
  Alert
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  SendOutlined,
  TagOutlined,
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  FileMarkdownOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ModernWorkNoteEditorProps {
  visible: boolean;
  note?: WorkNote | null;
  onClose: () => void;
  onSave: () => void;
}

const ModernWorkNoteEditor: React.FC<ModernWorkNoteEditorProps> = ({
  visible,
  note,
  onClose,
  onSave
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout>();

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    tags: [],
    status: 'draft',
    visibility: 'team',
    type: 'markdown'
  });

  // 初始化表单数据
  useEffect(() => {
    if (note) {
      const data = {
        title: note.title || '',
        content: note.content || '',
        description: note.description || '',
        tags: note.tags || [],
        status: note.status || 'draft',
        visibility: note.visibility || 'team',
        type: note.type || 'markdown'
      };
      setFormData(data);
      if (visible) {
        form.setFieldsValue({
          ...data,
          tags: data.tags.join(', ')
        });
      }
    } else {
      const data = {
        title: '',
        content: '',
        description: '',
        tags: [],
        status: 'draft',
        visibility: 'team',
        type: 'markdown'
      };
      setFormData(data);
      if (visible) {
        form.setFieldsValue({
          ...data,
          tags: ''
        });
      }
    }
    setUnsavedChanges(false);
  }, [note, visible, form]);

  // 自动保存
  useEffect(() => {
    if (autoSave && note && unsavedChanges) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      
      autoSaveRef.current = setTimeout(() => {
        handleSave(true);
      }, 3000); // 3秒后自动保存
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [formData, autoSave, note, unsavedChanges]);

  // 字数统计
  useEffect(() => {
    const content = formData.content || '';
    const count = content.replace(/\s/g, '').length;
    setWordCount(count);
  }, [formData.content]);

  // 处理表单变化
  const handleFormChange = (changedValues: any, allValues: any) => {
    const newData = {
      ...formData,
      ...changedValues,
      tags: changedValues.tags ? changedValues.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : formData.tags
    };
    setFormData(newData);
    setUnsavedChanges(true);
  };

  // 保存笔记
  const handleSave = async (isAutoSave = false) => {
    try {
      setSaving(true);
      
      const values = form.getFieldsValue();
      const tags = values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [];
      
      if (note) {
        // 更新现有笔记
        const request: UpdateWorkNoteRequest = {
          title: values.title,
          content: values.content,
          description: values.description,
          status: values.status,
          visibility: values.visibility,
          tags
        };
        
        await workNotesService.updateWorkNote(note.id, request);
      } else {
        // 创建新笔记
        const request: CreateWorkNoteRequest = {
          title: values.title || '无标题',
          content: values.content,
          description: values.description,
          type: values.type,
          status: values.status,
          visibility: values.visibility,
          tags,
          is_template: false
        };
        
        await workNotesService.createWorkNote(request);
      }
      
      if (!isAutoSave) {
        message.success(note ? '笔记更新成功' : '笔记创建成功');
        onSave();
      } else {
        message.success('自动保存成功', 1);
      }
      
      setUnsavedChanges(false);
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 发布笔记
  const handlePublish = async () => {
    form.setFieldValue('status', 'published');
    setFormData(prev => ({ ...prev, status: 'published' }));
    await handleSave();
  };

  // 渲染预览
  const renderPreview = () => {
    return (
      <div style={{ 
        padding: 20,
        background: '#fff',
        borderRadius: 8,
        minHeight: 400,
        border: '1px solid #f0f0f0'
      }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          {formData.title || '无标题'}
        </Title>
        
        {formData.description && (
          <Text type="secondary" style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
            {formData.description}
          </Text>
        )}
        
        <Divider />
        
        <div style={{ 
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          fontSize: 14,
          fontFamily: 'monospace'
        }}>
          {formData.content || '暂无内容'}
        </div>
        
        {formData.tags.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Divider />
            <Space wrap>
              {formData.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FileMarkdownOutlined />
            <span>{note ? '编辑笔记' : '新建笔记'}</span>
            {unsavedChanges && <Badge status="warning" text="未保存" />}
          </Space>
          <Space>
            <Tooltip title={fullscreen ? '退出全屏' : '全屏编辑'}>
              <Button
                type="text"
                icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setFullscreen(!fullscreen)}
              />
            </Tooltip>
          </Space>
        </div>
      }
      width={fullscreen ? '100vw' : 800}
      height={fullscreen ? '100vh' : undefined}
      open={visible}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid #f0f0f0' }
      }}
      footer={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              字数: {wordCount}
            </Text>
            <Divider type="vertical" />
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>自动保存</Text>
              <Switch 
                size="small" 
                checked={autoSave}
                onChange={setAutoSave}
              />
            </Space>
          </Space>
          
          <Space>
            <Button
              type={previewMode ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setPreviewMode(!previewMode)}
            >
              预览
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSave()}
              loading={saving}
            >
              保存
            </Button>
            {formData.status === 'draft' && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handlePublish}
                loading={saving}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                发布
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 将单一 Form 包裹设置 + 编辑区域，避免多实例或未绑定警告 */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          size="small"
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {/* 设置区域 */}
          <Card size="small" style={{ margin: 0, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="title" label="标题" style={{ marginBottom: 8 }}>
                  <Input placeholder="请输入笔记标题" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="status" label="状态" style={{ marginBottom: 8 }}>
                  <Select>
                    <Option value="draft">草稿</Option>
                    <Option value="published">发布</Option>
                    <Option value="archived">归档</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="visibility" label="可见性" style={{ marginBottom: 8 }}>
                  <Select>
                    <Option value="private">私有</Option>
                    <Option value="team">团队</Option>
                    <Option value="public">公开</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="description" label="描述" style={{ marginBottom: 8 }}>
                  <Input placeholder="简短描述（可选）" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="tags" label="标签" style={{ marginBottom: 8 }}>
                  <Input placeholder="标签，用逗号分隔" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 编辑/预览区域 */}
          <div style={{ flex: 1, padding: 16 }}>
            {previewMode ? (
              renderPreview()
            ) : (
              <Form.Item name="content" style={{ marginBottom: 0 }}>
                <TextArea
                  placeholder="开始写作..."
                  style={{ 
                    minHeight: fullscreen ? 'calc(100vh - 300px)' : '400px',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    lineHeight: 1.6,
                    resize: 'none'
                  }}
                  autoSize={false}
                />
              </Form.Item>
            )}
          </div>

          {/* 快捷提示 */}
          {!previewMode && (
            <Alert
              message="快捷键提示"
              description="Ctrl+S 保存，Ctrl+P 预览，支持 Markdown 语法"
              type="info"
              showIcon
              style={{ margin: '0 16px 16px 16px', fontSize: 12 }}
            />
          )}
        </Form>
      </div>
    </Drawer>
  );
};

export default ModernWorkNoteEditor;