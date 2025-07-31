// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card, Form, Switch, Select, Input, Button, Space, message, 
  Divider, Typography, Alert, Row, Col, Tooltip, Tag, Modal
} from 'antd';
import {
  SettingOutlined, SaveOutlined, ReloadOutlined, InfoCircleOutlined,
  FolderOutlined, FileTextOutlined, ExperimentOutlined, BulbOutlined
} from '@ant-design/icons';
import { TaskDocumentMVP2Service, ProjectDocumentConfig, DocumentTemplate } from '../services/taskDocumentMVP2Service';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ProjectDocumentConfigProps {
  projectId: number;
  projectName?: string;
}

const ProjectDocumentConfigComponent: React.FC<ProjectDocumentConfigProps> = ({
  projectId,
  projectName
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ProjectDocumentConfig | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewPath, setPreviewPath] = useState('');

  // 加载配置和模板
  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, templatesData] = await Promise.all([
        TaskDocumentMVP2Service.getProjectDocumentConfig(projectId),
        TaskDocumentMVP2Service.listDocumentTemplates()
      ]);
      
      setConfig(configData);
      setTemplates(templatesData);
      
      // 设置表单值
      form.setFieldsValue({
        auto_create_enabled: configData.auto_create_enabled,
        template_name: configData.template_name,
        directory_structure: configData.directory_structure,
        file_naming_pattern: configData.file_naming_pattern,
        custom_path_pattern: configData.custom_path_pattern});
    } catch (error: any) {
      console.error('Failed to load configuration:', error);
      message.error('加载配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      await TaskDocumentMVP2Service.updateProjectDocumentConfig(projectId, values);
      
      message.success('配置保存成功');
      await loadData(); // 重新加载配置
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请检查表单输入');
        return;
      }
      console.error('Failed to save configuration:', error);
      message.error('保存配置失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 预览路径
  const generatePreviewPath = (values: any) => {
    const { directory_structure, file_naming_pattern, custom_path_pattern } = values;
    
    let dirPath = '';
    let fileName = '';
    
    switch (directory_structure) {
      case 'project_task':
        dirPath = `docs/tasks/${projectName || 'ProjectName'}/123/`;
        break;
      case 'flat':
        dirPath = 'docs/tasks/';
        break;
      case 'custom':
        dirPath = custom_path_pattern
          ?.replace('{project_id}', projectId.toString())
          ?.replace('{project_name}', projectName || 'ProjectName')
          ?.replace('{task_id}', '123')
          ?.replace('{task_title}', 'SampleTask') || 'docs/custom/';
        break;
      default:
        dirPath = `docs/tasks/${projectId}/123/`;
    }
    
    fileName = file_naming_pattern
      ?.replace('{task_id}', '123')
      ?.replace('{task_title}', 'SampleTask') || '123_SampleTask';
    
    if (!fileName.endsWith('.md')) {
      fileName += '.md';
    }
    
    return dirPath + fileName;
  };

  // 实时预览
  useEffect(() => {
    const subscription = form.getFieldsValue();
    setPreviewPath(generatePreviewPath(subscription));
  }, [form, projectId, projectName]);

  // 监听表单变化
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    setPreviewPath(generatePreviewPath(values));
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <Card loading={true}>
        <div style={{ height: '400px' }} />
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>项目文档配置</span>
            {projectName && <Tag color="blue">{projectName}</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
        >
          {/* 基础设置 */}
          <Title level={4}>基础设置</Title>
          
          <Form.Item
            name="auto_create_enabled"
            label={
              <Space>
                <span>自动创建文档</span>
                <Tooltip title="启用后，创建任务时会自动生成对应的文档文件">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
            }
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用"
            />
          </Form.Item>

          <Form.Item
            name="template_name"
            label="默认模板"
            rules={[{ required: true, message: '请选择默认模板' }]}
          >
            <Select placeholder="选择文档模板">
              {templates.map(template => (
                <Option key={template.name} value={template.name}>
                  <Space>
                    <span>{template.display_name}</span>
                    {template.is_system && (
                      <Tag color="green" style={{ fontSize: '12px' }}>系统</Tag>
                    )}
                  </Space>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {template.description}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          {/* 存储设置 */}
          <Title level={4}>存储设置</Title>
          
          <Form.Item
            name="directory_structure"
            label="目录结构"
            rules={[{ required: true, message: '请选择目录结构' }]}
          >
            <Select placeholder="选择目录结构">
              <Option value="project_task">
                <Space>
                  <FolderOutlined />
                  <span>项目-任务结构</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  docs/tasks/项目名/任务ID/
                </div>
              </Option>
              <Option value="flat">
                <Space>
                  <FileTextOutlined />
                  <span>平铺结构</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  docs/tasks/
                </div>
              </Option>
              <Option value="custom">
                <Space>
                  <ExperimentOutlined />
                  <span>自定义结构</span>
                </Space>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  使用自定义路径模式
                </div>
              </Option>
            </Select>
          </Form.Item>

          {/* 自定义路径模式 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.directory_structure !== currentValues.directory_structure
            }
          >
            {({ getFieldValue }) => {
              const directoryStructure = getFieldValue('directory_structure');
              
              if (directoryStructure === 'custom') {
                return (
                  <Form.Item
                    name="custom_path_pattern"
                    label="自定义路径模式"
                    rules={[
                      { required: true, message: '请输入自定义路径模式' }
                    ]}
                  >
                    <Input 
                      placeholder="例如: docs/{project_name}/{task_id}/"
                      suffix={
                        <Tooltip title="可用变量: {project_id}, {project_name}, {task_id}, {task_title}">
                          <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      }
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="file_naming_pattern"
            label="文件命名模式"
            rules={[{ required: true, message: '请输入文件命名模式' }]}
          >
            <Input 
              placeholder="例如: {task_id}_{task_title}"
              suffix={
                <Tooltip title="可用变量: {task_id}, {task_title}">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              }
            />
          </Form.Item>

          <Divider />

          {/* 预览 */}
          <Title level={4}>路径预览</Title>
          <Alert
            message="文档存储路径预览"
            description={
              <div>
                <Text code>{previewPath}</Text>
                <div style={{ marginTop: 8 }}>
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setPreviewModalVisible(true)}
                  >
                    查看详细说明
                  </Button>
                </div>
              </div>
            }
            type="info"
            icon={<BulbOutlined />}
          />
        </Form>
      </Card>

      {/* 预览模态框 */}
      <Modal
        title="路径配置说明"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title="可用变量">
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text code>{'{project_id}'}</Text> - 项目ID
              </Col>
              <Col span={12}>
                <Text code>{'{project_name}'}</Text> - 项目名称
              </Col>
              <Col span={12}>
                <Text code>{'{task_id}'}</Text> - 任务ID
              </Col>
              <Col span={12}>
                <Text code>{'{task_title}'}</Text> - 任务标题
              </Col>
            </Row>
          </Card>

          <Card size="small" title="示例配置">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>项目-任务结构：</Text>
                <br />
                <Text code>docs/tasks/我的项目/123/123_示例任务.md</Text>
              </div>
              <div>
                <Text strong>平铺结构：</Text>
                <br />
                <Text code>docs/tasks/123_示例任务.md</Text>
              </div>
              <div>
                <Text strong>自定义结构：</Text>
                <br />
                <Text code>docs/projects/{'{project_name}'}/tasks/{'{task_id}'}.md</Text>
                <br />
                <Text type="secondary">→ docs/projects/我的项目/tasks/123.md</Text>
              </div>
            </Space>
          </Card>

          <Alert
            message="注意事项"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>文件名会自动添加 .md 扩展名</li>
                <li>特殊字符会被替换为安全字符</li>
                <li>过长的名称会被截断（最大50字符）</li>
                <li>系统会自动创建必要的目录</li>
              </ul>
            }
            type="warning"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

export default ProjectDocumentConfigComponent;