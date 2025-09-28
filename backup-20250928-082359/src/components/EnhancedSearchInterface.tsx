import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Table,
  Typography,
  Tag,
  Row,
  Col,
  Pagination,
  Empty,
  Spin,
  AutoComplete,
  Tooltip,
  Badge,
  Modal,
  Form,
  DatePicker,
  Slider,
  Checkbox,
  message,
  Divider,
  Statistic,
  Progress
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  FilterOutlined,
  SaveOutlined,
  HistoryOutlined,
  FileTextOutlined,
  ProjectOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  SettingOutlined,
  BookOutlined,
  TeamOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { debounce } from 'lodash';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// 搜索结果接口
interface SearchResult {
  id: number;
  type: 'document' | 'task' | 'project' | 'user';
  title: string;
  description: string;
  content?: string;
  url: string;
  thumbnail?: string;
  score: number;
  highlights: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_name: string;
  tags: string[];
  category: string;
  status: string;
  file_size?: number;
  file_type?: string;
  project_id?: number;
  project_name?: string;
}

// 搜索响应接口
interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
  search_time: number;
  facets: Record<string, any>;
  suggestions: string[];
}

// 搜索过滤器接口
interface SearchFilter {
  query: string;
  type?: string;
  categories?: string[];
  tags?: string[];
  date_from?: string;
  date_to?: string;
  created_by?: number[];
  assigned_to?: number[];
  project_ids?: number[];
  status?: string[];
  priority?: string[];
  file_types?: string[];
  size_min?: number;
  size_max?: number;
  include_content: boolean;
  sort_by: string;
  sort_order: string;
  page: number;
  limit: number;
}

// 保存的搜索接口
interface SavedSearch {
  id: number;
  name: string;
  query: string;
  filters: Record<string, any>;
  created_at: string;
}

interface EnhancedSearchInterfaceProps {
  mode?: 'standalone' | 'embedded';
  projectId?: number;
  onResultSelect?: (result: SearchResult) => void;
  initialQuery?: string;
  compactMode?: boolean;
}

