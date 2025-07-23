import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  DatePicker,
  Card,
  Divider,
  Space,
  Typography,
  Button,
  message,
  Tooltip,
  Alert,
  Modal
} from 'antd';
import {
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Company, CompanyRequest } from '../types/company';
import companyService from '../services/companyService';
import aiCompanyService, { AICompanyInfo, AISearchResult } from '../services/aiCompanyService';
import { AIProvider } from '../types/ai';
import AICompanySearch from './AICompanySearch';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

interface CompanyFormProps {
  form: any;
  company?: Company;
  onValuesChange?: (changedValues: any, allValues: any) => void;
  disabled?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({
  form,
  company,
  onValuesChange,
  disabled = false
}) => {
  const [aiSearchVisible, setAiSearchVisible] = useState(false);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null);
  const [currentCompanyName, setCurrentCompanyName] = useState('');
  const [hasAiSuggestion, setHasAiSuggestion] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    hasConfig: boolean;
    currentProvider?: AIProvider;
    availableProviders: AIProvider[];
  }>({ hasConfig: false, currentProvider: undefined, availableProviders: [] });
  useEffect(() => {
    if (company) {
      // 编辑模式：设置表单值
      form.setFieldsValue({
        ...company,
        startDate: company.startDate ? dayjs(company.startDate) : undefined,
      });
      setCurrentCompanyName(company.companyName);
    } else {
      // 创建模式：重置表单
      form.resetFields();
      setCurrentCompanyName('');
      setHasAiSuggestion(false);
    }

    // 检查AI配置状态
    const loadAiStatus = async () => {
      try {
        const status = await aiCompanyService.getAIStatus();
        setAiStatus(status);
      } catch (error) {
        console.warn('获取AI状态失败，使用默认配置:', error);
        setAiStatus({ 
          hasConfig: false, 
          currentProvider: undefined, 
          availableProviders: ['openai', 'claude', 'deepseek'] 
        });
      }
    };
    loadAiStatus();
  }, [company, form]);

  // AI智能搜索功能
  const handleAiSearch = async () => {
    const companyName = form.getFieldValue('companyName');
    if (!companyName?.trim()) {
      message.warning('请先输入企业名称');
      return;
    }

    // 检查AI配置
    const status = await aiCompanyService.getAIStatus();
    if (!status.hasConfig) {
      Modal.confirm({
        title: '需要配置AI',
        content: '使用AI智能填充功能需要先配置AI API。请联系系统管理员进行配置。',
        okText: '我知道了',
        cancelText: '取消',
        onOk: () => {
          // 不执行任何操作，只是提示用户
        }
      });
      return;
    }

    setCurrentCompanyName(companyName);
    setAiSearchLoading(true);
    setAiSearchVisible(true);

    try {
      const result = await aiCompanyService.searchCompanyInfo(companyName);
      setAiSearchResult(result);

      // 显示成本信息（如果有）
      if (result.cost && result.cost > 0) {
        console.log(`AI调用成本: ${result.cost.toFixed(4)} 元`);
      }
    } catch (error) {
      console.error('AI搜索失败:', error);
      setAiSearchResult({
        success: false,
        message: 'AI搜索服务暂时不可用，请稍后重试'
      });
    } finally {
      setAiSearchLoading(false);
    }
  };

  // 应用AI搜索结果
  const handleApplyAiResult = (aiInfo: AICompanyInfo) => {
    const formValues: any = {
      companyName: aiInfo.companyName,
      companyType: aiInfo.companyType,
      industry: aiInfo.industry,
      businessLicense: aiInfo.businessLicense,
      legalRepresentative: aiInfo.legalRepresentative,
      address: aiInfo.address,
      city: aiInfo.city,
      province: aiInfo.province,
      postalCode: aiInfo.postalCode,
      website: aiInfo.website,
      mainPhone: aiInfo.mainPhone,
      mainEmail: aiInfo.mainEmail,
      companySize: aiInfo.companySize,
      employeeCount: aiInfo.employeeCount,
    };

    // 只设置有值的字段，避免覆盖用户已填写的内容
    Object.keys(formValues).forEach(key => {
      if (formValues[key] !== undefined && formValues[key] !== null && formValues[key] !== '') {
        form.setFieldValue(key, formValues[key]);
      }
    });

    setHasAiSuggestion(true);
    setAiSearchVisible(false);
    message.success(`AI信息已自动填充，可信度: ${(aiInfo.confidence * 100).toFixed(0)}%`);
    
    // 触发表单变化回调
    if (onValuesChange) {
      onValuesChange(formValues, form.getFieldsValue());
    }
  };

  // 重试AI搜索
  const handleRetryAiSearch = () => {
    handleAiSearch();
  };

  // 监听企业名称变化
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (newName !== currentCompanyName) {
      setHasAiSuggestion(false);
    }
  };


  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={onValuesChange}
      disabled={disabled}
      requiredMark={false}
      style={{ maxWidth: '100%' }}
    >
      {/* 基本信息 */}
      <Card size="small" title={
        <Space>
          <BankOutlined style={{ color: '#1890ff' }} />
          基本信息
        </Space>
      } 
      extra={
        !disabled && (
          <Tooltip title={aiStatus.hasConfig ? `使用${aiStatus.currentProvider?.toUpperCase()}智能填充企业信息` : '需要联系管理员配置AI API'}>
            <Button 
              type="primary"
              ghost={aiStatus.hasConfig}
              size="small"
              icon={<RobotOutlined />}
              onClick={handleAiSearch}
              disabled={!form.getFieldValue('companyName')?.trim()}
            >
              AI智能填充
            </Button>
          </Tooltip>
        )
      }
      style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="companyName"
              label={
                <Space>
                  企业名称
                  {hasAiSuggestion && (
                    <Tooltip title="该信息由AI智能填充">
                      <ThunderboltOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  )}
                </Space>
              }
              rules={[
                { required: true, message: '请输入企业名称' },
                { max: 100, message: '企业名称不能超过100个字符' }
              ]}
            >
              <Input 
                placeholder="请输入企业名称"
                onChange={handleCompanyNameChange}
                suffix={
                  <Tooltip title="点击使用AI智能填充">
                    <Button 
                      type="text" 
                      size="small"
                      icon={<RobotOutlined />}
                      onClick={handleAiSearch}
                      style={{ 
                        color: '#1890ff',
                        visibility: !disabled && form.getFieldValue('companyName')?.trim() ? 'visible' : 'hidden'
                      }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="companyCode"
              label="企业编码"
              rules={[
                { max: 50, message: '企业编码不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入企业编码（可选）" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="companyType"
              label="企业类型"
              rules={[{ required: true, message: '请选择企业类型' }]}
            >
              <Select placeholder="请选择企业类型">
                {companyService.getCompanyTypeOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="industry"
              label="所属行业"
              rules={[
                { max: 50, message: '行业名称不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入所属行业" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="businessLicense"
              label="营业执照号"
              rules={[
                { max: 50, message: '营业执照号不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入营业执照号" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="taxNumber"
              label="税务登记号"
              rules={[
                { max: 50, message: '税务登记号不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入税务登记号" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="legalRepresentative"
              label="法定代表人"
              rules={[
                { max: 50, message: '法定代表人姓名不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入法定代表人姓名" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="website"
              label="企业网站"
              rules={[
                { type: 'url', message: '请输入有效的网站地址' },
                { max: 200, message: '网站地址不能超过200个字符' }
              ]}
            >
              <Input placeholder="https://www.example.com" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 联系信息 */}
      <Card size="small" title={
        <Space>
          <PhoneOutlined style={{ color: '#52c41a' }} />
          联系信息
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="mainPhone"
              label="主要电话"
              rules={[
                { pattern: /^[\d\s\-\+\(\)]+$/, message: '请输入有效的电话号码' },
                { max: 20, message: '电话号码不能超过20个字符' }
              ]}
            >
              <Input placeholder="请输入主要联系电话" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="mainEmail"
              label="主要邮箱"
              rules={[
                { type: 'email', message: '请输入有效的邮箱地址' },
                { max: 100, message: '邮箱地址不能超过100个字符' }
              ]}
            >
              <Input placeholder="请输入主要联系邮箱" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="address"
              label="详细地址"
              rules={[
                { max: 200, message: '地址不能超过200个字符' }
              ]}
            >
              <TextArea
                placeholder="请输入详细地址"
                rows={2}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="province"
              label="省份"
              rules={[
                { max: 50, message: '省份名称不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入省份" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="city"
              label="城市"
              rules={[
                { max: 50, message: '城市名称不能超过50个字符' }
              ]}
            >
              <Input placeholder="请输入城市" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="postalCode"
              label="邮政编码"
              rules={[
                { pattern: /^\d{6}$/, message: '请输入6位数字的邮政编码' }
              ]}
            >
              <Input placeholder="请输入邮政编码" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 商务信息 */}
      <Card size="small" title={
        <Space>
          <DollarOutlined style={{ color: '#fa8c16' }} />
          商务信息
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="客户状态"
              rules={[{ required: true, message: '请选择客户状态' }]}
            >
              <Select placeholder="请选择客户状态">
                {companyService.getStatusOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="priority"
              label="客户优先级"
              rules={[{ required: true, message: '请选择客户优先级' }]}
            >
              <Select placeholder="请选择客户优先级">
                {companyService.getPriorityOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="annualContractValue"
              label="年度合同金额（元）"
              rules={[
                { type: 'number', min: 0, message: '合同金额不能为负数' }
              ]}
            >
              <InputNumber
                placeholder="请输入年度合同金额"
                style={{ width: '100%' }}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => parseFloat(value!.replace(/¥\s?|(,*)/g, '')) || 0 as any}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="startDate"
              label="合作开始日期"
            >
              <DatePicker
                placeholder="请选择合作开始日期"
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 企业规模 */}
      <Card size="small" title={
        <Space>
          <TeamOutlined style={{ color: '#722ed1' }} />
          企业规模
        </Space>
      } style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="companySize"
              label="企业规模"
            >
              <Select placeholder="请选择企业规模">
                {companyService.getCompanySizeOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="employeeCount"
              label="员工人数"
              rules={[
                { type: 'number', min: 1, message: '员工人数必须大于0' }
              ]}
            >
              <InputNumber
                placeholder="请输入员工人数"
                style={{ width: '100%' }}
                min={1}
                formatter={value => `${value}人`}
                parser={value => parseInt(value!.replace('人', '')) || 1 as any}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* AI智能搜索模态框 */}
      <AICompanySearch
        visible={aiSearchVisible}
        onCancel={() => setAiSearchVisible(false)}
        onConfirm={handleApplyAiResult}
        searchResult={aiSearchResult}
        loading={aiSearchLoading}
        companyName={currentCompanyName}
        onRetry={handleRetryAiSearch}
      />


      {/* AI填充提示 */}
      {hasAiSuggestion && !disabled && (
        <Alert
          message="AI智能填充已完成"
          description="部分信息已由AI自动填充，请检查并确认信息的准确性。您可以随时修改这些信息。"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16 }}
          action={
            <Button 
              size="small" 
              onClick={() => setHasAiSuggestion(false)}
            >
              我知道了
            </Button>
          }
        />
      )}
    </Form>
  );
};

export default CompanyForm;