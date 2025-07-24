import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Input, 
  Select, 
  Card, 
  List, 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Empty, 
  Spin,
  Tooltip,
  Pagination,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  FileTextOutlined,
  PictureOutlined,
  FilePdfOutlined,
  CalendarOutlined,
  UserOutlined,
  HighlightOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/documentService';
import { documentTypes, documentCategories } from './DocumentTypeSelector';
import { 
  Document, 
  DocumentType, 
  DocumentSearchResult, 
  DocumentSearchResponse 
} from '../types/document';
import { DocumentWithContent, DocumentSearchResultWithContent } from '../types/legacy';

const { Text, Title } = Typography;
const { Option } = Select;

interface DocumentSearchProps {
  projectId?: number;
  placeholder?: string;
  className?: string;
  onResultSelect?: (document: Document) => void;
  autoFocus?: boolean;
}

interface SearchFilters {
  type: DocumentType | 'all';
  category: string;
  status: string;
  dateRange: string;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  projectId,
  placeholder = '搜索文档内容、标题、标签...',
  className,
  onResultSelect,
  autoFocus = false
}) => {
  const navigate = useNavigate();
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  
  // 筛选状态
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    category: 'all',
    status: 'all',
    dateRange: 'all'
  });
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10
  });

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 模拟搜索API
  const performSearch = useCallback(async (
    query: string, 
    currentFilters: SearchFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<DocumentSearchResponse> => {
    const startTime = Date.now();
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    // 模拟搜索结果
    const mockResults: DocumentSearchResultWithContent[] = [
      {
        document: {
          id: 1,
          title: 'React开发最佳实践',
          content: 'React是一个用于构建用户界面的JavaScript库。本文档详细介绍了React开发的最佳实践，包括组件设计、状态管理、性能优化等方面。',
          type: 'markdown',
          project_id: projectId || 1,
          creator_id: 1,
          creator_name: '张开发',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-20T14:22:00Z',
          status: 'published',
          tags: ['project', 'technical']
        },
        highlights: [
          'React是一个用于构建用户界面的JavaScript库',
          '本文档详细介绍了React开发的最佳实践',
          '包括组件设计、状态管理、性能优化'
        ],
        match_score: 0.95
      },
      {
        document: {
          id: 2,
          title: 'API接口设计规范',
          content: 'RESTful API设计规范和最佳实践，包括URL设计、HTTP方法使用、状态码定义、错误处理等内容。本规范适用于所有后端API开发。',
          type: 'markdown',
          project_id: projectId || 1,
          creator_id: 2,
          creator_name: '李后端',
          created_at: '2024-01-12T09:15:00Z',
          updated_at: '2024-01-18T16:45:00Z',
          status: 'published',
          tags: ['project', 'technical_doc']
        },
        highlights: [
          'RESTful API设计规范和最佳实践',
          '包括URL设计、HTTP方法使用、状态码定义',
          '本规范适用于所有后端API开发'
        ],
        match_score: 0.87
      },
      {
        document: {
          id: 3,
          title: '用户界面设计指南',
          content: '本文档包含了用户界面设计的核心原则和实用指南，涵盖色彩搭配、字体选择、布局设计、交互设计等各个方面。',
          type: 'markdown',
          project_id: projectId || 1,
          creator_id: 3,
          creator_name: '王设计',
          created_at: '2024-01-10T14:20:00Z',
          updated_at: '2024-01-16T11:30:00Z',
          status: 'published',
          tags: ['user', 'manual']
        },
        highlights: [
          '用户界面设计的核心原则和实用指南',
          '涵盖色彩搭配、字体选择、布局设计',
          '交互设计等各个方面'
        ],
        match_score: 0.72
      }
    ];

    // 根据搜索查询过滤结果
    const filteredResults = mockResults.filter(result => {
      const { document } = result;
      
      // 文本匹配
      if (query.trim()) {
        const searchText = query.toLowerCase();
        const titleMatch = document.title.toLowerCase().includes(searchText);
        const contentMatch = document.content?.toLowerCase().includes(searchText);
        const tagMatch = document.tags?.some(tag => tag.toLowerCase().includes(searchText));
        
        if (!titleMatch && !contentMatch && !tagMatch) {
          return false;
        }
      }
      
      // 类型筛选
      if (currentFilters.type !== 'all' && document.type !== currentFilters.type) {
        return false;
      }
      
      // 分类筛选
      if (currentFilters.category !== 'all') {
        if (!document.tags?.includes(currentFilters.category)) {
          return false;
        }
      }
      
      // 状态筛选
      if (currentFilters.status !== 'all' && document.status !== currentFilters.status) {
        return false;
      }
      
      return true;
    });

    const searchTime = Date.now() - startTime;
    
    return {
      results: filteredResults.slice((page - 1) * pageSize, page * pageSize) as unknown as DocumentSearchResult[],
      total: filteredResults.length,
      query,
      took: searchTime
    };
  }, [projectId]);

  // 执行搜索
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const response = await performSearch(
        query, 
        filters, 
        pagination.current, 
        pagination.pageSize
      );
      
      setSearchResults(response.results);
      setTotal(response.total);
      setSearchTime(response.took);
      
      // 保存搜索历史
      if (query.trim() && !searchHistory.includes(query.trim())) {
        const newHistory = [query.trim(), ...searchHistory.slice(0, 9)];
        setSearchHistory(newHistory);
        localStorage.setItem('documentSearchHistory', JSON.stringify(newHistory));
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, performSearch, searchHistory]);

  // 处理筛选变化
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  }, [filters, searchQuery, handleSearch]);

  // 处理分页变化
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setPagination(prev => ({
      current: page,
      pageSize: pageSize || prev.pageSize
    }));
  }, []);

  // 获取文档类型显示
  const getTypeDisplay = (type: DocumentType) => {
    const config = documentTypes[type];
    return {
      icon: config.icon,
      color: config.color,
      name: config.name
    };
  };

  // 获取分类显示
  const getCategoryDisplay = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    const [categoryId] = tags;
    const category = documentCategories[categoryId as keyof typeof documentCategories];
    if (!category) return null;

    return (
      <Tag color={category.color}>
        {category.icon} {category.name}
      </Tag>
    );
  };

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  // 处理结果点击
  const handleResultClick = (result: DocumentSearchResult) => {
    if (onResultSelect) {
      onResultSelect(result.document as any);
    } else {
      navigate(`/documents/${result.document.id}/edit`);
    }
  };

  // 清空搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setTotal(0);
    setShowHistory(false);
  };

  // 初始化搜索历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('documentSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  return (
    <div className={className}>
      {/* 搜索输入框 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Input
              size="large"
              placeholder={placeholder}
              prefix={<SearchOutlined />}
              suffix={
                searchQuery && (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CloseOutlined />}
                    onClick={handleClearSearch}
                  />
                )
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              autoFocus={autoFocus}
            />
          </Col>
          
          <Col span={3}>
            <Select
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              style={{ width: '100%' }}
            >
              <Option value="all">全部类型</Option>
              {Object.values(documentTypes).map(type => (
                <Option key={type.type} value={type.type}>
                  <Space>
                    <span style={{ color: type.color }}>{type.icon}</span>
                    {type.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col span={3}>
            <Select
              value={filters.category}
              onChange={(value) => handleFilterChange('category', value)}
              style={{ width: '100%' }}
            >
              <Option value="all">全部分类</Option>
              {Object.values(documentCategories).map(category => (
                <Option key={category.id} value={category.id}>
                  <Space>
                    <span style={{ color: category.color }}>{category.icon}</span>
                    {category.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col span={3}>
            <Select
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Col>
          
          <Col span={3}>
            <Select
              value={filters.dateRange}
              onChange={(value) => handleFilterChange('dateRange', value)}
              style={{ width: '100%' }}
            >
              <Option value="all">全部时间</Option>
              <Option value="today">今天</Option>
              <Option value="week">本周</Option>
              <Option value="month">本月</Option>
              <Option value="year">今年</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 搜索历史 */}
      {showHistory && searchHistory.length > 0 && !searchQuery && (
        <Card style={{ marginBottom: '16px' }}>
          <Title level={5}>搜索历史</Title>
          <Space wrap>
            {searchHistory.map((historyQuery, index) => (
              <Tag
                key={index}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSearchQuery(historyQuery);
                  setShowHistory(false);
                }}
              >
                {historyQuery}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* 搜索结果 */}
      {searchQuery && (
        <Card>
          {/* 搜索统计 */}
          {(searchResults.length > 0 || !loading) && (
            <div style={{ marginBottom: '16px', color: '#666' }}>
              <Space>
                <Text>
                  找到 <strong>{total}</strong> 个结果
                </Text>
                <Text>
                  耗时 <strong>{searchTime}ms</strong>
                </Text>
              </Space>
            </div>
          )}

          {/* 搜索结果列表 */}
          <Spin spinning={loading}>
            {searchResults.length > 0 ? (
              <>
                <List
                  dataSource={searchResults}
                  renderItem={(result) => {
                    const typeDisplay = getTypeDisplay(result.document.type);
                    
                    return (
                      <List.Item
                        key={result.document.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleResultClick(result)}
                      >
                        <List.Item.Meta
                          avatar={
                            <span style={{ color: typeDisplay.color, fontSize: '20px' }}>
                              {typeDisplay.icon}
                            </span>
                          }
                          title={
                            <Space>
                              {highlightText(result.document.title, searchQuery)}
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                匹配度: {(result.match_score * 100).toFixed(0)}%
                              </Text>
                            </Space>
                          }
                          description={
                            <div>
                              {/* 高亮片段 */}
                              <div style={{ marginBottom: '8px' }}>
                                {result.highlights.map((highlight, index) => (
                                  <div key={index} style={{ marginBottom: '4px' }}>
                                    <HighlightOutlined style={{ marginRight: '4px', color: '#faad14' }} />
                                    {highlightText(highlight, searchQuery)}
                                  </div>
                                ))}
                              </div>
                              
                              {/* 元信息 */}
                              <Space size="small">
                                {getCategoryDisplay(result.document.tags)}
                                <Tag color="blue">{typeDisplay.name}</Tag>
                                <Space size={4}>
                                  <UserOutlined />
                                  <Text type="secondary">{result.document.creator_name}</Text>
                                </Space>
                                <Space size={4}>
                                  <CalendarOutlined />
                                  <Text type="secondary">
                                    {new Date(result.document.updated_at).toLocaleDateString()}
                                  </Text>
                                </Space>
                              </Space>
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
                
                {/* 分页 */}
                {total > pagination.pageSize && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Pagination
                      current={pagination.current}
                      pageSize={pagination.pageSize}
                      total={total}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total, range) => 
                        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                      }
                      onChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : !loading && searchQuery ? (
              <Empty
                description="未找到相关文档"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : null}
          </Spin>
        </Card>
      )}
    </div>
  );
};

export default DocumentSearch;