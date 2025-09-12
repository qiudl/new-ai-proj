import React, { useState } from 'react';
import { 
  Input, 
  Select, 
  Space, 
  Button, 
  Popover, 
  Checkbox, 
  Slider,
  Typography,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ClearOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { EnterpriseOption } from '../../types/impersonation';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

export interface EnterpriseFilterOptions {
  searchTerm: string;
  statusFilter: string[];
  userCountRange: [number, number];
  sortBy: 'name' | 'code' | 'userCount' | 'status';
  sortOrder: 'asc' | 'desc';
  showCurrentlyImpersonated: boolean;
}

interface EnterpriseFilterProps {
  enterprises: EnterpriseOption[];
  filters: EnterpriseFilterOptions;
  onFiltersChange: (filters: EnterpriseFilterOptions) => void;
  onReset: () => void;
}

/**
 * 企业过滤和搜索组件
 * 提供高级的企业筛选功能
 */
const EnterpriseFilter: React.FC<EnterpriseFilterProps> = ({
  enterprises,
  filters,
  onFiltersChange,
  onReset
}) => {
  const [filterVisible, setFilterVisible] = useState(false);

  // 获取用户数量范围
  const userCountRange = React.useMemo(() => {
    if (enterprises.length === 0) return [0, 100];
    
    const counts = enterprises.map(e => e.userCount || 0);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    
    return [min, Math.max(max, 10)]; // 至少到10
  }, [enterprises]);

  // 计算已应用的过滤器数量
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    
    if (filters.searchTerm.trim()) count++;
    if (filters.statusFilter.length > 0) count++;
    if (filters.userCountRange[0] !== userCountRange[0] || filters.userCountRange[1] !== userCountRange[1]) count++;
    if (filters.sortBy !== 'name' || filters.sortOrder !== 'asc') count++;
    if (filters.showCurrentlyImpersonated) count++;
    
    return count;
  }, [filters, userCountRange]);

  // 处理搜索
  const handleSearch = (value: string) => {
    onFiltersChange({
      ...filters,
      searchTerm: value
    });
  };

  // 处理状态过滤
  const handleStatusFilter = (values: string[]) => {
    onFiltersChange({
      ...filters,
      statusFilter: values
    });
  };

  // 处理用户数量范围
  const handleUserCountRange = (range: [number, number]) => {
    onFiltersChange({
      ...filters,
      userCountRange: range
    });
  };

  // 处理排序
  const handleSort = (field: string) => {
    const [sortBy, sortOrder] = field.split('-');
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    });
  };

  // 处理当前模拟企业显示
  const handleShowCurrentlyImpersonated = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      showCurrentlyImpersonated: checked
    });
  };

  // 高级过滤器内容
  const filterContent = (
    <div style={{ width: '300px', padding: '8px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Text strong>企业状态</Text>
        <div style={{ marginTop: '8px' }}>
          <Checkbox.Group
            value={filters.statusFilter}
            onChange={handleStatusFilter}
            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <Checkbox value="active">活跃</Checkbox>
            <Checkbox value="inactive">不活跃</Checkbox>
            <Checkbox value="suspended">已暂停</Checkbox>
          </Checkbox.Group>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Text strong>用户数量范围</Text>
        <div style={{ marginTop: '8px', padding: '0 8px' }}>
          <Slider
            range
            min={userCountRange[0]}
            max={userCountRange[1]}
            value={filters.userCountRange}
            onChange={handleUserCountRange}
            tooltip={{
              formatter: (value) => `${value} 用户`
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999', marginTop: '4px' }}>
            <span>{filters.userCountRange[0]}</span>
            <span>{filters.userCountRange[1]}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Text strong>排序方式</Text>
        <div style={{ marginTop: '8px' }}>
          <Select
            style={{ width: '100%' }}
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={handleSort}
          >
            <Option value="name-asc">企业名称 (A-Z)</Option>
            <Option value="name-desc">企业名称 (Z-A)</Option>
            <Option value="code-asc">企业代码 (A-Z)</Option>
            <Option value="code-desc">企业代码 (Z-A)</Option>
            <Option value="userCount-desc">用户数量 (高到低)</Option>
            <Option value="userCount-asc">用户数量 (低到高)</Option>
            <Option value="status-asc">状态 (活跃优先)</Option>
          </Select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Checkbox
          checked={filters.showCurrentlyImpersonated}
          onChange={(e) => handleShowCurrentlyImpersonated(e.target.checked)}
        >
          只显示当前模拟的企业
        </Checkbox>
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
        <Space>
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={onReset}
            disabled={activeFilterCount === 0}
          >
            重置
          </Button>
          <Button 
            size="small" 
            type="primary" 
            onClick={() => setFilterVisible(false)}
          >
            确定
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: '16px' }}>
      <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <Search
            placeholder="搜索企业名称、代码或描述..."
            value={filters.searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ borderRadius: '6px' }}
          />
        </div>
        
        <Space>
          <Select
            style={{ width: '150px' }}
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={handleSort}
            suffixIcon={<SettingOutlined />}
          >
            <Option value="name-asc">名称排序</Option>
            <Option value="userCount-desc">用户数排序</Option>
            <Option value="status-asc">状态排序</Option>
          </Select>
          
          <Popover
            content={filterContent}
            title="高级筛选"
            trigger="click"
            open={filterVisible}
            onOpenChange={setFilterVisible}
            placement="bottomRight"
          >
            <Badge count={activeFilterCount} size="small" offset={[10, 0]}>
              <Button 
                icon={<FilterOutlined />}
                type={activeFilterCount > 0 ? 'primary' : 'default'}
              >
                筛选
              </Button>
            </Badge>
          </Popover>
        </Space>
      </Space>

      {/* 应用的过滤器标签 */}
      {activeFilterCount > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>已应用筛选条件:</Text>
          
          {filters.searchTerm.trim() && (
            <Badge 
              count={`搜索: ${filters.searchTerm}`} 
              style={{ backgroundColor: '#1890ff', fontSize: '11px' }} 
            />
          )}
          
          {filters.statusFilter.length > 0 && (
            <Badge 
              count={`状态: ${filters.statusFilter.length}项`} 
              style={{ backgroundColor: '#52c41a', fontSize: '11px' }} 
            />
          )}
          
          {(filters.userCountRange[0] !== userCountRange[0] || filters.userCountRange[1] !== userCountRange[1]) && (
            <Badge 
              count={`用户: ${filters.userCountRange[0]}-${filters.userCountRange[1]}`} 
              style={{ backgroundColor: '#faad14', fontSize: '11px' }} 
            />
          )}
          
          {filters.showCurrentlyImpersonated && (
            <Badge 
              count="仅当前模拟" 
              style={{ backgroundColor: '#ff4d4f', fontSize: '11px' }} 
            />
          )}
          
          <Button 
            type="link" 
            size="small" 
            icon={<ClearOutlined />}
            onClick={onReset}
            style={{ height: 'auto', padding: '2px 4px', fontSize: '11px' }}
          >
            清除所有
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnterpriseFilter;