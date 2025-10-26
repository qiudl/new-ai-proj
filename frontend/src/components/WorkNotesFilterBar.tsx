import React from 'react';
import { Row, Col, Input, Select, Button, Space, Radio, Tag } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

interface WorkNotesFilterBarProps {
  // 搜索
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  searchLoading?: boolean;

  // 状态筛选
  statusFilter: string;
  onStatusChange: (value: string) => void;

  // 分类筛选
  categoryFilter: string | null;
  onCategoryChange: (value: string | null) => void;
  categories: Array<{ value: string; label: string; icon: string; count?: number }>;

  // 标签筛选
  tagFilter: string[];
  onTagChange: (value: string[]) => void;
  availableTags: Array<{ name: string; count: number }>;

  // 时间筛选
  timeRangeFilter: string | null;
  onTimeRangeChange: (value: string | null) => void;
  timeRanges?: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    earlier: number;
  };

  // 快捷筛选
  quickFilter: string | null;
  onQuickFilterChange: (value: string | null) => void;

  // 操作
  onClearFilters: () => void;
  onCreate: () => void;

  // 显示
  totalCount: number;
  filteredCount: number;
  isMobile?: boolean;
}

const WorkNotesFilterBar: React.FC<WorkNotesFilterBarProps> = ({
  searchKeyword,
  onSearchChange,
  searchLoading = false,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  categories,
  tagFilter,
  onTagChange,
  availableTags,
  timeRangeFilter,
  onTimeRangeChange,
  timeRanges,
  quickFilter,
  onQuickFilterChange,
  onClearFilters,
  onCreate,
  totalCount,
  filteredCount,
  isMobile = false
}) => {
  // 计算是否有激活的筛选
  const hasActiveFilters =
    searchKeyword ||
    statusFilter !== 'all' ||
    categoryFilter ||
    tagFilter.length > 0 ||
    timeRangeFilter ||
    quickFilter;

  // 渲染激活的筛选标签
  const renderActiveFilterTags = () => {
    const tags = [];

    if (searchKeyword) {
      tags.push(
        <Tag
          key="search"
          closable
          onClose={() => onSearchChange('')}
          color="blue"
        >
          搜索: {searchKeyword}
        </Tag>
      );
    }

    if (statusFilter !== 'all') {
      const statusMap: Record<string, string> = {
        draft: '草稿',
        published: '已发布',
        archived: '已归档'
      };
      tags.push(
        <Tag
          key="status"
          closable
          onClose={() => onStatusChange('all')}
          color="green"
        >
          状态: {statusMap[statusFilter]}
        </Tag>
      );
    }

    if (categoryFilter) {
      const category = categories.find(c => c.value === categoryFilter);
      tags.push(
        <Tag
          key="category"
          closable
          onClose={() => onCategoryChange(null)}
          color="orange"
        >
          {category?.icon} {category?.label}
        </Tag>
      );
    }

    if (tagFilter.length > 0) {
      tagFilter.forEach(tag => {
        tags.push(
          <Tag
            key={`tag-${tag}`}
            closable
            onClose={() => onTagChange(tagFilter.filter(t => t !== tag))}
            color="purple"
          >
            🏷️ {tag}
          </Tag>
        );
      });
    }

    if (timeRangeFilter) {
      const timeMap: Record<string, string> = {
        today: '今天',
        week: '本周',
        month: '本月',
        earlier: '更早'
      };
      tags.push(
        <Tag
          key="time"
          closable
          onClose={() => onTimeRangeChange(null)}
          color="cyan"
        >
          📅 {timeMap[timeRangeFilter]}
        </Tag>
      );
    }

    if (quickFilter) {
      const quickMap: Record<string, string> = {
        today: '今天创建',
        week: '本周创建',
        month: '本月创建',
        associated: '已关联任务',
        unassociated: '未关联任务'
      };
      tags.push(
        <Tag
          key="quick"
          closable
          onClose={() => onQuickFilterChange(null)}
          color="magenta"
        >
          ⚡ {quickMap[quickFilter]}
        </Tag>
      );
    }

    return tags.length > 0 ? (
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>当前筛选:</span>
          {tags}
          <Button
            type="link"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={onClearFilters}
          >
            清空全部
          </Button>
        </Space>
      </div>
    ) : null;
  };

  return (
    <div>
      {/* 第一行: 主要筛选控件 */}
      <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
        {/* 搜索框 */}
        <Col xs={24} sm={24} md={12} lg={8} xl={6}>
          <Search
            placeholder="搜索标题、内容或输入#ID..."
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            loading={searchLoading}
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: '100%' }}
          />
        </Col>

        {/* 状态筛选 */}
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Select
            placeholder="状态"
            value={statusFilter}
            onChange={onStatusChange}
            style={{ width: '100%' }}
            size="middle"
          >
            <Option value="all">全部状态</Option>
            <Option value="draft">✏️ 草稿</Option>
            <Option value="published">✅ 已发布</Option>
            <Option value="archived">📦 已归档</Option>
          </Select>
        </Col>

        {/* 分类筛选 */}
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Select
            placeholder="分类"
            value={categoryFilter}
            onChange={onCategoryChange}
            allowClear
            style={{ width: '100%' }}
            size="middle"
          >
            {categories.map(cat => (
              <Option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
                {cat.count !== undefined && (
                  <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                    ({cat.count})
                  </span>
                )}
              </Option>
            ))}
          </Select>
        </Col>

        {/* 标签筛选 */}
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Select
            mode="multiple"
            placeholder="标签"
            value={tagFilter}
            onChange={onTagChange}
            allowClear
            maxTagCount={1}
            style={{ width: '100%' }}
            size="middle"
          >
            {availableTags.map(tag => (
              <Option key={tag.name} value={tag.name}>
                🏷️ {tag.name}
                <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                  ({tag.count})
                </span>
              </Option>
            ))}
          </Select>
        </Col>

        {/* 时间筛选 */}
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Select
            placeholder="时间"
            value={timeRangeFilter}
            onChange={onTimeRangeChange}
            allowClear
            style={{ width: '100%' }}
            size="middle"
          >
            <Option value="today">
              📅 今天
              {timeRanges && (
                <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                  ({timeRanges.today})
                </span>
              )}
            </Option>
            <Option value="week">
              📅 本周
              {timeRanges && (
                <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                  ({timeRanges.thisWeek})
                </span>
              )}
            </Option>
            <Option value="month">
              📅 本月
              {timeRanges && (
                <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                  ({timeRanges.thisMonth})
                </span>
              )}
            </Option>
            <Option value="earlier">
              📅 更早
              {timeRanges && (
                <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                  ({timeRanges.earlier})
                </span>
              )}
            </Option>
          </Select>
        </Col>
      </Row>

      {/* 激活的筛选标签 */}
      {renderActiveFilterTags()}

      {/* 第二行: 快捷筛选和操作 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col xs={24} sm={16} md={14} lg={16}>
          <Space wrap>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>快捷筛选:</span>
            <Radio.Group
              value={quickFilter}
              onChange={(e) => onQuickFilterChange(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="today">今天</Radio.Button>
              <Radio.Button value="week">本周</Radio.Button>
              <Radio.Button value="month">本月</Radio.Button>
              <Radio.Button value="associated">已关联</Radio.Button>
              <Radio.Button value="unassociated">未关联</Radio.Button>
            </Radio.Group>
            {quickFilter && (
              <Button
                type="link"
                size="small"
                onClick={() => onQuickFilterChange(null)}
              >
                取消
              </Button>
            )}
          </Space>
        </Col>

        <Col xs={24} sm={8} md={10} lg={8}>
          <Space style={{ float: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreate}
            >
              创建笔记
            </Button>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              显示 {filteredCount}/{totalCount} 个笔记
            </span>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default WorkNotesFilterBar;
