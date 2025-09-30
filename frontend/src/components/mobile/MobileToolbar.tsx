import React from 'react';
import { Row, Col, Button, Select, Input, Dropdown, Space } from 'antd';
import { PlusOutlined, FilterOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

interface MobileToolbarProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  onQuickCreate: () => void;
  onFullCreate: () => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

const MobileToolbar: React.FC<MobileToolbarProps> = ({
  searchKeyword,
  onSearchChange,
  onQuickCreate,
  onFullCreate,
  statusFilter,
  onStatusChange,
  onResetFilters,
  hasActiveFilters
}) => {
  const createMenuItems = [
    {
      key: 'quick',
      label: (
        <Space>
          <span style={{ fontSize: '18px' }}>🚀</span>
          <span>快速创建</span>
        </Space>
      ),
      onClick: onQuickCreate,
    },
    {
      key: 'full',
      label: (
        <Space>
          <span style={{ fontSize: '18px' }}>📝</span>
          <span>详细创建</span>
        </Space>
      ),
      onClick: onFullCreate,
    },
  ];

  return (
    <div style={{ 
      padding: '12px 16px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #f0f0f0'
    }}>
      {/* 主要搜索和创建行 */}
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={18}>
          <Search
            placeholder="搜索笔记..."
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="middle"
            style={{ 
              fontSize: '16px',
            }}
          />
        </Col>
        <Col span={6}>
          <Dropdown
            menu={{ items: createMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="middle"
              style={{
                width: '100%',
                height: '40px',
                fontWeight: 500,
              }}
            >
              新建
            </Button>
          </Dropdown>
        </Col>
      </Row>
      
      {/* 筛选控制行 */}
      <Row gutter={[8, 8]}>
        <Col span={14}>
          <Select
            placeholder="状态筛选"
            value={statusFilter === 'all' ? undefined : statusFilter}
            onChange={onStatusChange}
            allowClear
            size="middle"
            style={{ width: '100%' }}
          >
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="archived">已归档</Option>
          </Select>
        </Col>
        <Col span={10}>
          <Button
            icon={<FilterOutlined />}
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            size="middle"
            style={{ width: '100%' }}
          >
            清空筛选
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default MobileToolbar;