const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  mode = 'standalone',
  projectId,
  onResultSelect,
  initialQuery = '',
  compactMode = false
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [facets, setFacets] = useState<Record<string, any>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  // 搜索过滤器状态
  const [filter, setFilter] = useState<SearchFilter>({
    query: initialQuery,
    type: '',
    categories: [],
    tags: [],
    status: [],
    priority: [],
    file_types: [],
    include_content: false,
    sort_by: 'relevance',
    sort_order: 'desc',
    page: 1,
    limit: 20
  });

  // UI状态
  const [filterVisible, setFilterVisible] = useState(false);
  const [saveSearchVisible, setSaveSearchVisible] = useState(false);
  const [savedSearchesVisible, setSavedSearchesVisible] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<string[]>([]);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);

  // 表单状态
  const [saveSearchForm] = Form.useForm();

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((searchFilter: SearchFilter) => {
      performSearch(searchFilter);
    }, 300),
    []
  );

  // 执行搜索
  const performSearch = async (searchFilter: SearchFilter) => {
    if (!searchFilter.query.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // 基本参数
      params.append('q', searchFilter.query);
      if (searchFilter.type) params.append('type', searchFilter.type);
      params.append('page', searchFilter.page.toString());
      params.append('limit', searchFilter.limit.toString());
      params.append('sort_by', searchFilter.sort_by);
      params.append('sort_order', searchFilter.sort_order);
      params.append('include_content', searchFilter.include_content.toString());

      // 数组参数
      searchFilter.categories?.forEach(cat => params.append('categories', cat));
      searchFilter.tags?.forEach(tag => params.append('tags', tag));
      searchFilter.status?.forEach(status => params.append('status', status));
      searchFilter.priority?.forEach(priority => params.append('priority', priority));
      searchFilter.file_types?.forEach(type => params.append('file_types', type));
      searchFilter.created_by?.forEach(id => params.append('created_by', id.toString()));
      searchFilter.assigned_to?.forEach(id => params.append('assigned_to', id.toString()));
      searchFilter.project_ids?.forEach(id => params.append('project_ids', id.toString()));

      // 日期和大小过滤
      if (searchFilter.date_from) params.append('date_from', searchFilter.date_from);
      if (searchFilter.date_to) params.append('date_to', searchFilter.date_to);
      if (searchFilter.size_min) params.append('size_min', searchFilter.size_min.toString());
      if (searchFilter.size_max) params.append('size_max', searchFilter.size_max.toString());

      // 项目范围
      if (projectId) params.append('project_ids', projectId.toString());

      const response = await fetch(`/api/v1/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        const searchResponse: SearchResponse = data.data;
        setResults(searchResponse.results);
        setTotalCount(searchResponse.total_count);
        setSearchTime(searchResponse.search_time);
        setFacets(searchResponse.facets);
        setSuggestions(searchResponse.suggestions);
      } else {
        message.error(data.message || '搜索失败');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动完成搜索
  const handleAutoComplete = async (value: string) => {
    if (!value.trim()) {
      setAutoCompleteOptions([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('q', value);
      params.append('limit', '10');
      if (filter.type) params.append('type', filter.type);

      const response = await fetch(`/api/v1/search/autocomplete?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAutoCompleteOptions(data.data);
      }
    } catch (error) {
      console.error('自动完成失败:', error);
    }
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    const newFilter = { ...filter, query: value, page: 1 };
    setFilter(newFilter);
    debouncedSearch(newFilter);
  };

  // 过滤器变更
  const handleFilterChange = (key: keyof SearchFilter, value: any) => {
    const newFilter = { ...filter, [key]: value, page: 1 };
    setFilter(newFilter);
    if (newFilter.query.trim()) {
      debouncedSearch(newFilter);
    }
  };

  // 分页变更
  const handlePageChange = (page: number, pageSize?: number) => {
    const newFilter = { 
      ...filter, 
      page, 
      limit: pageSize || filter.limit 
    };
    setFilter(newFilter);
    performSearch(newFilter);
  };

  // 保存搜索
  const handleSaveSearch = async (values: any) => {
    try {
      const response = await fetch('/api/v1/search/saved', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: values.name,
          query: filter.query,
          filters: filter
        })
      });

      const data = await response.json();
      if (data.success) {
        message.success('搜索已保存');
        setSaveSearchVisible(false);
        saveSearchForm.resetFields();
        loadSavedSearches();
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存搜索失败:', error);
      message.error('保存搜索失败');
    }
  };

  // 加载保存的搜索
  const loadSavedSearches = async () => {
    try {
      const response = await fetch('/api/v1/search/saved', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSavedSearches(data.data);
      }
    } catch (error) {
      console.error('加载保存的搜索失败:', error);
    }
  };

  // 使用保存的搜索
