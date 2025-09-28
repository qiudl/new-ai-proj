import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Row,
  Col,
  Card,
  Tag,
  TreeSelect,
  Divider,
  Spin,
  message,
  Tabs,
  Collapse
} from 'antd';
import { FormInstance } from 'antd/es/form';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  RoleTemplate,
  TemplateCategory,
  CreateRoleTemplateRequest,
  UpdateRoleTemplateRequest,
  CloneTemplateRequest
} from '../types/roleTemplate';
import roleTemplateService from '../services/roleTemplateService';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface RoleTemplateFormProps {
  form: FormInstance;
  mode: 'create' | 'edit' | 'clone';
  initialData?: RoleTemplate | null;
  onSubmit: (values: CreateRoleTemplateRequest | UpdateRoleTemplateRequest | CloneTemplateRequest) => void;
  onCancel: () => void;
}

const RoleTemplateForm: React.FC<RoleTemplateFormProps> = ({
  form,
  mode,
  initialData,
  onSubmit,
  onCancel
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<RoleTemplate[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [industriesAndDepartments, setIndustriesAndDepartments] = useState<{
    industries: string[];
    departments: string[];
  }>({ industries: [], departments: [] });

  // 动态配置字段
  const [configurationFields, setConfigurationFields] = useState<Array<{
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'array';
  }>>([]);

  const [metadataFields, setMetadataFields] = useState<Array<{
    key: string;
    value: any;
  }>>([]);

  // 加载初始数据
  useEffect(() => {
    loadFormData();
  }, []);

  // 当初始数据变化时，更新动态字段
  useEffect(() => {
    if (initialData) {
      // 处理configuration字段
      if (initialData.configuration) {
        const configFields = Object.entries(initialData.configuration).map(([key, value]) => ({
          key,
          value,
          type: typeof value as 'string' | 'number' | 'boolean' | 'array'
        }));
        setConfigurationFields(configFields);
      }

      // 处理metadata字段
      if (initialData.metadata) {
        const metaFields = Object.entries(initialData.metadata).map(([key, value]) => ({
          key,
          value
        }));
        setMetadataFields(metaFields);
      }
    }
  }, [initialData]);

  // 加载表单数据
  const loadFormData = async () => {
    setLoading(true);
    try {
      const [templatesRes, tagsRes, industriesRes] = await Promise.all([
        roleTemplateService.getRoleTemplates({ page_size: 100 }),
        roleTemplateService.getAvailableTags(),
        roleTemplateService.getIndustriesAndDepartments()
      ]);

      if (templatesRes.success && templatesRes.data) {
        setAvailableTemplates(templatesRes.data.templates);
      }

      setAvailableTags(tagsRes.tags || []);
      setIndustriesAndDepartments(industriesRes);

    } catch (error: any) {
      message.error('加载表单数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 表单提交处理
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理configuration字段
      const configuration: Record<string, any> = {};
      configurationFields.forEach(field => {
        if (field.key && field.value !== undefined && field.value !== '') {
          configuration[field.key] = field.value;
        }
      });

      // 处理metadata字段
      const metadata: Record<string, any> = {};
      metadataFields.forEach(field => {
        if (field.key && field.value !== undefined && field.value !== '') {
          metadata[field.key] = field.value;
        }
      });

      // 构建提交数据
      const submitData = {
        ...values,
        configuration: Object.keys(configuration).length > 0 ? configuration : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };

      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 添加配置字段
  const addConfigurationField = () => {
    setConfigurationFields(prev => [...prev, { key: '', value: '', type: 'string' }]);
  };

  // 移除配置字段
  const removeConfigurationField = (index: number) => {
    setConfigurationFields(prev => prev.filter((_, i) => i !== index));
  };

  // 更新配置字段
  const updateConfigurationField = (index: number, field: 'key' | 'value' | 'type', value: any) => {
    setConfigurationFields(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 添加元数据字段
  const addMetadataField = () => {
    setMetadataFields(prev => [...prev, { key: '', value: '' }]);
  };

  // 移除元数据字段
  const removeMetadataField = (index: number) => {
    setMetadataFields(prev => prev.filter((_, i) => i !== index));
  };

  // 更新元数据字段
  const updateMetadataField = (index: number, field: 'key' | 'value', value: any) => {
    setMetadataFields(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 获取父模板选项（排除自身）
  const getParentTemplateOptions = () => {
    return availableTemplates
      .filter(template => !initialData || template.id !== initialData.id)
      .map(template => ({
        label: `${template.template_name} (${template.template_code})`,
        value: template.id,
        disabled: template.level >= (form.getFieldValue('level') || 1)
      }));
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 50 }} />;
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        category: 'custom',
        level: 3,
        is_active: true,
        ...initialData
      }}
    >
      <Tabs defaultActiveKey="basic">
        <TabPane tab="基本信息" key="basic">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="模板代码"
                name="template_code"
                rules={[
                  { required: true, message: '请输入模板代码' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' }
                ]}
              >
                <Input 
                  placeholder="输入模板代码" 
                  disabled={mode === 'edit'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="模板名称"
                name="template_name"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="输入模板名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="模板描述"
            name="template_description"
          >
            <TextArea rows={3} placeholder="输入模板描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="模板分类"
                name="category"
                rules={[{ required: true, message: '请选择模板分类' }]}
              >
                <Select placeholder="选择分类">
                  <Option value="system">系统模板</Option>
                  <Option value="business">业务模板</Option>
                  <Option value="custom">自定义模板</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="模板级别"
                name="level"
                rules={[{ required: true, message: '请选择模板级别' }]}
              >
                <Select placeholder="选择级别">
                  <Option value={1}>L1 - 高级权限</Option>
                  <Option value={2}>L2 - 中级权限</Option>
                  <Option value={3}>L3 - 基础权限</Option>
                  <Option value={4}>L4 - 受限权限</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="父模板"
                name="parent_template_id"
              >
                <TreeSelect
                  placeholder="选择父模板"
                  allowClear
                  treeData={getParentTemplateOptions()}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="适用行业"
                name="industry"
              >
                <Select 
                  placeholder="选择行业" 
                  allowClear 
                  showSearch
                  mode="tags"
                >
                  {industriesAndDepartments.industries.map(industry => (
                    <Option key={industry} value={industry}>{industry}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="适用部门"
                name="department"
              >
                <Select 
                  placeholder="选择部门" 
                  allowClear 
                  showSearch
                  mode="tags"
                >
                  {industriesAndDepartments.departments.map(department => (
                    <Option key={department} value={department}>{department}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="模板标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="输入或选择标签"
              style={{ width: '100%' }}
            >
              {availableTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>

          {mode !== 'create' && (
            <Form.Item
              label="激活状态"
              name="is_active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}
        </TabPane>

        <TabPane tab="高级配置" key="advanced">
          <Collapse>
            <Panel header="模板配置" key="configuration">
              <Space direction="vertical" style={{ width: '100%' }}>
                {configurationFields.map((field, index) => (
                  <Row key={index} gutter={8} align="middle">
                    <Col span={8}>
                      <Input
                        placeholder="配置键"
                        value={field.key}
                        onChange={(e) => updateConfigurationField(index, 'key', e.target.value)}
                      />
                    </Col>
                    <Col span={6}>
                      <Select
                        value={field.type}
                        onChange={(value) => updateConfigurationField(index, 'type', value)}
                      >
                        <Option value="string">字符串</Option>
                        <Option value="number">数字</Option>
                        <Option value="boolean">布尔值</Option>
                        <Option value="array">数组</Option>
                      </Select>
                    </Col>
                    <Col span={8}>
                      {field.type === 'boolean' ? (
                        <Switch
                          checked={field.value}
                          onChange={(value) => updateConfigurationField(index, 'value', value)}
                        />
                      ) : field.type === 'number' ? (
                        <Input
                          type="number"
                          placeholder="配置值"
                          value={field.value}
                          onChange={(e) => updateConfigurationField(index, 'value', Number(e.target.value))}
                        />
                      ) : (
                        <Input
                          placeholder="配置值"
                          value={field.value}
                          onChange={(e) => updateConfigurationField(index, 'value', e.target.value)}
                        />
                      )}
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeConfigurationField(index)}
                      />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addConfigurationField}>
                  添加配置项
                </Button>
              </Space>
            </Panel>

            <Panel header="元数据" key="metadata">
              <Space direction="vertical" style={{ width: '100%' }}>
                {metadataFields.map((field, index) => (
                  <Row key={index} gutter={8} align="middle">
                    <Col span={10}>
                      <Input
                        placeholder="元数据键"
                        value={field.key}
                        onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                      />
                    </Col>
                    <Col span={12}>
                      <Input
                        placeholder="元数据值"
                        value={field.value}
                        onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                      />
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeMetadataField(index)}
                      />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addMetadataField}>
                  添加元数据
                </Button>
              </Space>
            </Panel>
          </Collapse>
        </TabPane>
      </Tabs>

      <Divider />

      <Row justify="end">
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit">
            {mode === 'create' ? '创建' : mode === 'edit' ? '更新' : '克隆'}
          </Button>
        </Space>
      </Row>
    </Form>
  );
};

export default RoleTemplateForm;