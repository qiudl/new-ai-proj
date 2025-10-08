import React from 'react';
import { Row, Col, Select, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { TestHistoryFilters } from '@/types/aiConfig';

const { Option } = Select;

interface FilterBarProps {
  filters: TestHistoryFilters;
  onFiltersChange: (filters: Partial<TestHistoryFilters>) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFiltersChange }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Select
          style={{ width: '100%' }}
          placeholder="测试状态"
          value={filters.status}
          onChange={(status) => onFiltersChange({ status })}
        >
          <Option value="all">全部状态</Option>
          <Option value="success">成功</Option>
          <Option value="failed">失败</Option>
          <Option value="timeout">超时</Option>
        </Select>
      </Col>

      <Col span={6}>
        <Select
          style={{ width: '100%' }}
          placeholder="测试类型"
          value={filters.testType}
          onChange={(testType) => onFiltersChange({ testType })}
        >
          <Option value="all">全部类型</Option>
          <Option value="manual">手动测试</Option>
          <Option value="auto">自动测试</Option>
          <Option value="validation">验证测试</Option>
        </Select>
      </Col>

      <Col span={12}>
        <Input
          placeholder="搜索测试问题或响应内容..."
          prefix={<SearchOutlined />}
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          allowClear
        />
      </Col>
    </Row>
  );
};
