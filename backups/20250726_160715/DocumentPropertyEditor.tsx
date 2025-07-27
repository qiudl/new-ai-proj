/**
 * 文档属性编辑器组件
 * 提供完整的文档元数据编辑功能，包括客户、项目关联等
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Button,
  Typography,
  Row,
  Col,
  Divider,
  Switch,
  DatePicker,
  message,
  Tooltip,
  Badge,
  Modal,
  AutoComplete
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  UserOutlined,
  ProjectOutlined,
  TagsOutlined,
  EyeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import type { Document, DocumentType, DocumentStatus, DocumentVisibility } from '../types/document';
import unifiedDocumentService from '../services/unifiedDocumentService';
import dayjs from '../utils/dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface DocumentPropertyEditorProps {
  document: Document;
  onSave: (updatedDocument: Document) => void;
  onCancel?: () => void;
  visible?: boolean;
  loading?: boolean;
  mode?: 'modal' | 'inline'; // 显示模式
}

// 文档类型配置
const DOCUMENT_TYPES: { [key in DocumentType]: { label: string; color: string; icon: string } } = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  text: { label: '纯文本', color: 'default', icon: '📄' },
  word: { label: 'Word文档', color: 'blue', icon: '📘' },
  pdf: { label: 'PDF文档', color: 'red', icon: '📋' },
  excel: { label: 'Excel表格', color: 'green', icon: '📊' },
  image: { label: '图片文档', color: 'orange', icon: '🖼️' }
};

// 文档状态配置
const DOCUMENT_STATUS: { [key in DocumentStatus]: { label: string; color: string } } = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

// 可见性配置
const VISIBILITY_OPTIONS: { [key in DocumentVisibility]: { label: string; color: string; icon: React.ReactNode } } = {
  private: { 
    label: '私有', 
    color: 'red', 
    icon: <EyeOutlined style={{ color: '#ff4d4f' }} /> 
  },
  team: { 
    label: '团队可见', 
    color: 'blue', 
    icon: <TeamOutlined style={{ color: '#1890ff' }} /> 
  },
  public: { 
    label: '公开', 
    color: 'green', 
    icon: <UserOutlined style={{ color: '#52c41a' }} /> 
  }
};

// 预定义标签
const PREDEFINED_TAGS = [
  '重要', '紧急', '会议纪要', '技术文档', '产品规格', 
  '用户手册', '设计稿', '合同', '报告', '方案',
  '前端', '后端', '数据库', '测试', '部署',
  'v1.0', 'v2.0', 'MVP', 'Beta', '生产环境'
];

// 文档分类 - 现在从 API 加载

const DocumentPropertyEditor: React.FC<DocumentPropertyEditorProps> = ({
  document,
  onSave,
  onCancel,
  visible = true,
  loading = false,
  mode = 'modal'
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (document) {
      form.setFieldsValue({
        title: document.title,
        description: document.description || '',
        type: document.type,
        status: document.status,
        visibility: document.visibility,
        project_id: document.project_id,
        customer_id: document.customer_id,
        category: document.category || '',
        tags: document.tags || [],
        is_template: document.is_template || false,
        shared_with: Array.isArray(document.shared_with) ? document.shared_with : []
      });
      setCustomTags(document.tags || []);
    }
  }, [document, form]);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/v1/document-metadata/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data);
      } else {
        console.warn('Invalid projects API response:', data);
        setProjects([]);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch('/api/v1/document-metadata/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      } else {
        console.warn('Invalid customers API response:', data);
        setCustomers([]);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch('/api/v1/document-metadata/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      } else {
        console.warn('Invalid categories API response:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadProjects();
    loadCustomers();
    loadCategories();
  }, [loadProjects, loadCustomers, loadCategories]);

  // 添加自定义标签
  const handleAddTag = () => {
    if (newTag && !customTags.includes(newTag)) {
      const updatedTags = [...customTags, newTag];
      setCustomTags(updatedTags);
      form.setFieldValue('tags', updatedTags);
      setNewTag('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = customTags.filter(tag => tag !== tagToRemove);
    setCustomTags(updatedTags);
    form.setFieldValue('tags', updatedTags);
  };

  // 添加预定义标签
  const handleAddPredefinedTag = (tag: string) => {
    if (!customTags.includes(tag)) {
      const updatedTags = [...customTags, tag];
      setCustomTags(updatedTags);
      form.setFieldValue('tags', updatedTags);
    }
  };

  // 保存文档属性
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const updatedDocument: Document = {
        ...document,
        ...values,
        tags: customTags,
        due_date: values.due_date ? values.due_date.toISOString() : undefined,
        updated_at: new Date().toISOString()
      };

      // 调用API更新文档
      const savedDocument = await unifiedDocumentService.updateDocument(document.id, {
        title: updatedDocument.title,
        content: updatedDocument.content,
        description: updatedDocument.description,
        type: updatedDocument.type,
        status: updatedDocument.status,
        visibility: updatedDocument.visibility,
        project_id: updatedDocument.project_id,
        customer_id: updatedDocument.customer_id,
        tags: updatedDocument.tags,
        is_template: updatedDocument.is_template,
        shared_with: updatedDocument.shared_with
      });

      message.success('文档属性已更新');
      onSave(savedDocument);
    } catch (error) {
      console.error('保存文档属性失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 渲染表单内容
  const renderFormContent = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      initialValues={{
        type: 'markdown',
        status: 'draft',
        visibility: 'private',
        is_template: false,
        priority: 'medium'
      }}
    >
      {/* 基本信息 */}
      <Card size="small" title={
        <Space>
          <FileTextOutlined />
          <span>基本信息</span>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="title"
              label="文档标题"
              rules={[{ required: true, message: '请输入文档标题' }]}
            >
              <Input placeholder="请输入文档标题" maxLength={255} showCount />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="文档描述">
              <TextArea 
                placeholder="请输入文档描述（可选）" 
                rows={3} 
                maxLength={500} 
                showCount 
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="type" label="文档类型">
              <Select placeholder="选择文档类型">
                {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <Space>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="文档状态">
              <Select placeholder="选择文档状态">
                {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <Badge color={config.color} text={config.label} />
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 关联信息 */}
      <Card size="small" title={
        <Space>
          <ProjectOutlined />
          <span>关联信息</span>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="project_id" label="关联项目">
              <Select 
                placeholder="选择关联项目（可选）" 
                allowClear
                loading={loadingProjects}
                showSearch
                optionFilterProp="children"
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>
                    <div>
                      <div>{project.name}</div>
                      {project.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {project.description}
                        </div>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="customer_id" label="关联客户">
              <Select 
                placeholder="选择关联客户（可选）" 
                allowClear
                loading={loadingCustomers}
                showSearch
                optionFilterProp="children"
              >
                {customers.map(customer => (
                  <Option key={customer.id} value={customer.id}>
                    <div>
                      <div>{customer.name}</div>
                      {customer.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {customer.description}
                        </div>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="category" label="文档分类">
              <Select 
                placeholder="选择文档分类（可选）" 
                allowClear
                loading={loadingCategories}
              >
                {categories.map(category => (
                  <Select.OptGroup key={category.value} label={category.label}>
                    {category.children.map((child: any) => (
                      <Option key={child.value} value={child.value}>
                        {child.label}
                      </Option>
                    ))}
                  </Select.OptGroup>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 标签和分类 */}
      <Card size="small" title={
        <Space>
          <TagsOutlined />
          <span>标签管理</span>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Form.Item label="文档标签">
          <div style={{ marginBottom: 8 }}>
            <Space wrap>
              {customTags.map(tag => (
                <Tag 
                  key={tag} 
                  closable 
                  onClose={() => handleRemoveTag(tag)}
                  color="blue"
                >
                  {tag}
                </Tag>
              ))}
            </Space>
          </div>
          <Row gutter={8}>
            <Col flex="auto">
              <Input
                placeholder="输入自定义标签"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onPressEnter={handleAddTag}
              />
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddTag}
                disabled={!newTag}
              >
                添加
              </Button>
            </Col>
          </Row>
          <Divider orientation="left" style={{ margin: '16px 0 8px 0' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>快速添加常用标签</Text>
          </Divider>
          <Space wrap>
            {PREDEFINED_TAGS.map(tag => (
              <Tag
                key={tag}
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddPredefinedTag(tag)}
                color={customTags.includes(tag) ? 'green' : 'default'}
              >
                {customTags.includes(tag) ? '✓ ' : '+ '}{tag}
              </Tag>
            ))}
          </Space>
        </Form.Item>
      </Card>

      {/* 权限和可见性 */}
      <Card size="small" title={
        <Space>
          <EyeOutlined />
          <span>权限设置</span>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="visibility" label="可见性">
              <Select placeholder="选择可见性">
                {Object.entries(VISIBILITY_OPTIONS).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <Space>
                      {config.icon}
                      <Badge color={config.color} text={config.label} />
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="优先级">
              <Select placeholder="选择优先级">
                <Option value="low">
                  <Badge color="green" text="低优先级" />
                </Option>
                <Option value="medium">
                  <Badge color="blue" text="中优先级" />
                </Option>
                <Option value="high">
                  <Badge color="orange" text="高优先级" />
                </Option>
                <Option value="urgent">
                  <Badge color="red" text="紧急" />
                </Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item 
              name="shared_with" 
              label={
                <Space>
                  <span>共享给</span>
                  <Tooltip title="选择可以访问此文档的特定用户">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
            >
              <Select 
                mode="multiple" 
                placeholder="选择共享用户（可选）"
                allowClear
              >
                <Option value="user-1">张三</Option>
                <Option value="user-2">李四</Option>
                <Option value="user-3">王五</Option>
                <Option value="user-4">赵六</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 高级设置 */}
      <Card size="small" title={
        <Space>
          <CalendarOutlined />
          <span>高级设置</span>
        </Space>
      }>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="due_date" label="截止日期">
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="选择截止日期（可选）"
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="is_template" label="设为模板" valuePropName="checked">
              <Switch 
                checkedChildren="是" 
                unCheckedChildren="否"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Form>
  );

  // Modal模式
  if (mode === 'modal') {
    return (
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>编辑文档属性</span>
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        width={800}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={saving || loading}
            onClick={handleSave}
            icon={<SaveOutlined />}
          >
            保存属性
          </Button>
        ]}
        destroyOnClose
      >
        {renderFormContent()}
      </Modal>
    );
  }

  // Inline模式
  return (
    <div>
      {renderFormContent()}
      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
          <Button 
            type="primary" 
            loading={saving || loading}
            onClick={handleSave}
            icon={<SaveOutlined />}
          >
            保存属性
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default DocumentPropertyEditor;