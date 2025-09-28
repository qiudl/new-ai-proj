import React from 'react';
import { Form, Input, Select, Row, Col, FormInstance } from 'antd';
import { 
  Enterprise, 
  EnterpriseRequest, 
  EnterpriseUpdateRequest,
  BUSINESS_TYPE_OPTIONS,
  STATUS_OPTIONS,
  INDUSTRY_TYPE_OPTIONS 
} from '../types/enterprise';

const { Option } = Select;
const { TextArea } = Input;

interface EnterpriseFormProps {
  form: FormInstance;
  initialValues?: Partial<Enterprise>;
  isEdit?: boolean;
  disabled?: boolean;
  layout?: 'horizontal' | 'vertical' | 'inline';
  requiredFields?: string[];
  hiddenFields?: string[];
}

/**
 * 企业信息表单组件
 * 可复用的企业创建/编辑表单组件
 */
const EnterpriseForm: React.FC<EnterpriseFormProps> = ({
  form,
  initialValues,
  isEdit = false,
  disabled = false,
  layout = 'vertical',
  requiredFields = ['name', 'code', 'business_type', 'status'],
  hiddenFields = [],
}) => {

  // 检查字段是否必需
  const isRequired = (fieldName: string) => requiredFields.includes(fieldName);

  // 检查字段是否隐藏
  const isHidden = (fieldName: string) => hiddenFields.includes(fieldName);

  // 渲染表单字段的辅助函数
  const renderFormItem = (name: string, label: string, children: React.ReactNode, rules: any[] = []) => {
    if (isHidden(name)) return null;

    const finalRules = isRequired(name) && rules.length === 0 
      ? [{ required: true, message: `请输入${label}` }]
      : rules;

    return (
      <Form.Item
        name={name}
        label={label}
        rules={finalRules}
      >
        {children}
      </Form.Item>
    );
  };

  return (
    <Form
      form={form}
      layout={layout}
      initialValues={{
        status: 'active',
        business_type: 'llc',
        ...initialValues,
      }}
    >
      {/* 基本信息 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderFormItem(
            'name',
            '企业名称',
            <Input 
              placeholder="请输入企业名称" 
              disabled={disabled}
              maxLength={255}
            />,
            [
              { required: isRequired('name'), message: '请输入企业名称' },
              { min: 1, max: 255, message: '企业名称长度为1-255个字符' }
            ]
          )}
        </Col>
        <Col xs={24} md={12}>
          {renderFormItem(
            'code',
            '企业代码',
            <Input 
              placeholder="请输入企业代码" 
              disabled={disabled}
              maxLength={100}
            />,
            [
              { required: isRequired('code'), message: '请输入企业代码' },
              { min: 1, max: 100, message: '企业代码长度为1-100个字符' }
            ]
          )}
        </Col>
      </Row>

      {renderFormItem(
        'description',
        '企业描述',
        <TextArea 
          rows={3} 
          placeholder="请输入企业描述" 
          disabled={disabled}
          maxLength={1000}
        />
      )}

      {/* 业务信息 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderFormItem(
            'business_type',
            '业务类型',
            <Select placeholder="请选择业务类型" disabled={disabled}>
              {BUSINESS_TYPE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>,
            [{ required: isRequired('business_type'), message: '请选择业务类型' }]
          )}
        </Col>
        <Col xs={24} md={12}>
          {renderFormItem(
            'industry_type',
            '行业类型',
            <Select placeholder="请选择行业类型" allowClear disabled={disabled}>
              {INDUSTRY_TYPE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          )}
        </Col>
      </Row>

      {/* 法律信息 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderFormItem(
            'registration_number',
            '注册号码',
            <Input 
              placeholder="请输入注册号码" 
              disabled={disabled}
              maxLength={100}
            />
          )}
        </Col>
        <Col xs={24} md={12}>
          {renderFormItem(
            'tax_id',
            '税务识别号',
            <Input 
              placeholder="请输入税务识别号" 
              disabled={disabled}
              maxLength={100}
            />
          )}
        </Col>
      </Row>

      {renderFormItem(
        'legal_representative',
        '法定代表人',
        <Input 
          placeholder="请输入法定代表人" 
          disabled={disabled}
          maxLength={100}
        />
      )}

      {/* 联系信息 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderFormItem(
            'contact_email',
            '联系邮箱',
            <Input 
              placeholder="请输入联系邮箱" 
              disabled={disabled}
              maxLength={255}
            />,
            [{ type: 'email', message: '请输入正确的邮箱格式' }]
          )}
        </Col>
        <Col xs={24} md={12}>
          {renderFormItem(
            'contact_phone',
            '联系电话',
            <Input 
              placeholder="请输入联系电话" 
              disabled={disabled}
              maxLength={50}
            />
          )}
        </Col>
      </Row>

      {/* 地址信息 */}
      {renderFormItem(
        'address',
        '详细地址',
        <Input 
          placeholder="请输入详细地址" 
          disabled={disabled}
          maxLength={500}
        />
      )}

      <Row gutter={16}>
        <Col xs={24} md={8}>
          {renderFormItem(
            'city',
            '城市',
            <Input 
              placeholder="请输入城市" 
              disabled={disabled}
              maxLength={100}
            />
          )}
        </Col>
        <Col xs={24} md={8}>
          {renderFormItem(
            'province',
            '省份',
            <Input 
              placeholder="请输入省份" 
              disabled={disabled}
              maxLength={100}
            />
          )}
        </Col>
        <Col xs={24} md={8}>
          {renderFormItem(
            'postal_code',
            '邮政编码',
            <Input 
              placeholder="请输入邮政编码" 
              disabled={disabled}
              maxLength={20}
            />
          )}
        </Col>
      </Row>

      {/* 其他信息 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          {renderFormItem(
            'website',
            '网站',
            <Input 
              placeholder="请输入网站URL" 
              disabled={disabled}
              maxLength={255}
            />,
            [{ type: 'url', message: '请输入正确的网站URL' }]
          )}
        </Col>
        <Col xs={24} md={12}>
          {renderFormItem(
            'status',
            '状态',
            <Select placeholder="请选择状态" disabled={disabled}>
              {STATUS_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>,
            [{ required: isRequired('status'), message: '请选择状态' }]
          )}
        </Col>
      </Row>
    </Form>
  );
};

export default EnterpriseForm;