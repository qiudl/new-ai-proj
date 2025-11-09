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
  Modal,
  Space,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  EditOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
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
import LexicalEditor from '../components/LexicalEditor';
import { uploadImage, validateImageFile, compressImage } from '../services/uploadService';
import { useAutoSave } from '../hooks/useAutoSave';
import RequirementTemplateSelector from '../components/RequirementTemplateSelector';
import { RequirementTemplate } from '../types/requirementTemplate';

const { Title } = Typography;
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
  const [descriptionContent, setDescriptionContent] = useState<string>('');
  const [businessValueContent, setBusinessValueContent] = useState<string>('');
  const [expectedOutcomeContent, setExpectedOutcomeContent] = useState<string>('');
  const [acceptanceCriteriaContent, setAcceptanceCriteriaContent] = useState<string>('');
  const [templateSelectorVisible, setTemplateSelectorVisible] = useState(false);

  const isEditMode = !!id;
  const currentUser = getCurrentUser();
  const isSystemAdminUser = isSystemAdmin(currentUser);

  // 自动保存功能
  const getDraftKey = () => {
    return isEditMode && id
      ? `requirement_draft_edit_${id}`
      : 'requirement_draft_new';
  };

  // 收集表单数据用于自动保存
  const getFormDataForDraft = () => {
    const formValues = form.getFieldsValue();
    return {
      ...formValues,
      description: descriptionContent,
      business_value: businessValueContent,
      expected_outcome: expectedOutcomeContent,
      acceptance_criteria: acceptanceCriteriaContent,
      attachments: fileList,
      due_date: formValues.due_date ? formValues.due_date.format('YYYY-MM-DD') : undefined,
    };
  };

  // 使用自动保存 hook
  const {
    status: autoSaveStatus,
    manualSave,
    loadDraft,
    clearDraft,
    checkDraft,
  } = useAutoSave({
    key: getDraftKey(),
    data: getFormDataForDraft(),
    interval: 30000, // 30秒自动保存
    debounceDelay: 2000, // 2秒防抖
    enabled: !submitting && !loading, // 提交或加载时禁用自动保存
    onSave: () => {
      // 保存成功的静默处理，不显示消息以避免干扰用户
      console.log('Draft auto-saved at', new Date().toLocaleTimeString());
    },
    onError: (error) => {
      console.error('Auto-save error:', error);
    },
  });

  /**
   * 检查并提示恢复草稿
   */
  useEffect(() => {
    // 只在非编辑模式或编辑模式初次加载后检查草稿
    const checkAndRestoreDraft = async () => {
      const hasDraft = checkDraft();
      if (hasDraft) {
        Modal.confirm({
          title: '发现未保存的草稿',
          content: '是否恢复之前未保存的内容？',
          okText: '恢复',
          cancelText: '放弃',
          onOk: () => {
            const draft = loadDraft();
            if (draft) {
              // 恢复表单值
              form.setFieldsValue({
                ...draft,
                due_date: draft.due_date ? dayjs(draft.due_date) : undefined,
              });

              // 恢复富文本编辑器内容
              if (draft.description) setDescriptionContent(draft.description);
              if (draft.business_value) setBusinessValueContent(draft.business_value);
              if (draft.expected_outcome) setExpectedOutcomeContent(draft.expected_outcome);
              if (draft.acceptance_criteria) setAcceptanceCriteriaContent(draft.acceptance_criteria);

              // 恢复附件
              if (draft.attachments) setFileList(draft.attachments);

              message.success('草稿已恢复');
            }
          },
          onCancel: () => {
            clearDraft();
            message.info('已放弃草稿');
          },
        });
      }
    };

    // 延迟执行以确保表单已经初始化
    const timer = setTimeout(() => {
      if (!loading) {
        checkAndRestoreDraft();
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

          // 设置富文本编辑器内容
          if (requirement.description) {
            setDescriptionContent(requirement.description);
          }
          if (requirement.business_value) {
            setBusinessValueContent(requirement.business_value);
          }
          if (requirement.expected_outcome) {
            setExpectedOutcomeContent(requirement.expected_outcome);
          }
          if (requirement.acceptance_criteria) {
            setAcceptanceCriteriaContent(requirement.acceptance_criteria);
          }

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
        clearDraft(); // 成功提交后清除草稿
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
        clearDraft(); // 成功提交后清除草稿
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
    setDescriptionContent('');
    setBusinessValueContent('');
    setExpectedOutcomeContent('');
    setAcceptanceCriteriaContent('');
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
   * 应用模板
   */
  const handleTemplateSelect = (template: RequirementTemplate) => {
    Modal.confirm({
      title: '应用模板',
      content: `确定要应用"${template.name}"模板吗？当前填写的内容将被替换。`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        // 应用模板字段到表单
        const templateFields = template.fields;

        form.setFieldsValue({
          title: templateFields.title || '',
          priority: templateFields.priority || RequirementPriority.Medium,
          category: templateFields.category || '',
        });

        // 应用富文本内容
        if (templateFields.description) {
          setDescriptionContent(templateFields.description);
          form.setFieldValue('description', templateFields.description);
        }

        if (templateFields.business_value) {
          setBusinessValueContent(templateFields.business_value);
          form.setFieldValue('business_value', templateFields.business_value);
        }

        if (templateFields.expected_outcome) {
          setExpectedOutcomeContent(templateFields.expected_outcome);
          form.setFieldValue('expected_outcome', templateFields.expected_outcome);
        }

        if (templateFields.acceptance_criteria) {
          setAcceptanceCriteriaContent(templateFields.acceptance_criteria);
          form.setFieldValue('acceptance_criteria', templateFields.acceptance_criteria);
        }

        setTemplateSelectorVisible(false);
        message.success(`已应用"${template.name}"模板`);
      },
    });
  };

  /**
   * 处理图片上传（用于富文本编辑器）
   */
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      // 验证文件
      const validation = validateImageFile(file);
      if (!validation.valid) {
        message.error(validation.error);
        throw new Error(validation.error);
      }

      // 压缩图片（如果文件大于1MB）
      let uploadFile = file;
      if (file.size > 1024 * 1024) {
        message.info('正在压缩图片...');
        const compressedBlob = await compressImage(file);
        uploadFile = new File([compressedBlob], file.name, { type: file.type });
      }

      // 上传图片
      message.loading({ content: '正在上传图片...', key: 'upload' });
      const imageUrl = await uploadImage(uploadFile);
      message.success({ content: '图片上传成功！', key: 'upload' });

      // 返回完整URL
      return `${window.location.origin}${imageUrl}`;
    } catch (error: any) {
      // 不显示错误消息,因为会降级到本地预览
      message.destroy('upload');
      // 重新抛出错误,让调用方处理降级
      throw error;
    }
  };

  /**
   * 自定义上传（用于附件）
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

          {/* 操作按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isEditMode && (
              <Button
                type="dashed"
                icon={<FileTextOutlined />}
                onClick={() => setTemplateSelectorVisible(true)}
              >
                使用模板
              </Button>
            )}

            {/* 自动保存状态指示 */}
            <Space>
              <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                {autoSaveStatus.isSaving ? (
                  '保存中...'
                ) : autoSaveStatus.lastSaved ? (
                  `上次保存: ${autoSaveStatus.lastSaved.toLocaleTimeString()}`
                ) : (
                  '自动保存已启用'
                )}
              </span>
            </Space>
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
                <LexicalEditor
                  value={descriptionContent}
                  onChange={(value) => {
                    setDescriptionContent(value);
                    form.setFieldValue('description', value);
                  }}
                  onUploadImage={handleImageUpload}
                  placeholder="请输入需求详细描述（可选）"
                  minHeight={200}
                  maxHeight={600}
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
                <LexicalEditor
                  value={businessValueContent}
                  onChange={(value) => {
                    setBusinessValueContent(value);
                    form.setFieldValue('business_value', value);
                  }}
                  onUploadImage={handleImageUpload}
                  placeholder="描述该需求的商业价值和预期收益（可选）"
                  minHeight={150}
                  maxHeight={400}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="预期结果" name="expected_outcome">
                <LexicalEditor
                  value={expectedOutcomeContent}
                  onChange={(value) => {
                    setExpectedOutcomeContent(value);
                    form.setFieldValue('expected_outcome', value);
                  }}
                  onUploadImage={handleImageUpload}
                  placeholder="描述该需求的预期结果和目标（可选）"
                  minHeight={150}
                  maxHeight={400}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="验收标准" name="acceptance_criteria">
                <LexicalEditor
                  value={acceptanceCriteriaContent}
                  onChange={(value) => {
                    setAcceptanceCriteriaContent(value);
                    form.setFieldValue('acceptance_criteria', value);
                  }}
                  onUploadImage={handleImageUpload}
                  placeholder="定义该需求的验收标准，建议使用清单格式（可选）"
                  minHeight={180}
                  maxHeight={500}
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
          <Row gutter={16} style={{ marginTop: '24px' }} align="middle">
            <Col>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                {isEditMode ? '保存修改' : '创建需求'}
              </Button>
            </Col>
            <Col>
              <Button onClick={manualSave} disabled={submitting || loading} icon={<SaveOutlined />}>
                手动保存草稿
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
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                  {autoSaveStatus.isSaving ? (
                    '保存中...'
                  ) : autoSaveStatus.lastSaved ? (
                    `上次保存: ${autoSaveStatus.lastSaved.toLocaleTimeString()}`
                  ) : (
                    '自动保存已启用'
                  )}
                </span>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 需求模板选择器 */}
      <RequirementTemplateSelector
        visible={templateSelectorVisible}
        onSelect={handleTemplateSelect}
        onCancel={() => setTemplateSelectorVisible(false)}
      />
    </div>
  );
};

export default RequirementFormPage;
