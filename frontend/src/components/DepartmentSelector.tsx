import React, { useState, useEffect } from 'react';
import { Select, message, Spin, Empty } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import enterpriseService, { EnterpriseDepartment } from '../services/enterpriseService';

const { Option } = Select;

interface DepartmentSelectorProps {
  enterpriseId?: number;
  value?: number;
  onChange?: (value: number | undefined, department?: EnterpriseDepartment) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: 'large' | 'middle' | 'small';
  showSearch?: boolean;
  filterOption?: boolean | ((input: string, option: any) => boolean);
}

/**
 * 企业部门选择器组件
 * 根据选择的企业ID动态加载该企业下的部门列表
 */
const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  enterpriseId,
  value,
  onChange,
  placeholder = '请选择部门',
  allowClear = true,
  disabled = false,
  style,
  size = 'middle',
  showSearch = true,
  filterOption = true,
}) => {
  const [departments, setDepartments] = useState<EnterpriseDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载部门列表
  const loadDepartments = async (entId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await enterpriseService.getEnterpriseDepartments(entId, 1, 100, { status: 'active' });
      setDepartments(result.data);
    } catch (err: any) {
      // 404/403是权限不足的正常情况，静默处理
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        console.error('❌ 加载部门列表失败:', err);
        setError('加载部门列表失败');
        message.error('加载部门列表失败');
      } else {
        // 权限不足时静默处理，不显示错误
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ 部门列表API不可用（权限不足）');
        }
      }
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // 监听enterpriseId变化，重新加载部门
  useEffect(() => {
    if (enterpriseId) {
      loadDepartments(enterpriseId);
    } else {
      // 没有企业ID时清空部门列表
      setDepartments([]);
      setError(null);
    }
  }, [enterpriseId]);

  // 处理选择变化
  const handleChange = (selectedValue: number | undefined) => {
    const selectedDepartment = selectedValue
      ? departments.find(dept => dept.id === selectedValue)
      : undefined;

    onChange?.(selectedValue, selectedDepartment);
  };

  // 默认过滤函数
  const defaultFilterOption = (input: string, option: any) => {
    const department = departments.find(d => d.id === option.value);
    if (!department) return false;

    const searchText = input.toLowerCase();
    return (
      department.name.toLowerCase().includes(searchText) ||
      (department.code && department.code.toLowerCase().includes(searchText)) ||
      (department.path && department.path.toLowerCase().includes(searchText))
    );
  };

  // 获取状态颜色样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { color: '#52c41a' };
      case 'inactive':
        return { color: '#999' };
      default:
        return {};
    }
  };

  // 渲染部门路径（显示层级关系）
  const renderDepartmentPath = (department: EnterpriseDepartment) => {
    const parts = department.path?.split('/').filter(Boolean) || [];
    if (parts.length > 1) {
      return `${department.name} (${parts.slice(0, -1).join(' / ')})`;
    }
    return department.name;
  };

  const actualFilterOption = typeof filterOption === 'boolean'
    ? (filterOption ? defaultFilterOption : false)
    : filterOption;

  // 如果没有选择企业，显示提示
  if (!enterpriseId) {
    return (
      <Select
        value={value}
        placeholder="请先选择企业"
        disabled={true}
        style={style}
        size={size}
        suffixIcon={<ApartmentOutlined />}
      />
    );
  }

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
      notFoundContent={
        loading ? (
          <Spin size="small" />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '8px', color: '#ff4d4f' }}>{error}</div>
        ) : departments.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无部门数据" />
        ) : null
      }
      suffixIcon={<ApartmentOutlined />}
    >
      {departments.map(department => (
        <Option key={department.id} value={department.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>
                {department.name}
              </div>
              {department.path && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  路径: {department.path}
                  {department.code && ` • 编码: ${department.code}`}
                  {` • 级别: ${department.level}`}
                </div>
              )}
            </div>
            <div style={{ ...getStatusStyle(department.status), fontSize: '12px' }}>
              {department.status_text}
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default DepartmentSelector;
