import React, { useState, useEffect, useMemo } from 'react';
import {
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Popover,
  Form,
  Switch,
  Slider,
  Badge,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Typography,
  Collapse,
  AutoComplete
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  HistoryOutlined,
  DownOutlined,
  CalendarOutlined,
  UserOutlined,
  TagsOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';
import { 
  TaskTimelineEvent, 
  TimelineEventFilter, 
  TaskTimelineEventType,
  EventCategory,
  EventSeverity,
  TimelineUtils 
} from '../../types/timeline';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

export interface AdvancedSearchFilter extends TimelineEventFilter {
  // 文本搜索
  searchTerm?: string;
  searchFields?: string[]; // 指定搜索的字段
  searchMode?: 'contains' | 'exact' | 'regex'; // 搜索模式
  caseSensitive?: boolean;
  
  // 时间范围
  dateRange?: [Dayjs, Dayjs] | null;
  timeRange?: [number, number]; // 一天中的时间范围 (0-23小时)
  relativeDateRange?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'last_year';
  
  // 用户和权限
  userIds?: number[];
  excludeUsers?: string[];
  includeSystemEvents?: boolean;
  
  // 内容过滤
  hasMetadata?: boolean;
  metadataKeys?: string[];
  metadataSearch?: string;
  
  // 高级过滤
  eventFrequency?: 'rare' | 'common' | 'frequent'; // 基于事件频率过滤
  impactLevel?: 'low' | 'medium' | 'high'; // 基于影响级别过滤
  relatedTasks?: number[]; // 相关任务过滤
  
  // 模式识别
  patternType?: 'error_clusters' | 'completion_streaks' | 'activity_bursts' | 'automation_patterns';
  
  // 保存的过滤器
  savedFilterName?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filter: AdvancedSearchFilter;
  createdAt: string;
  usageCount: number;
}

interface AdvancedSearchProps {
  events: TaskTimelineEvent[];
  onFilterChange: (filter: AdvancedSearchFilter) => void;
  initialFilter?: Partial<AdvancedSearchFilter>;
  showPresets?: boolean;
  allowSaveFilters?: boolean;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  events,
  onFilterChange,
  initialFilter = {},
  showPresets = true,
  allowSaveFilters = true
}) => {
  const [form] = Form.useForm();
  const [filter, setFilter] = useState<AdvancedSearchFilter>(initialFilter);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // 从events中提取搜索建议
  const searchSuggestions_computed = useMemo(() => {
    const suggestions = new Set<string>();
    
    events.forEach(event => {
      // 添加用户名
      if (event.username) suggestions.add(event.username);
      
      // 添加事件类型描述
      suggestions.add(TimelineUtils.getEventTypeDescription(event.event_type));
      
      // 添加任务标题关键词
      if (event.task_title) {
        event.task_title.split(/\s+/).forEach(word => {
          if (word.length > 2) suggestions.add(word);
        });
      }
      
      // 添加描述关键词
      event.description.split(/\s+/).forEach(word => {
        if (word.length > 2) suggestions.add(word);
      });
      
      // 添加元数据值
      if (event.metadata) {
        Object.values(event.metadata).forEach(value => {
          if (typeof value === 'string' && value.length > 2) {
            suggestions.add(value);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 50); // 限制建议数量
  }, [events]);

  // 预设过滤器
  const presetFilters = useMemo(() => [
    {
      name: '最近活动',
      filter: { 
        relativeDateRange: 'last_day' as const,
        searchTerm: ''
      },
      icon: <HistoryOutlined />,
      color: 'blue'
    },
    {
      name: '错误和警告',
      filter: { 
        severities: ['warning', 'error'],
        searchTerm: ''
      },
      icon: <FilterOutlined />,
      color: 'red'
    },
    {
      name: '系统自动化',
      filter: { 
        categories: ['system'],
        patternType: 'automation_patterns' as const,
        searchTerm: ''
      },
      icon: <SettingOutlined />,
      color: 'green'
    },
    {
      name: '用户操作',
      filter: { 
        categories: ['user'],
        includeSystemEvents: false,
        searchTerm: ''
      },
      icon: <UserOutlined />,
      color: 'purple'
    },
    {
      name: '任务完成',
      filter: { 
        eventTypes: ['completed', 'status_changed'],
        searchTerm: '完成|完结|结束'
      },
      icon: <TagsOutlined />,
      color: 'orange'
    }
  ], []);

  // 应用过滤器
  const applyFilter = (newFilter: AdvancedSearchFilter) => {
    setFilter(newFilter);
    form.setFieldsValue(newFilter);
    onFilterChange(newFilter);
  };

  // 清除过滤器
  const clearFilter = () => {
    const emptyFilter: AdvancedSearchFilter = {};
    applyFilter(emptyFilter);
  };

  // 保存过滤器
  const saveFilter = (name: string) => {
    const savedFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filter: { ...filter },
      createdAt: new Date().toISOString(),
      usageCount: 0
    };
    
    setSavedFilters(prev => [savedFilter, ...prev.slice(0, 9)]); // 保持最多10个
    
    // 这里可以持久化到localStorage
    const saved = JSON.parse(localStorage.getItem('timeline_saved_filters') || '[]');
    saved.unshift(savedFilter);
    localStorage.setItem('timeline_saved_filters', JSON.stringify(saved.slice(0, 10)));
  };

  // 加载保存的过滤器
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('timeline_saved_filters') || '[]');
    setSavedFilters(saved);
  }, []);

  // 生成活跃过滤器标签
  const getActiveFilterTags = () => {
    const tags = [];
    
    if (filter.searchTerm) {
      tags.push({ key: 'search', label: `搜索: ${filter.searchTerm}`, color: 'blue' });
    }
    
    if (filter.dateRange) {
      const [start, end] = filter.dateRange;
      tags.push({ 
        key: 'dateRange', 
        label: `时间: ${start.format('MM-DD')} - ${end.format('MM-DD')}`,
        color: 'green'
      });
    }
    
    if (filter.relativeDateRange) {
      const labels = {
        last_hour: '最近1小时',
        last_day: '最近1天',
        last_week: '最近1周',
        last_month: '最近1月',
        last_year: '最近1年'
      };
      tags.push({ 
        key: 'relativeDateRange', 
        label: labels[filter.relativeDateRange],
        color: 'cyan'
      });
    }
    
    if (filter.eventTypes?.length) {
      tags.push({ 
        key: 'eventTypes', 
        label: `事件类型: ${filter.eventTypes.length}个`,
        color: 'purple'
      });
    }
    
    if (filter.severities?.length) {
      tags.push({ 
        key: 'severities', 
        label: `严重性: ${filter.severities.length}个`,
        color: 'red'
      });
    }
    
    if (filter.categories?.length) {
      tags.push({ 
        key: 'categories', 
        label: `分类: ${filter.categories.length}个`,
        color: 'orange'
      });
    }

    return tags;
  };

  // 渲染高级搜索表单
  const renderAdvancedForm = () => (
    <Card size="small" style={{ marginTop: 16 }}>
      <Form form={form} layout="vertical" onFinish={applyFilter}>
        <Collapse ghost>
          <Panel header="文本搜索选项" key="text">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="searchFields" label="搜索字段">
                  <Select mode="multiple" placeholder="选择搜索字段">
                    <Option value="description">描述</Option>
                    <Option value="username">用户名</Option>
                    <Option value="task_title">任务标题</Option>
                    <Option value="metadata">元数据</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="searchMode" label="搜索模式">
                  <Select defaultValue="contains">
                    <Option value="contains">包含</Option>
                    <Option value="exact">精确匹配</Option>
                    <Option value="regex">正则表达式</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="caseSensitive" valuePropName="checked">
              <Switch checkedChildren="区分大小写" unCheckedChildren="忽略大小写" />
            </Form.Item>
          </Panel>

          <Panel header="时间范围" key="time">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dateRange" label="日期范围">
                  <RangePicker 
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="relativeDateRange" label="相对时间">
                  <Select placeholder="选择相对时间范围" allowClear>
                    <Option value="last_hour">最近1小时</Option>
                    <Option value="last_day">最近1天</Option>
                    <Option value="last_week">最近1周</Option>
                    <Option value="last_month">最近1月</Option>
                    <Option value="last_year">最近1年</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="timeRange" label="时间段 (0-23小时)">
              <Slider 
                range 
                min={0} 
                max={23} 
                marks={{ 0: '0时', 6: '6时', 12: '12时', 18: '18时', 23: '23时' }}
              />
            </Form.Item>
          </Panel>

          <Panel header="内容过滤" key="content">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="hasMetadata" valuePropName="checked">
                  <Switch checkedChildren="包含元数据" unCheckedChildren="所有事件" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="includeSystemEvents" valuePropName="checked">
                  <Switch checkedChildren="包含系统事件" unCheckedChildren="仅用户事件" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="metadataSearch" label="元数据搜索">
              <Input.Search placeholder="搜索元数据内容" />
            </Form.Item>
          </Panel>

          <Panel header="模式识别" key="patterns">
            <Form.Item name="patternType" label="事件模式">
              <Select placeholder="选择事件模式" allowClear>
                <Option value="error_clusters">错误聚集</Option>
                <Option value="completion_streaks">完成连击</Option>
                <Option value="activity_bursts">活动激增</Option>
                <Option value="automation_patterns">自动化模式</Option>
              </Select>
            </Form.Item>
            <Form.Item name="eventFrequency" label="事件频率">
              <Select placeholder="基于频率过滤" allowClear>
                <Option value="rare">罕见事件</Option>
                <Option value="common">常见事件</Option>
                <Option value="frequent">频繁事件</Option>
              </Select>
            </Form.Item>
          </Panel>
        </Collapse>

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            应用过滤器
          </Button>
          <Button onClick={clearFilter} icon={<ClearOutlined />}>
            清除
          </Button>
          {allowSaveFilters && (
            <Button 
              icon={<SaveOutlined />}
              onClick={() => {
                const name = prompt('输入过滤器名称:');
                if (name) saveFilter(name);
              }}
            >
              保存过滤器
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );

  return (
    <div className="advanced-search">
      {/* 主搜索输入 */}
      <Space.Compact style={{ width: '100%' }}>
        <AutoComplete
          style={{ flex: 1 }}
          placeholder="搜索事件、用户、任务..."
          options={searchSuggestions_computed.map(item => ({ value: item }))}
          value={filter.searchTerm}
          onChange={(value) => {
            const newFilter = { ...filter, searchTerm: value };
            applyFilter(newFilter);
          }}
          filterOption={(inputValue, option) =>
            option?.value.toLowerCase().includes(inputValue.toLowerCase()) ?? false
          }
        >
          <Input
            prefix={<SearchOutlined />}
            suffix={
              <Button 
                type="text" 
                size="small"
                icon={<FilterOutlined />}
                onClick={() => setShowAdvanced(!showAdvanced)}
              />
            }
          />
        </AutoComplete>
        <Button 
          icon={<ClearOutlined />}
          onClick={clearFilter}
          disabled={Object.keys(filter).length === 0}
        >
          清除
        </Button>
      </Space.Compact>

      {/* 预设过滤器 */}
      {showPresets && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Text type="secondary">快速过滤:</Text>
            {presetFilters.map((preset, index) => (
              <Tag
                key={index}
                icon={preset.icon}
                color={preset.color}
                style={{ cursor: 'pointer' }}
                onClick={() => applyFilter(preset.filter)}
              >
                {preset.name}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 活跃过滤器标签 */}
      {getActiveFilterTags().length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Text type="secondary">当前过滤:</Text>
            {getActiveFilterTags().map((tag) => (
              <Tag
                key={tag.key}
                color={tag.color}
                closable
                onClose={() => {
                  const newFilter = { ...filter };
                  delete (newFilter as any)[tag.key];
                  applyFilter(newFilter);
                }}
              >
                {tag.label}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 保存的过滤器 */}
      {savedFilters.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Popover
            title="保存的过滤器"
            content={
              <div style={{ width: 200 }}>
                {savedFilters.map(savedFilter => (
                  <div key={savedFilter.id} style={{ marginBottom: 8 }}>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, textAlign: 'left' }}
                      onClick={() => applyFilter(savedFilter.filter)}
                    >
                      {savedFilter.name}
                    </Button>
                    <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>
                      ({dayjs(savedFilter.createdAt).format('MM-DD')})
                    </Text>
                  </div>
                ))}
              </div>
            }
            trigger="hover"
          >
            <Button size="small" type="text" icon={<HistoryOutlined />}>
              保存的过滤器 ({savedFilters.length})
            </Button>
          </Popover>
        </div>
      )}

      {/* 高级搜索表单 */}
      {showAdvanced && renderAdvancedForm()}
    </div>
  );
};

export default AdvancedSearch;