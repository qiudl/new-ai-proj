import React, { useState, useMemo, useEffect } from 'react';
import { 
  Timeline, 
  Card, 
  Space, 
  Typography, 
  Select, 
  Button, 
  Checkbox, 
  Tooltip, 
  Avatar, 
  Badge,
  Divider,
  Empty,
  Spin,
  message,
  Tabs,
  Alert
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  DownOutlined,
  UpOutlined,
  SearchOutlined,
  GroupOutlined
} from '@ant-design/icons';
import { 
  TaskTimelineEvent, 
  TimelineEventFilter, 
  TaskTimelineEventType,
  EventCategory,
  EventSeverity,
  TimelineUtils 
} from '../../types/timeline';
import { 
  EventRendererFactory, 
  SeverityRenderer, 
  CategoryRenderer 
} from './EventRenderers';
import AdvancedSearch, { AdvancedSearchFilter } from './AdvancedSearch';
import { TimelineSearchUtils } from '../../utils/TimelineSearchUtils';
import { IntelligentEventGrouper, GroupingStrategy, EventGroup } from './EventGrouping';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// ✅ FIXED - Added taskId, projectId, height properties (TS2322)
interface EnhancedTaskTimelineV2Props {
  taskId?: number;
  projectId?: number;
  height?: string;
  events: TaskTimelineEvent[];
  loading?: boolean;
  className?: string;
  onRefresh?: () => void;
  showFilters?: boolean;
  initialFilter?: Partial<TimelineEventFilter>;
  compactMode?: boolean;
  virtualScroll?: boolean;
  maxHeight?: number;
  enableGrouping?: boolean;
  enableSearch?: boolean;
  enableAdvancedSearch?: boolean;
  showEventCount?: boolean;
  onEventClick?: (event: TaskTimelineEvent) => void;
}