const handleUseSavedSearch = (savedSearch: SavedSearch) => {
    const savedFilter: SearchFilter = { ...(savedSearch.filters as SearchFilter), page: 1 };
    setFilter(savedFilter);
    performSearch(savedFilter);
    setSavedSearchesVisible(false);
  };

  // 删除保存的搜索
  const handleDeleteSavedSearch = async (searchId: number) => {
    try {
      const response = await fetch(`/api/v1/search/saved/${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        message.success('搜索已删除');
        loadSavedSearches();
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除保存的搜索失败:', error);
      message.error('删除保存的搜索失败');
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'task': return <BookOutlined style={{ color: '#52c41a' }} />;
      case 'project': return <ProjectOutlined style={{ color: '#fa8c16' }} />;
      case 'user': return <UserOutlined style={{ color: '#722ed1' }} />;
      default: return <FolderOutlined />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': case 'completed': return 'green';
      case 'draft': case 'in_progress': return 'orange';
      case 'archived': case 'cancelled': return 'gray';
      case 'todo': case 'pending': return 'blue';
      default: return 'default';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
  };

  // 高亮文本
  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      if (highlight.includes('<mark>')) {
        highlightedText = highlight;
      }
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // 表格列定义
  const columns: ColumnsType<SearchResult> = [
    {
      title: '内容',
      key: 'content',
      render: (_, record) => (
        <Space direction="vertical"  style={{ width: '100%' }}>
          <Space>
            {getTypeIcon(record.type)}
            <Text strong>{highlightText(record.title, record.highlights)}</Text>
            <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
            {record.score > 0 && (
              <Tag color="gold">匹配度: {Math.round(record.score * 100)}%</Tag>
            )}
          </Space>
          
          {record.description && (
            <Paragraph ellipsis={{ rows: 2 }}>
              {highlightText(record.description, record.highlights)}
            </Paragraph>
          )}
          
          <Space wrap>
            {record.project_name && (
              <Tag icon={<ProjectOutlined />} color="blue">
                {record.project_name}
              </Tag>
            )}
            {record.tags.map(tag => (
              <Tag key={tag} icon={<TagOutlined />}>{tag}</Tag>
            ))}
            {record.file_size && (
              <Text type="secondary">{formatFileSize(record.file_size)}</Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 120,
      render: (name) => (
        <Space>
          <UserOutlined />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date) => (
        <Text type="secondary">
          {moment(date).format('YYYY-MM-DD HH:mm')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              
              onClick={() => {
                if (onResultSelect) {
                  onResultSelect(record);
                } else {
                  window.open(record.url, '_blank');
                }
              }}
            />
          </Tooltip>
          {record.file_size && (
            <Tooltip title="下载">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                
                onClick={() => window.open(`${record.url}/download`, '_blank')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 初始化
  useEffect(() => {
    loadSavedSearches();
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  // 渲染过滤器面板
  const renderFilterPanel = () => (
    <Card  style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Text strong>内容类型</Text>
          <Select
            style={{ width: '100%' }}
            placeholder="选择内容类型"
            value={filter.type}
            onChange={(value) => handleFilterChange('type', value)}
            allowClear
          >
            <Option value="document">文档</Option>
            <Option value="task">任务</Option>
            <Option value="project">项目</Option>
            <Option value="user">用户</Option>
          </Select>
        </Col>
        
        <Col span={6}>
          <Text strong>状态</Text>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择状态"
            value={filter.status}
            onChange={(value) => handleFilterChange('status', value)}
            allowClear
          >
            <Option value="published">已发布</Option>
            <Option value="draft">草稿</Option>
            <Option value="completed">已完成</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="todo">待办</Option>
            <Option value="archived">已归档</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Text strong>文件类型</Text>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择文件类型"
            value={filter.file_types}
            onChange={(value) => handleFilterChange('file_types', value)}
            allowClear
          >
            <Option value="markdown">Markdown</Option>
            <Option value="pdf">PDF</Option>
            <Option value="text">文本</Option>
          </Select>
        </Col>

        <Col span={6}>
          <Text strong>排序方式</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ width: '70%' }}
              value={filter.sort_by}
              onChange={(value) => handleFilterChange('sort_by', value)}
            >
              <Option value="relevance">相关性</Option>
              <Option value="date">日期</Option>
              <Option value="size">大小</Option>
              <Option value="title">标题</Option>
            </Select>
            <Select
              style={{ width: '30%' }}
              value={filter.sort_order}
              onChange={(value) => handleFilterChange('sort_order', value)}
            >
              <Option value="desc">降序</Option>
              <Option value="asc">升序</Option>
            </Select>
          </Space.Compact>
        </Col>

        <Col span={12}>
          <Text strong>日期范围</Text>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(dates) => {
              handleFilterChange('date_from', dates?.[0]?.toISOString());
              handleFilterChange('date_to', dates?.[1]?.toISOString());
            }}
          />
        </Col>

        <Col span={12}>
          <Space>
            <Checkbox
              checked={filter.include_content}
              onChange={(e) => handleFilterChange('include_content', e.target.checked)}
            >
              包含内容
            </Checkbox>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染统计信息
  const renderStats = () => (
    <Card  style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="搜索结果"
            value={totalCount}
            prefix={<SearchOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="搜索时间"
            value={searchTime}
            suffix="ms"
            precision={0}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="当前页"
            value={filter.page}
            suffix={`/ ${Math.ceil(totalCount / filter.limit)}`}
          />
        </Col>
        <Col span={6}>
          <Space>
            {suggestions.length > 0 && (
              <Tooltip title={`建议: ${suggestions.join(', ')}`}>
                <Badge count={suggestions.length}>
                  <Button icon={<StarOutlined />} >建议</Button>
                </Badge>
              </Tooltip>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: mode === 'standalone' ? 24 : 0 }}>
      {/* 搜索头部 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 搜索输入 */}
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <AutoComplete
                style={{ width: '100%' }}
                options={autoCompleteOptions.map(option => ({ value: option }))}
                onSearch={handleAutoComplete}
                onSelect={handleSearch}
              >
                <Search
                  placeholder="搜索文档、任务、项目..."
                  value={filter.query}
                  onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                  onSearch={handleSearch}
                  size="large"
                  enterButton
                  loading={loading}
                />
              </AutoComplete>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterVisible(!filterVisible)}
                  type={filterVisible ? 'primary' : 'default'}
                >
                  筛选
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => setSaveSearchVisible(true)}
                  disabled={!filter.query.trim()}
                >
                  保存
                </Button>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => setSavedSearchesVisible(true)}
                >
                  历史
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 快捷筛选 */}
          <Row gutter={8}>
            <Col>
              <Text type="secondary">快捷筛选:</Text>
            </Col>
            <Col>
              <Button
                
                type={filter.type === 'document' ? 'primary' : 'default'}
                onClick={() => handleFilterChange('type', filter.type === 'document' ? '' : 'document')}
              >
                文档
              </Button>
            </Col>
            <Col>
              <Button
                
                type={filter.type === 'task' ? 'primary' : 'default'}
                onClick={() => handleFilterChange('type', filter.type === 'task' ? '' : 'task')}
              >
                任务
              </Button>
            </Col>
            <Col>
              <Button
                
                type={filter.type === 'project' ? 'primary' : 'default'}
                onClick={() => handleFilterChange('type', filter.type === 'project' ? '' : 'project')}
              >
                项目
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 过滤器面板 */}
      {filterVisible && renderFilterPanel()}

      {/* 统计信息 */}
      {results.length > 0 && renderStats()}

      {/* 搜索结果 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">搜索中...</Text>
            </div>
          </div>
        ) : results.length > 0 ? (
          <>
            <Table
              columns={columns}
              dataSource={results}
              rowKey="id"
              pagination={false}
              
rowSelection={compactMode ? undefined : {
                selectedRowKeys: selectedResults,
                onChange: (keys) => setSelectedResults(keys as number[]),
              }}
            />
            
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Pagination
                current={filter.page}
                total={totalCount}
                pageSize={filter.limit}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条结果`
                }
                onChange={handlePageChange}
              />
            </div>
          </>
        ) : filter.query.trim() ? (
          <Empty
            description="没有找到匹配的结果"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {suggestions.length > 0 && (
              <Space direction="vertical">
                <Text type="secondary">建议尝试：</Text>
                <Space wrap>
                  {suggestions.map(suggestion => (
                    <Button
                      key={suggestion}
                      
                      onClick={() => handleSearch(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </Space>
              </Space>
            )}
          </Empty>
        ) : (
          <Empty
            description="输入关键词开始搜索"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 保存搜索模态框 */}
      <Modal
        title="保存搜索"
        open={saveSearchVisible}
        onCancel={() => setSaveSearchVisible(false)}
        onOk={() => saveSearchForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={saveSearchForm} onFinish={handleSaveSearch}>
          <Form.Item
            name="name"
            label="搜索名称"
            rules={[{ required: true, message: '请输入搜索名称' }]}
          >
            <Input placeholder="为这个搜索起个名字" />
          </Form.Item>
          <Form.Item label="搜索内容">
            <Text code>{filter.query}</Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* 保存的搜索模态框 */}
      <Modal
        title="保存的搜索"
        open={savedSearchesVisible}
        onCancel={() => setSavedSearchesVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {savedSearches.length > 0 ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {savedSearches.map(search => (
                <Card
                  key={search.id}
                  
                  actions={[
                    <Button
                      type="link"
                      onClick={() => handleUseSavedSearch(search)}
                    >
                      使用
                    </Button>,
                    <Button
                      type="link"
                      danger
                      onClick={() => handleDeleteSavedSearch(search.id)}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={search.name}
                    description={
                      <Space direction="vertical" >
                        <Text code>{search.query}</Text>
                        <Text type="secondary">
                          {moment(search.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="暂无保存的搜索" />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EnhancedSearchInterface;