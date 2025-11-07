/**
 * 需求表单页面（创建/编辑）
 * Requirement Form Page (Create/Edit)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Form,
  message,
  Row,
  Col,
  Input,
  Select,
  Divider,
  DatePicker,
  Upload,
  Spin,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  EditOutlined,
  UploadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { requirementApi } from '../services/requirementService';
import { projectService } from '../services/projectService';
import enterpriseService, { Enterprise } from '../services/enterpriseService';
import { getCurrentUser, isSystemAdmin } from '../utils/userUtils';
import {
  CreateRequirementRequest,
  UpdateRequirementRequest,
  RequirementPriority,
  REQUIREMENT_PRIORITY_CONFIG,
  Attachment,
} from '../types/requirement';
import { Project } from '../types/project';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

/**
 * 需求表单页面组件
 */
const RequirementFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const isEditMode = !!id;
  const currentUser = getCurrentUser();
  const isSystemAdminUser = isSystemAdmin(currentUser);

  /**
   * 加载项目列表
   */
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectService.getProjects({ page: 1, pageSize: 100 });
        setProjects(response.data || []);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  /**
   * 加载企业列表（仅系统管理员需要）
   */
  useEffect(() => {
    if (isSystemAdminUser && !isEditMode) {
      const loadEnterprises = async () => {
        try {
          const response = await enterpriseService.getEnterprises(1, 100);
          setEnterprises(response.data || []);
        } catch (error) {
          console.error('Error loading enterprises:', error);
        }
      };
      loadEnterprises();
    }
  }, [isSystemAdminUser, isEditMode]);

  /**
   * 加载需求详情（编辑模式）
   */
  useEffect(() => {
    if (isEditMode && id) {
      const loadRequirement = async () => {
        try {
          setLoading(true);
          const requirement = await requirementApi.getRequirement(parseInt(id));

          // 填充表单
          form.setFieldsValue({
            title: requirement.title,
            description: requirement.description,
            project_id: requirement.project_id,
            priority: requirement.priority,
            category: requirement.category,
            business_value: requirement.business_value,
            expected_outcome: requirement.expected_outcome,
            acceptance_criteria: requirement.acceptance_criteria,
            due_date: requirement.due_date ? dayjs(requirement.due_date) : undefined,
          });

          // 处理附件
          if (requirement.attachments && requirement.attachments.length > 0) {
            const files: UploadFile[] = requirement.attachments.map((att, index) => ({
              uid: `${index}`,
              name: att.name,
              status: 'done',
              url: att.url,
              size: att.size,
              type: att.type,
            }));
            setFileList(files);
          }
        } catch (error: any) {
          console.error('Error loading requirement:', error);
          message.error(error?.message || '加载需求详情失败');
          navigate('/requirements');
        } finally {
          setLoading(false);
        }
      };
      loadRequirement();
    }
  }, [isEditMode, id, form, navigate]);

  /**
   * 处理表单提交
   */
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // 处理附件
      const attachments: Attachment[] = fileList.map((file) => ({
        name: file.name,
        url: file.url || file.response?.url || '',
        size: file.size || 0,
        type: file.type || '',
      }));

      if (isEditMode && id) {
        // 编辑模式
        const updateData: UpdateRequirementRequest = {
          title: values.title,
          description: values.description,
          project_id: values.project_id,
          priority: values.priority,
          category: values.category,
          business_value: values.business_value,
          expected_outcome: values.expected_outcome,
          acceptance_criteria: values.acceptance_criteria,
          attachments: attachments.length > 0 ? attachments : undefined,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
        };

        await requirementApi.updateRequirement(parseInt(id), updateData);
        message.success('需求更新成功！');
        navigate(`/requirements/${id}`);
      } else {
        // 创建模式
        const createData: CreateRequirementRequest = {
          title: values.title,
          description: values.description,
          project_id: values.project_id,
          enterprise_id: values.enterprise_id, // 系统管理员需要指定企业ID
          priority: values.priority || RequirementPriority.Medium,
          category: values.category,
          business_value: values.business_value,
          expected_outcome: values.expected_outcome,
          acceptance_criteria: values.acceptance_criteria,
          attachments: attachments.length > 0 ? attachments : undefined,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
        };

        const newRequirement = await requirementApi.createRequirement(createData);
        message.success('需求创建成功！');
        navigate(`/requirements/${newRequirement.id}`);
      }
    } catch (error: any) {
      console.error('Error submitting requirement:', error);
      message.error(error?.message || (isEditMode ? '更新需求失败' : '创建需求失败'));
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 处理重置
   */
  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    message.info('表单已重置');
  };

  /**
   * 处理取消
   */
  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/requirements/${id}`);
    } else {
      navigate('/requirements');
    }
  };

  /**
   * 处理文件上传变更
   */
  const handleUploadChange = (info: any) => {
    let newFileList = [...info.fileList];

    // 限制文件数量
    newFileList = newFileList.slice(-10);

    setFileList(newFileList);

    if (info.file.status === 'done') {
      message.success(`${info.file.name} 文件上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 文件上传失败`);
    }
  };

  /**
   * 自定义上传
   */
  const customUpload = ({ file, onSuccess, onError }: any) => {
    // TODO: 实现实际的文件上传逻辑
    // 这里使用模拟上传
    setTimeout(() => {
      const mockUrl = `https://example.com/files/${file.name}`;
      onSuccess({ url: mockUrl }, file);
    }, 1000);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleCancel} style={{ marginRight: '16px' }}>
              返回
            </Button>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                {isEditMode ? (
                  <>
                    <EditOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    编辑需求
                  </>
                ) : (
                  <>
                    <PlusOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                    创建需求
                  </>
                )}
              </Title>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                {isEditMode ? '修改需求信息' : '填写需求基本信息'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 表单内容 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: RequirementPriority.Medium,
          }}
        >
          <Row gutter={24}>
            {/* 基本信息 */}
            <Col span={24}>
              <Divider orientation="left">基本信息</Divider>
            </Col>

            <Col span={24}>
              <Form.Item
                label="需求标题"
                name="title"
                rules={[
                  { required: true, message: '请输入需求标题' },
                  { min: 1, max: 500, message: '标题长度应在1-500字符之间' },
                ]}
              >
                <Input placeholder="请输入需求标题" maxLength={500} showCount />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="需求描述" name="description">
                <TextArea
                  rows={4}
                  placeholder="请输入需求详细描述（可选）"
                  maxLength={5000}
                  showCount
                />
              </Form.Item>
            </Col>

            {/* 关联和分类 */}
            <Col span={24}>
              <Divider orientation="left">关联和分类</Divider>
            </Col>

            {/* 企业选择（仅系统管理员创建时可见） */}
            {isSystemAdminUser && !isEditMode && (
              <Col span={12}>
                <Form.Item
                  label="所属企业"
                  name="enterprise_id"
                  rules={[{ required: true, message: '系统管理员创建需求时必须选择企业' }]}
                  tooltip="系统管理员创建需求时需要指定所属企业"
                >
                  <Select
                    placeholder="请选择企业"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
                      (option?.children as unknown as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {enterprises.map((enterprise) => (
                      <Option key={enterprise.id} value={enterprise.id}>
                        {enterprise.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}

            <Col span={12}>
              <Form.Item label="关联项目" name="project_id">
                <Select placeholder="请选择关联项目（可选）" allowClear showSearch optionFilterProp="children">
                  {projects.map((project) => (
                    <Option key={project.id} value={project.id}>
                      {project.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="需求分类" name="category">
                <Select placeholder="请选择需求分类（可选）" allowClear>
                  <Option value="feature">功能需求</Option>
                  <Option value="bug">缺陷修复</Option>
                  <Option value="improvement">功能改进</Option>
                  <Option value="performance">性能优化</Option>
                  <Option value="security">安全需求</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  {Object.entries(REQUIREMENT_PRIORITY_CONFIG).map(([key, config]) => (
                    <Option key={key} value={key}>
                      {config.icon} {config.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="截止日期" name="due_date">
                <DatePicker style={{ width: '100%' }} placeholder="请选择截止日期（可选）" />
              </Form.Item>
            </Col>

            {/* 业务信息 */}
            <Col span={24}>
              <Divider orientation="left">业务信息</Divider>
            </Col>

            <Col span={24}>
              <Form.Item label="商业价值" name="business_value">
                <TextArea
                  rows={3}
                  placeholder="描述该需求的商业价值和预期收益（可选）"
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="预期结果" name="expected_outcome">
                <TextArea
                  rows={3}
                  placeholder="描述该需求的预期结果和目标（可选）"
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="验收标准" name="acceptance_criteria">
                <TextArea
                  rows={4}
                  placeholder="定义该需求的验收标准，建议使用清单格式（可选）"
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Col>

            {/* 附件 */}
            <Col span={24}>
              <Divider orientation="left">附件</Divider>
            </Col>

            <Col span={24}>
              <Form.Item label="上传附件" name="attachments">
                <Dragger
                  multiple
                  fileList={fileList}
                  onChange={handleUploadChange}
                  customRequest={customUpload}
                  beforeUpload={(file) => {
                    const isLt10M = file.size / 1024 / 1024 < 10;
                    if (!isLt10M) {
                      message.error('文件大小不能超过10MB!');
                    }
                    return isLt10M;
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">支持单个或批量上传，单个文件不超过10MB</p>
                </Dragger>
              </Form.Item>
            </Col>
          </Row>

          {/* 表单操作按钮 */}
          <Row gutter={16} style={{ marginTop: '24px' }}>
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                {isEditMode ? '保存修改' : '创建需求'}
              </Button>
            </Col>
            <Col>
              <Button onClick={handleReset} disabled={submitting}>
                重置
              </Button>
            </Col>
            <Col>
              <Button onClick={handleCancel} disabled={submitting}>
                取消
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default RequirementFormPage;
