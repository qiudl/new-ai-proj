import React, { useState, useEffect } from 'react';
import { Select, message, Spin } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import enterpriseService from '../services/enterpriseService';
import { Enterprise } from '../types/enterprise';

const { Option } = Select;

interface EnterpriseSelectorProps {
  value?: number;
  onChange?: (value: number | undefined, enterprise?: Enterprise) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: 'large' | 'middle' | 'small';
  showSearch?: boolean;
  filterOption?: boolean | ((input: string, option: any) => boolean);
}

/**
 * 企业选择器组件
 * 用于选择企业的下拉框组件，支持搜索和过滤
 */
const EnterpriseSelector: React.FC<EnterpriseSelectorProps> = ({
  value,
  onChange,
  placeholder = '请选择企业',
  allowClear = true,
  disabled = false,
  style,
  size = 'middle',
  showSearch = true,
  filterOption = true,
}) => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载企业列表
  const loadEnterprises = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await enterpriseService.getEnterprises(1, 100); // 获取前100个企业
      setEnterprises(result.data);
    } catch (err: any) {
      // 404/403是权限不足的正常情况，静默处理
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        console.error('❌ 加载企业列表失败:', err);
        setError('加载企业列表失败');
        message.error('加载企业列表失败');
      } else {
        // 权限不足时静默处理，不显示错误
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ 企业列表API不可用（权限不足）');
        }
      }
      setEnterprises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnterprises();
  }, []);

  // 处理选择变化
  const handleChange = (selectedValue: number | undefined) => {
    const selectedEnterprise = selectedValue 
      ? enterprises.find(enterprise => enterprise.id === selectedValue)
      : undefined;
    
    onChange?.(selectedValue, selectedEnterprise);
  };

  // 默认过滤函数
  const defaultFilterOption = (input: string, option: any) => {
    const enterprise = enterprises.find(e => e.id === option.value);
    if (!enterprise) return false;
    
    const searchText = input.toLowerCase();
    return (
      enterprise.name.toLowerCase().includes(searchText) ||
      enterprise.code.toLowerCase().includes(searchText) ||
      (enterprise.industry_type_text && enterprise.industry_type_text.toLowerCase().includes(searchText)) ||
      (enterprise.business_type_text && enterprise.business_type_text.toLowerCase().includes(searchText))
    );
  };

  // 获取状态颜色样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { color: '#52c41a' };
      case 'inactive':
        return { color: '#faad14' };
      case 'suspended':
        return { color: '#ff4d4f' };
      default:
        return {};
    }
  };

  const actualFilterOption = typeof filterOption === 'boolean' 
    ? (filterOption ? defaultFilterOption : false)
    : filterOption;

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled || loading}
      loading={loading}
      style={style}
      size={size}
      showSearch={showSearch}
      filterOption={actualFilterOption}
      notFoundContent={loading ? <Spin  /> : (error ? error : '暂无数据')}
      suffixIcon={<BankOutlined />}
    >
      {enterprises.map(enterprise => (
        <Option key={enterprise.id} value={enterprise.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>
                {enterprise.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {enterprise.code} • {enterprise.business_type_text}
                {enterprise.industry_type_text && ` • ${enterprise.industry_type_text}`}
              </div>
            </div>
            <div style={{ ...getStatusStyle(enterprise.status), fontSize: '12px' }}>
              {enterprise.status_text}
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default EnterpriseSelector;