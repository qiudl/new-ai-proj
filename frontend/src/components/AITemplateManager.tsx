import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  message,
  Typography,
  Row,
  Col,
  Badge,
  Tooltip,
  Popconfirm,
  Alert,
  Statistic,
  Empty,
  Switch,
  InputNumber
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  StarOutlined,
  GlobalOutlined,
  LockOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AIProvider } from '../types/ai';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface AITaskTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  templateText: string;
  taskPattern?: any;
  tags: string[];
  usageCount: number;
  createdBy: number;
  creatorName?: string;
  isPublic: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  templateText: string;
  tags: string[];
  isPublic: boolean;
}

/**
 * AI模板管理器组件
 * 提供模板创建、编辑、使用和管理功能
 */
const AITemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<AITaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPublicOnly, setShowPublicOnly] = useState<boolean | undefined>(undefined);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<AITaskTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<AITaskTemplate | null>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState<AITaskTemplate | null>(null);
  
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();

  const categories = [
    { value: 'development', label: '开发', color: 'blue' },
    { value: 'design', label: '设计', color: 'purple' },
    { value: 'testing', label: '测试', color: 'green' },
    { value: 'documentation', label: '文档', color: 'orange' },
    { value: 'marketing', label: '营销', color: 'red' },
    { value: 'analysis', label: '分析', color: 'cyan' }
  ];

  const aiProviders = [
    { value: 'openai', label: 'OpenAI GPT' },
    { value: 'claude', label: 'Claude' },
    { value: 'deepseek', label: 'DeepSeek' }
  ];

  useEffect(() => {
    loadTemplates();
  }, [current, pageSize, searchText, selectedCategory, selectedTags, showPublicOnly]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pageSize,
        offset: (current - 1) * pageSize,
        category: selectedCategory,
        tags: selectedTags,
        is_public: showPublicOnly
      };

      const queryParams = new URLSearchParams({
        limit: params.limit.toString(),
        offset: params.offset.toString(),
        ...(params.category && { category: params.category }),
        ...(params.is_public !== undefined && { is_public: params.is_public.toString() })
      });
      if (params.tags.length > 0) {
        queryParams.append('tags', params.tags.join(','));
      }
      const response = await aiTaskGeneratorService.getTemplates(queryParams.toString());
      
      if (response.success) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      } else {
        message.error('加载模板失败');
      }
    } catch (error: any) {
      message.error('加载模板失败: ' + (error?.message || '未知错误'));
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (values: TemplateFormData) => {
    try {
      const response = await aiTaskGeneratorService.createTemplate(values);
      
      if (response.success) {
        message.success('模板创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadTemplates();
      } else {
        message.error('模板创建失败');
      }
    } catch (error: any) {
      message.error('模板创建失败: ' + (error?.message || '未知错误'));
      console.error('Failed to create template:', error);
    }
  };

  const handleEditTemplate = async (values: TemplateFormData) => {
    if (!editingTemplate) return;

    try {
      const response = await aiTaskGeneratorService.updateTemplate(editingTemplate.id, values);
      
      if (response.success) {
        message.success('模板更新成功');
        setEditModalVisible(false);
        setEditingTemplate(null);
        form.resetFields();
        loadTemplates();
      } else {
        message.error('模板更新失败');
      }
    } catch (error: any) {
      message.error('模板更新失败: ' + (error?.message || '未知错误'));
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      const response = await aiTaskGeneratorService.deleteTemplate(templateId);
      
      if (response.success) {
        message.success('模板删除成功');
        loadTemplates();
      } else {
        message.error('模板删除失败');
      }
    } catch (error: any) {
      message.error('模板删除失败: ' + (error?.message || '未知错误'));
      console.error('Failed to delete template:', error);
    }
  };

  const handleDuplicateTemplate = async (template: AITaskTemplate) => {
    try {
      const duplicateData = {
        name: `${template.name} (副本)`,
        description: template.description,
        category: template.category,
        templateText: template.templateText,
        tags: template.tags,
        isPublic: false
      };

      const response = await aiTaskGeneratorService.createTemplate(duplicateData);
      
      if (response.success) {
        message.success('模板复制成功');
        loadTemplates();
      } else {
        message.error('模板复制失败');
      }
    } catch (error: any) {
      message.error('模板复制失败: ' + (error?.message || '未知错误'));
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleGenerateFromTemplate = async (values: any) => {
    if (!generatingTemplate) return;

    try {
      const request = {
        templateId: generatingTemplate.id,
        provider: values.provider as AIProvider,
        variables: values.variables || {},
        projectId: values.projectId,
        options: {
          maxTasks: values.maxTasks || 10,
          enableDuplicateCheck: true,
          enableDependencyAnalysis: true,
          enablePriorityAssignment: true,
          enableTimeEstimation: true
        }
      };

      const response = await aiTaskGeneratorService.generateFromTemplate(request);
      
      if (response.success) {
        message.success('基于模板生成任务成功');
        setGenerateModalVisible(false);
        setGeneratingTemplate(null);
        generateForm.resetFields();
        // 这里可以跳转到任务列表或显示生成的任务
      } else {
        message.error('基于模板生成任务失败');
      }
    } catch (error: any) {
      message.error('基于模板生成任务失败: ' + (error?.message || '未知错误'));
      console.error('Failed to generate from template:', error);
    }
  };

  const openEditModal = (template: AITaskTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      category: template.category,
      templateText: template.templateText,
      tags: template.tags,
      isPublic: template.isPublic
    });
    setEditModalVisible(true);
  };

  const openPreviewModal = (template: AITaskTemplate) => {
    setPreviewTemplate(template);
    setPreviewModalVisible(true);
  };

  const openGenerateModal = (template: AITaskTemplate) => {
    setGeneratingTemplate(template);
    setGenerateModalVisible(true);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || { label: category, color: 'default' };
  };

  const extractVariables = (templateText: string): string[] => {
    const matches = templateText.match(/\{\{\.(\w+)\}\}/g);
    return matches ? matches.map(match => match.replace(/\{\{\.(\w+)\}\}/, '$1')) : [];
  };

  const columns: ColumnsType<AITaskTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: AITaskTemplate) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => {
        const categoryInfo = getCategoryInfo(category);
        return <Tag color={categoryInfo.color}>{categoryInfo.label}</Tag>;
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space wrap>
          {tags.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record: AITaskTemplate) => (
        <Space>
          {record.isPublic ? (
            <Tooltip title="公开模板">
              <GlobalOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          ) : (
            <Tooltip title="私有模板">
              <LockOutlined style={{ color: '#d9d9d9' }} />
            </Tooltip>
          )}
          {record.usageCount > 10 && (
            <Tooltip title="热门模板">
              <StarOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: AITaskTemplate) => (
        <Space wrap>
          <Tooltip title="预览">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openPreviewModal(record)}
            />
          </Tooltip>
          <Tooltip title="基于模板生成">
            <Button
              type="text"
              icon={<ThunderboltOutlined />}
              onClick={() => openGenerateModal(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateTemplate(record)}
            />
          </Tooltip>
          {record.canEdit && (
            <>
              <Tooltip title="编辑">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(record)}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Popconfirm
                  title="确定要删除这个模板吗？"
                  onConfirm={() => handleDeleteTemplate(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 头部统计和操作 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card >
            <Statistic
              title="总模板数"
              value={total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card >
            <Statistic
              title="公开模板"
              value={templates.filter(t => t.isPublic).length}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card >
            <Statistic
              title="我的模板"
              value={templates.filter(t => t.canEdit).length}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card >
            <Statistic
              title="热门模板"
              value={templates.filter(t => t.usageCount > 10).length}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card  style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="搜索模板名称或描述"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="选择分类"
              value={selectedCategory}
              onChange={setSelectedCategory}
              allowClear
              style={{ width: '100%' }}
            >
              {categories.map(category => (
                <Option key={category.value} value={category.value}>
                  <Tag color={category.color}>{category.label}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="模板类型"
              value={showPublicOnly}
              onChange={setShowPublicOnly}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value={true}>公开模板</Option>
              <Option value={false}>私有模板</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建模板
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={loadTemplates}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 模板列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size || 10);
            }
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无模板数据"
              >
                <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                  创建第一个模板
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* 创建模板模态框 */}
      <Modal
        title="创建AI任务模板"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTemplate}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="输入模板名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  {categories.map(category => (
                    <Option key={category.value} value={category.value}>
                      <Tag color={category.color}>{category.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={2}
              placeholder="描述模板的用途和特点"
            />
          </Form.Item>

          <Form.Item
            name="templateText"
            label="模板内容"
            rules={[{ required: true, message: '请输入模板内容' }]}
          >
            <TextArea
              rows={8}
              placeholder={`输入模板内容，使用 {{.变量名}} 的格式定义变量\\n\\n例如：为 {{.projectName}} 项目创建一个 {{.projectType}} 应用，包含 {{.features}} 功能。`}
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isPublic"
                label="可见性"
                valuePropName="checked"
                initialValue={false}
              >
                <Space>
                  <Switch />
                  <Text>公开模板（其他用户可见）</Text>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建模板
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑模板模态框 */}
      <Modal
        title="编辑AI任务模板"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditTemplate}
        >
          {/* 与创建模板相同的表单字段 */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="输入模板名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  {categories.map(category => (
                    <Option key={category.value} value={category.value}>
                      <Tag color={category.color}>{category.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={2}
              placeholder="描述模板的用途和特点"
            />
          </Form.Item>

          <Form.Item
            name="templateText"
            label="模板内容"
            rules={[{ required: true, message: '请输入模板内容' }]}
          >
            <TextArea
              rows={8}
              placeholder={`输入模板内容，使用 {{.变量名}} 的格式定义变量`}
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isPublic"
                label="可见性"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <Text>公开模板（其他用户可见）</Text>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存修改
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingTemplate(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板预览模态框 */}
      <Modal
        title="模板预览"
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setPreviewTemplate(null);
        }}
        footer={
          previewTemplate && (
            <Space>
              <Button onClick={() => openGenerateModal(previewTemplate)}>
                基于此模板生成
              </Button>
              <Button onClick={() => {
                setPreviewModalVisible(false);
                setPreviewTemplate(null);
              }}>
                关闭
              </Button>
            </Space>
          )
        }
        width={700}
      >
        {previewTemplate && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>名称：</Text>{previewTemplate.name}
              </Col>
              <Col span={12}>
                <Text strong>分类：</Text>
                <Tag color={getCategoryInfo(previewTemplate.category).color}>
                  {getCategoryInfo(previewTemplate.category).label}
                </Tag>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={24}>
                <Text strong>描述：</Text>
                <br />
                <Text>{previewTemplate.description}</Text>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={24}>
                <Text strong>标签：</Text>
                <br />
                <Space wrap>
                  {previewTemplate.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={24}>
                <Text strong>模板内容：</Text>
                <br />
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {previewTemplate.templateText}
                </div>
              </Col>
            </Row>

            {extractVariables(previewTemplate.templateText).length > 0 && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>包含变量：</Text>
                  <br />
                  <Space wrap>
                    {extractVariables(previewTemplate.templateText).map(variable => (
                      <Tag key={variable} color="blue">{variable}</Tag>
                    ))}
                  </Space>
                </Col>
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* 基于模板生成任务模态框 */}
      <Modal
        title="基于模板生成任务"
        open={generateModalVisible}
        onCancel={() => {
          setGenerateModalVisible(false);
          setGeneratingTemplate(null);
          generateForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {generatingTemplate && (
          <Form
            form={generateForm}
            layout="vertical"
            onFinish={handleGenerateFromTemplate}
            initialValues={{
              provider: 'openai',
              maxTasks: 10
            }}
          >
            <Alert
              message={`使用模板：${generatingTemplate.name}`}
              type="info"
              style={{ marginBottom: '16px' }}
            />

            <Form.Item
              name="provider"
              label="AI服务提供商"
              rules={[{ required: true, message: '请选择AI服务提供商' }]}
            >
              <Select>
                {aiProviders.map(provider => (
                  <Option key={provider.value} value={provider.value}>
                    {provider.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {extractVariables(generatingTemplate.templateText).length > 0 && (
              <Card  title="模板变量" style={{ marginBottom: '16px' }}>
                {extractVariables(generatingTemplate.templateText).map(variable => (
                  <Form.Item
                    key={variable}
                    name={['variables', variable]}
                    label={variable}
                    rules={[{ required: true, message: `请输入${variable}` }]}
                  >
                    <Input placeholder={`输入${variable}的值`} />
                  </Form.Item>
                ))}
              </Card>
            )}

            <Form.Item
              name="maxTasks"
              label="最大任务数量"
            >
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  生成任务
                </Button>
                <Button onClick={() => {
                  setGenerateModalVisible(false);
                  setGeneratingTemplate(null);
                  generateForm.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AITemplateManager;