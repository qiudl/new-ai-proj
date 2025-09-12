import React, { useState } from 'react';
import {
  Select,
  Space,
  Button,
  Row,
  Col,
  Typography,
  Divider
} from 'antd';
import {
  FilterOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface FilterValues {
  type?: string;
  status?: string;
  owner?: string;
  dateRange?: string;
}

interface MobileFilterPanelProps {
  onFilterChange?: (filters: FilterValues) => void;
}

const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({
  onFilterChange
}) => {
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange?.({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value);

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <FilterOutlined />
            <Text strong>筛选条件</Text>
          </Space>
        </Col>
        <Col>
          {hasActiveFilters && (
            <Button
              type="text"
              
              icon={<ClearOutlined />}
              onClick={clearFilters}
            >
              清除
            </Button>
          )}
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>文档类型</Text>
          </div>
          <Select
            placeholder="选择类型"
            value={filters.type}
            onChange={(value) => handleFilterChange('type', value)}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="markdown">Markdown</Option>
            <Option value="pdf">PDF</Option>
            <Option value="word">Word</Option>
            <Option value="excel">Excel</Option>
            <Option value="image">图片</Option>
          </Select>
        </Col>
        
        <Col span={12}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>状态</Text>
          </div>
          <Select
            placeholder="选择状态"
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="archived">已归档</Option>
          </Select>
        </Col>

        <Col span={12}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>创建者</Text>
          </div>
          <Select
            placeholder="选择创建者"
            value={filters.owner}
            onChange={(value) => handleFilterChange('owner', value)}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="admin">Admin</Option>
            <Option value="user1">张三</Option>
            <Option value="user2">李四</Option>
          </Select>
        </Col>

        <Col span={12}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>时间范围</Text>
          </div>
          <Select
            placeholder="选择时间"
            value={filters.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
            style={{ width: '100%' }}
            allowClear
          >
            <Option value="today">今天</Option>
            <Option value="week">本周</Option>
            <Option value="month">本月</Option>
            <Option value="year">今年</Option>
          </Select>
        </Col>
      </Row>

      {hasActiveFilters && (
        <div style={{ marginTop: 12, padding: '8px 0' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已应用 {Object.values(filters).filter(v => v).length} 个筛选条件
          </Text>
        </div>
      )}
    </div>
  );
};

export default MobileFilterPanel;