const EnhancedTaskTimelineV2: React.FC<EnhancedTaskTimelineV2Props> = ({
  events,
  loading = false,
  className,
  onRefresh,
  showFilters = true,
  initialFilter = {},
  compactMode = false,
  virtualScroll = false,
  maxHeight = 600,
  enableGrouping = true,
  enableSearch = true,
  enableAdvancedSearch = true,
  showEventCount = true,
  onEventClick
}) => {
  // 状态管理
  const [filter, setFilter] = useState<Partial<TimelineEventFilter>>(initialFilter);
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedSearchFilter>({});
  const [showMetadata, setShowMetadata] = useState(!compactMode);
  const [showSystemEvents, setShowSystemEvents] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'compact' | 'detailed'>('timeline');
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>(GroupingStrategy.BY_DATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  // 从事件中提取过滤选项
  const filterOptions = useMemo(() => {
    const eventTypes = Array.from(new Set(events.map(e => e.event_type)));
    const users = Array.from(new Set(events.map(e => e.username).filter(Boolean)));
    const categories = Array.from(new Set(events.map(e => e.category).filter(Boolean)));
    const severities = Array.from(new Set(events.map(e => e.severity).filter(Boolean)));

    return {
      eventTypes: eventTypes.map(type => ({
        value: type,
        label: TimelineUtils.getEventTypeDescription(type),
        count: events.filter(e => e.event_type === type).length
      })),
      users: users.map(user => ({
        value: user!,
        label: user!,
        count: events.filter(e => e.username === user).length
      })),
      categories: categories.map(category => ({
        value: category!,
        label: TimelineUtils.getCategoryDescription(category!),
        count: events.filter(e => e.category === category).length
      })),
      severities: severities.map(severity => ({
        value: severity!,
        label: TimelineUtils.getSeverityDescription(severity!),
        count: events.filter(e => e.severity === severity).length
      }))
    };
  }, [events]);

  // 应用过滤器
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // 根据当前标签页选择过滤方式
    if (activeTab === 'advanced') {
      // 使用高级搜索过滤
      filtered = TimelineSearchUtils.applyAdvancedFilter(filtered, advancedFilter);
    } else {
      // 使用基础搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(event => 
          event.description.toLowerCase().includes(searchLower) ||
          event.username?.toLowerCase().includes(searchLower) ||
          event.task_title?.toLowerCase().includes(searchLower) ||
          TimelineUtils.getEventTypeDescription(event.event_type).toLowerCase().includes(searchLower)
        );
      }

      // 使用统一的过滤工具
      filtered = TimelineUtils.filterEvents(filtered, filter);

      // 系统事件过滤
      if (!showSystemEvents) {
        filtered = filtered.filter(event => event.category !== 'system');
      }
    }

    return filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  }, [events, filter, advancedFilter, showSystemEvents, searchTerm, activeTab]);

  // 按策略分组事件
  const groupedEvents = useMemo(() => {
    if (!enableGrouping) return [{ key: 'all', title: '所有事件', events: filteredEvents, metadata: {} }];
    return IntelligentEventGrouper.groupEvents(filteredEvents, groupingStrategy);
  }, [filteredEvents, enableGrouping, groupingStrategy]);

  // 获取用户头像
  const getUserAvatar = (event: TaskTimelineEvent) => {
    if (!event.username) {
      return (
        <Avatar  style={{ backgroundColor: '#8c8c8c' }}>
          <UserOutlined />
        </Avatar>
      );
    }

    const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
    const colorIndex = event.username.length % colors.length;
    
    return (
      <Avatar 
         
        style={{ backgroundColor: colors[colorIndex] }}
      >
        {event.username.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  // 格式化相对时间
  const formatRelativeTime = (dateString: string) => {
    const eventTime = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}天前`;
    
    return eventTime.toLocaleDateString('zh-CN');
  };

  // 切换事件展开状态
  const toggleEventExpansion = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // 渲染单个事件
  const renderEvent = (event: TaskTimelineEvent, isExpanded: boolean = false) => {
    const renderer = EventRendererFactory.getRenderer(event.event_type);
    const severityRenderer = new SeverityRenderer();
    const categoryRenderer = new CategoryRenderer();

    return {
      color: renderer.getColor(),
      children: (
        <Card
          
          hoverable
          onClick={() => onEventClick?.(event)}
          style={{
            cursor: onEventClick ? 'pointer' : 'default',
            backgroundColor: renderer.getBackgroundColor(),
            border: `1px solid ${renderer.getColor()}20`,
            borderRadius: 6,
            marginBottom: compactMode ? 4 : 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Space size={8} align="start">
              {getUserAvatar(event)}
              <div style={{ flex: 1 }}>
                <Space size={4} wrap>
                  <Text strong style={{ fontSize: compactMode ? 12 : 13 }}>
                    {renderer.getTitle(event)}
                  </Text>
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    backgroundColor: renderer.getColor(),
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'white'
                  }}>
                    {renderer.getIcon()}
                  </div>
                  {event.severity && severityRenderer.renderSeverity(event.severity)}
                  {event.category && categoryRenderer.renderCategory(event.category)}
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {formatRelativeTime(event.event_date)}
                  </Text>
                </Space>
              </div>
            </Space>

            <Space size={4}>
              {event.metadata && Object.keys(event.metadata).length > 0 && !compactMode && (
                <Button
                  type="text"
                  
                  icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEventExpansion(event.id);
                  }}
                  style={{ fontSize: 10, padding: '0 4px' }}
                />
              )}
            </Space>
          </div>
          
          {/* 事件描述 */}
          <div style={{ 
            fontSize: compactMode ? 12 : 13, 
            lineHeight: 1.5, 
            marginBottom: compactMode ? 4 : 8,
            color: '#333'
          }}>
            {renderer.getDescription(event)}
          </div>
          
          {/* 元数据显示 */}
          {showMetadata && isExpanded && event.metadata && (
            <div style={{ 
              marginTop: 8,
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              borderRadius: 4,
              fontSize: 12
            }}>
              {renderer.getMetadataDisplay(event)}
            </div>
          )}
          
          {/* 精确时间 */}
          {!compactMode && (
            <div style={{ 
              marginTop: 8, 
              paddingTop: 8, 
              borderTop: '1px solid #f0f0f0',
              fontSize: 10,
              color: '#999',
            }}>
              {new Date(event.event_date).toLocaleString('zh-CN')}
            </div>
          )}
        </Card>
      ),
    };
  };

  // 渲染搜索和过滤器
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Card 
         
        style={{ 
          marginBottom: 16,
          backgroundColor: '#fafafa',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <FilterOutlined style={{ color: '#1890ff' }} />
              <Text strong>时间线过滤器</Text>
              {showEventCount && (
                <Badge 
                  count={filteredEvents.length} 
                  style={{ backgroundColor: '#1890ff' }}
                  title={`显示 ${filteredEvents.length}/${events.length} 项事件`}
                />
              )}
            </Space>
            <Space>
              <Tooltip title="刷新时间线">
                <Button
                  
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  loading={loading}
                  disabled={!onRefresh}
                />
              </Tooltip>
              <Tooltip title="分组策略">
                <Select
                  
                  value={groupingStrategy}
                  onChange={setGroupingStrategy}
                  style={{ width: 120 }}
                >
                  <Select.Option value={GroupingStrategy.BY_DATE}>按日期</Select.Option>
                  <Select.Option value={GroupingStrategy.BY_USER}>按用户</Select.Option>
                  <Select.Option value={GroupingStrategy.BY_EVENT_TYPE}>按类型</Select.Option>
                  <Select.Option value={GroupingStrategy.BY_CATEGORY}>按分类</Select.Option>
                  <Select.Option value={GroupingStrategy.INTELLIGENT}>智能分组</Select.Option>
                </Select>
              </Tooltip>
              <Button 
                 
                onClick={() => {
                  setFilter({});
                  setAdvancedFilter({});
                  setSearchTerm('');
                }}
              >
                重置
              </Button>
            </Space>
          </div>
          
          {/* 搜索标签页 */}
          {(enableSearch || enableAdvancedSearch) && (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'basic' | 'advanced')}
              
            >
              {enableSearch && (
                <TabPane
                  tab={
                    <span>
                      <SearchOutlined />
                      基础搜索
                    </span>
                  }
                  key="basic"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      showSearch
                      placeholder="搜索事件..."
                      style={{ width: '100%' }}
                      
                      value={searchTerm || undefined}
                      onSearch={setSearchTerm}
                      onChange={setSearchTerm}
                      allowClear
                      filterOption={false}
                    />
                    
                    <Space wrap>
                      <div>
                        <Text style={{ fontSize: 12, color: '#666' }}>事件类型:</Text>
                        <Select
                          mode="multiple"
                          placeholder="选择类型"
                          style={{ minWidth: 200, marginLeft: 8 }}
                          
                          value={filter.event_types}
                          onChange={(value) => setFilter({ ...filter, event_types: value })}
                          options={filterOptions.eventTypes.map(opt => ({
                            ...opt,
                            label: `${opt.label} (${opt.count})`
                          }))}
                          maxTagCount="responsive"
                        />
                      </div>
                      
                      <div>
                        <Text style={{ fontSize: 12, color: '#666' }}>用户:</Text>
                        <Select
                          mode="multiple"
                          placeholder="选择用户"
                          style={{ minWidth: 150, marginLeft: 8 }}
                          
                          value={filter.user_ids?.map(String)}
                          onChange={(value) => setFilter({ ...filter, user_ids: value?.map(Number) })}
                          options={filterOptions.users.map(opt => ({
                            ...opt,
                            label: `${opt.label} (${opt.count})`
                          }))}
                          maxTagCount="responsive"
                        />
                      </div>
                      
                      <div>
                        <Text style={{ fontSize: 12, color: '#666' }}>分类:</Text>
                        <Select
                          mode="multiple"
                          placeholder="选择分类"
                          style={{ minWidth: 120, marginLeft: 8 }}
                          
                          value={filter.categories}
                          onChange={(value) => setFilter({ ...filter, categories: value })}
                          options={filterOptions.categories.map(opt => ({
                            ...opt,
                            label: `${opt.label} (${opt.count})`
                          }))}
                        />
                      </div>
                      
                      <div>
                        <Text style={{ fontSize: 12, color: '#666' }}>严重性:</Text>
                        <Select
                          mode="multiple"
                          placeholder="选择严重性"
                          style={{ minWidth: 120, marginLeft: 8 }}
                          
                          value={filter.severities}
                          onChange={(value) => setFilter({ ...filter, severities: value })}
                          options={filterOptions.severities.map(opt => ({
                            ...opt,
                            label: `${opt.label} (${opt.count})`
                          }))}
                        />
                      </div>
                    </Space>
                  </Space>
                </TabPane>
              )}
              
              {enableAdvancedSearch && (
                <TabPane
                  tab={
                    <span>
                      <FilterOutlined />
                      高级搜索
                    </span>
                  }
                  key="advanced"
                >
                  <AdvancedSearch
                    events={events}
                    onFilterChange={setAdvancedFilter}
                    initialFilter={advancedFilter}
                    showPresets={true}
                    allowSaveFilters={true}
                  />
                </TabPane>
              )}
            </Tabs>
          )}
          
          {/* 展示/隐藏选项 */}
          <Space wrap>
            <Checkbox
              checked={showMetadata}
              onChange={(e) => setShowMetadata(e.target.checked)}
            >
              显示元数据
            </Checkbox>
            <Checkbox
              checked={showSystemEvents}
              onChange={(e) => setShowSystemEvents(e.target.checked)}
            >
              显示系统事件
            </Checkbox>
          </Space>
        </Space>
      </Card>
    );
  };

  // 渲染时间线内容
  const renderTimelineContent = () => {
    if (filteredEvents.length === 0) {
      return (
        <Empty 
          description="没有匹配的事件"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (!enableGrouping) {
      // 普通时间线模式
      return (
        <Timeline
          items={filteredEvents.map(event => renderEvent(event, expandedEvents.has(event.id)))}
          style={{ paddingLeft: 8 }}
        />
      );
    }

    // 分组时间线模式
    return (
      <div>
        {groupedEvents.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} style={{ marginBottom: 24 }}>
            <Card
              title={
                <Space>
                  <GroupOutlined />
                  <span>{group.title}</span>
                  <Badge count={group.events.length} style={{ backgroundColor: '#1890ff' }} />
                  {group.metadata.priority && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      优先级: {group.metadata.priority}
                    </Text>
                  )}
                </Space>
              }
              
              style={{ borderRadius: 8 }}
            >
              {group.metadata.description && (
                <Alert
                  message={group.metadata.description}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              
              <Timeline
                items={group.events.map(event => renderEvent(event, expandedEvents.has(event.id)))}
                style={{ paddingLeft: 8 }}
              />
            </Card>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      {renderFilters()}
      
      <Spin spinning={loading}>
        <div style={{ maxHeight: virtualScroll ? maxHeight : 'none', overflow: 'auto' }}>
          {renderTimelineContent()}
        </div>
      </Spin>
    </div>
  );
};

export default EnhancedTaskTimelineV2;