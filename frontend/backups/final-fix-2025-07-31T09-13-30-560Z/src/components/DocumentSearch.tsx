// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
 Card,
 Input, 
 Typography,
 List,
 Empty, 
 Badge,
 Select,
 DatePicker, 
 message, 
 Collapse
} from 'antd';
import { 
 UserOutlined, 
 TagOutlined, 
 ClearOutlined, 
 StarOutlined,
 StarFilled, 
 HighlightOutlined
} from '@ant-design/icons';
import dayjs from '../utils/dayjs';
// 简单的debounce实现，避免lodash依赖
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const { RangePicker } = DatePicker;
const { Panel } = Collapse;

// 类型定义
interface SearchDocument {
  id: number;
  title: string;
  content?: string;
  type: 'markdown' | 'text' | 'pdf' | 'word' | 'excel' | 'image';
  status: 'draft' | 'published' | 'archived';
  description?: string;
  tags: string[];
  owner_id: number;
  owner_name: string;
  folder_id?: number;
  folder_name?: string;
  visibility: 'private' | 'team' | 'public';
  is_favorite?: boolean;
  file_size?: number;
  created_at: string;
  updated_at: string;
  // 搜索相关字段
  score?: number;
  highlights?: {
    title?: string[];
    content?: string[];
    description?: string[];
  };
}

interface SearchFilters {
  type?: string[];
  status?: string[];
  tags?: string[];
  owner_id?: number[];
  folder_id?: number[];
  visibility?: string[];
  date_range?: [string, string];
  file_size_range?: [number, number];
  is_favorite?: boolean;
}

interface DocumentSearchProps {
  onResultSelect?: (document: SearchDocument) => void;
  autoFocus?: boolean;
  defaultQuery?: string;
  maxResults?: number;
}

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  html: { label: 'HTML', color: 'green', icon: '🌐' },
  text: { label: 'Text', color: 'default', icon: '📄' },
  json: { label: 'JSON', color: 'purple', icon: '⚙️' },
  code: { label: 'Code', color: 'cyan', icon: '💻' },
  pdf: { label: 'PDF', color: 'red', icon: '📋' },
  word: { label: 'Word', color: 'blue', icon: '📘' },
  excel: { label: 'Excel', color: 'green', icon: '📊' },
  image: { label: 'Image', color: 'orange', icon: '🖼️' }
};

const DOCUMENT_STATUS = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

const VISIBILITY_CONFIG = {
  private: { label: '私有', color: 'red', icon: '🔒' },
  team: { label: '团队', color: 'blue', icon: '👥' },
  public: { label: '公开', color: 'green', icon: '🌍' }
};

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  onResultSelect,
  autoFocus = true,
  defaultQuery = '',
  maxResults = 50
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [searchResults, setSearchResults] = useState<SearchDocument[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchSuggestions, setSSearchSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // 搜索历史和热门搜索
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularSearches] = useState<string[]>([
    'API文档', '需求分析', '设计规范', '用户手册', '技术方案'
  ]);

  // 可选数据
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableOwners, setAvailableOwners] = useState<{id: number, name: string}[]>([]);
  const [availableFolders, setAvailableFolders] = useState<{id: number, name: string}[]>([]);

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((query: string, searchFilters: SearchFilters) => {
      performSearch(query, searchFilters);
    }, 300),
    []
  );

  useEffect(() => {
    // 加载搜索历史
    const history = localStorage.getItem('document_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    
    // 加载可选数据
    loadSearchOptions();
    
    // 如果有默认查询，执行搜索
    if (defaultQuery) {
      debouncedSearch(defaultQuery, {});
    }
  }, []);

  useEffect(() => {
    if (searchQuery || Object.keys(filters).length > 0) {
      debouncedSearch(searchQuery, filters);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
  }, [searchQuery, filters, debouncedSearch]);

  const loadSearchOptions = async () => {
    try {
      // TODO: 调用API获取搜索选项
      // const response = await documentSearchApi.getOptions();
      
      // 临时模拟数据
      setAvailableTags(['API', '文档', '设计', '需求', '分析', '手册', '规范', '方案']);
      setAvailableOwners([
        { id: 1, name: 'Admin' },
        { id: 2, name: '张三' },
        { id: 3, name: '李四' }
      ]);
      setAvailableFolders([
        { id: 1, name: '技术文档' },
        { id: 2, name: '项目文档' },
        { id: 3, name: '用户手册' }
      ]);
    } catch (error) {
      console.error('Failed to load search options:', error);
    }
  };

  const performSearch = async (query: string, searchFilters: SearchFilters) => {
    try {
      setLoading(true);
      
      // TODO: 调用搜索API
      // const response = await documentSearchApi.search({
      //   query,
      //   filters: searchFilters,
      //   limit: maxResults
      // });
      
      // 临时模拟搜索结果
      const mockResults: SearchDocument[] = [
        {
          id: 1,
          title: 'API接口设计文档',
          content: '# API接口设计\n\n本文档详细描述了系统各个模块的API接口设计和调用方式...',
          type: 'markdown',
          status: 'published',
          description: '详细描述了系统各个模块的API接口设计和调用方式',
          tags: ['API', '接口', '设计'],
          owner_id: 1,
          owner_name: 'Admin',
          folder_id: 1,
          folder_name: '技术文档',
          visibility: 'team',
          is_favorite: true,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-15T14:30:00Z',
          score: 0.95,
          highlights: {
            title: ['<mark>API</mark>接口设计文档'],
            content: ['本文档详细描述了系统各个模块的<mark>API</mark>接口设计']
          }
        },
        {
          id: 2,
          title: '项目需求分析报告',
          type: 'pdf',
          status: 'published',
          description: '项目需求分析详细报告，包含功能需求和非功能需求',
          tags: ['需求', '分析', '报告'],
          owner_id: 1,
          owner_name: 'Admin',
          folder_id: 2,
          folder_name: '项目文档',
          visibility: 'public',
          file_size: 2048576,
          created_at: '2024-01-02T09:00:00Z',
          updated_at: '2024-01-02T09:00:00Z',
          score: 0.88,
          highlights: {
            title: ['项目<mark>需求</mark>分析报告'],
            description: ['项目<mark>需求</mark>分析详细报告']
          }
        },
        {
          id: 3,
          title: '用户界面设计规范',
          content: '# UI设计规范\n\n## 颜色规范\n- 主色调: #1890ff\n- 辅助色: #52c41a',
          type: 'markdown',
          status: 'draft',
          description: 'UI设计规范和组件库使用指南',
          tags: ['UI', '设计', '规范'],
          owner_id: 2,
          owner_name: '张三',
          folder_id: 1,
          folder_name: '技术文档',
          visibility: 'team',
          created_at: '2024-01-10T16:20:00Z',
          updated_at: '2024-01-12T11:45:00Z',
          score: 0.76,
          highlights: {
            title: ['用户界面<mark>设计</mark>规范'],
            content: ['<mark>UI</mark>设计规范']
          }
        }
      ];
      
      // 根据查询过滤结果
      let filteredResults = mockResults;
      if (query) {
        filteredResults = mockResults.filter(doc => 
          doc.title.toLowerCase().includes(query.toLowerCase()) ||
          doc.description?.toLowerCase().includes(query.toLowerCase()) ||
          doc.content?.toLowerCase().includes(query.toLowerCase()) ||
          doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
      }
      
      setSearchResults(filteredResults);
      setTotalResults(filteredResults.length);
      
      // 保存搜索历史
      if (query && query.trim()) {
        saveSearchHistory(query.trim());
      }
      
    } catch (error) {
      message.error('搜索失败');
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const saveSearchHistory = (query: string) => {
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('document_search_history', JSON.stringify(newHistory));
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('document_search_history');
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleSuggestionSearch = (suggestion: string) => {
    setSearchQuery(suggestion);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const handleDocumentSelect = (document: SearchDocument) => {
    onResultSelect?.(document);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 10) / 10} ${sizes[i]}`;
  };

  const renderHighlightedText = (text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      highlightedText = highlight;
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div>
      <Card>
        {/* 搜索框 */}
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索文档标题、内容、标签..."
            allowClear
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            autoFocus={autoFocus}
            style={{ marginBottom: 16 }}
            addonAfter={
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                type={showAdvancedFilters ? 'primary' : 'default'}
              >
                高级筛选
              </Button>
            }
          />
          
          {/* 搜索建议 */}
          {!searchQuery && (
            <div>
              {searchHistory.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Space>
                    <Text type="secondary">搜索历史：</Text>
                    {searchHistory.slice(0, 5).map(item => (
                      <Tag
                        key={item}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSuggestionSearch(item)}
                      >
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {item}
                      </Tag>
                    ))}
                    <Button
                      type="text"
                      
                      icon={<ClearOutlined />}
                      onClick={clearSearchHistory}
                    >
                      清除历史
                    </Button>
                  </Space>
                </div>
              )}
              
              <div>
                <Space>
                  <Text type="secondary">热门搜索：</Text>
                  {popularSearches.map(item => (
                    <Tag
                      key={item}
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSuggestionSearch(item)}
                    >
                      {item}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          )}
        </div>

        {/* 高级筛选 */}
        {showAdvancedFilters && (
          <Collapse ghost>
            <Panel
              header="高级筛选选项"
              key="filters"
              extra={
                <Button
                  type="text"
                  
                  onClick={clearFilters}
                  icon={<ClearOutlined />}
                >
                  清除筛选
                </Button>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <Text strong>文档类型</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择文档类型"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.type}
                    onChange={(value) => handleFilterChange('type', value)}
                  >
                    {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                      <Option key={key} value={key}>
                        <Space>
                          <span>{config.icon}</span>
                          {config.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong>文档状态</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择文档状态"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                  >
                    {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                      <Option key={key} value={key}>
                        {config.label}
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong>标签</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择标签"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.tags}
                    onChange={(value) => handleFilterChange('tags', value)}
                  >
                    {availableTags.map(tag => (
                      <Option key={tag} value={tag}>
                        <TagOutlined /> {tag}
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong>所有者</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择所有者"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.owner_id}
                    onChange={(value) => handleFilterChange('owner_id', value)}
                  >
                    {availableOwners.map(owner => (
                      <Option key={owner.id} value={owner.id}>
                        <UserOutlined /> {owner.name}
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong>文件夹</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择文件夹"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.folder_id}
                    onChange={(value) => handleFilterChange('folder_id', value)}
                  >
                    {Array.isArray(availableFolders) ? availableFolders.map(folder => (
                      <Option key={folder.id} value={folder.id}>
                        <FolderOutlined /> {folder.name}
                      </Option>
                    )) : null}
                  </Select>
                </div>
                
                <div>
                  <Text strong>可见性</Text>
                  <Select
                    mode="multiple"
                    placeholder="选择可见性"
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.visibility}
                    onChange={(value) => handleFilterChange('visibility', value)}
                  >
                    {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                      <Option key={key} value={key}>
                        <Space>
                          <span>{config.icon}</span>
                          {config.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong>更新时间</Text>
                  <RangePicker
                    style={{ width: '100%', marginTop: 8 }}
                    value={filters.date_range ? [dayjs(filters.date_range[0]), dayjs(filters.date_range[1])] : null}
                    onChange={(dates) => {
                      if (dates) {
                        handleFilterChange('date_range', [dates[0]?.toISOString(), dates[1]?.toISOString()]);
                      } else {
                        handleFilterChange('date_range', undefined);
                      }
                    }}
                  />
                </div>
                
                <div>
                  <Checkbox
                    checked={filters.is_favorite}
                    onChange={(e) => handleFilterChange('is_favorite', e.target.checked ? true : undefined)}
                  >
                    仅显示收藏文档
                  </Checkbox>
                </div>
              </div>
            </Panel>
          </Collapse>
        )}

        {/* 搜索结果统计 */}
        {(searchQuery || Object.keys(filters).length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              找到 {totalResults} 个结果
              {searchQuery && ` 关于 "${searchQuery}"`}
            </Text>
          </div>
        )}

        {/* 搜索结果列表 */}
        <Spin spinning={loading}>
          {searchResults.length === 0 && !loading && (searchQuery || Object.keys(filters).length > 0) ? (
            <Empty
              description="未找到相关文档"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={clearFilters}>
                清除筛选条件
              </Button>
            </Empty>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={searchResults}
              renderItem={(document) => (
                <List.Item
                  key={document.id}
                  actions={[
                    <Tooltip title="查看">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleDocumentSelect(document)}
                      >
                        查看
                      </Button>
                    </Tooltip>,
                    <Tooltip title="下载">
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                      >
                        下载
                      </Button>
                    </Tooltip>,
                    <Tooltip title={document.is_favorite ? '取消收藏' : '收藏'}>
                      <Button
                        type="text"
                        icon={document.is_favorite ? <StarFilled /> : <StarOutlined />}
                        style={{ color: document.is_favorite ? '#faad14' : undefined }}
                      >
                        {document.is_favorite ? '已收藏' : '收藏'}
                      </Button>
                    </Tooltip>
                  ]}
                  extra={
                    <div style={{ textAlign: 'right' }}>
                      {document.score && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            匹配度: {Math.round(document.score * 100)}%
                          </Text>
                        </div>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(document.updated_at).fromNow()}
                        </Text>
                      </div>
                    </div>
                  }
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ fontSize: '24px' }}>
                        {DOCUMENT_TYPES[document.type]?.icon || '📄'}
                      </div>
                    }
                    title={
                      <Space>
                        <span 
                          style={{ cursor: 'pointer', fontSize: '16px' }}
                          onClick={() => handleDocumentSelect(document)}
                        >
                          {renderHighlightedText(document.title, document.highlights?.title)}
                        </span>
                        {document.is_favorite && (
                          <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
                        )}
                        <Tag color={DOCUMENT_TYPES[document.type]?.color} >
                          {DOCUMENT_TYPES[document.type]?.label}
                        </Tag>
                        <Badge 
                          status={DOCUMENT_STATUS[document.status]?.color as any} 
                          text={DOCUMENT_STATUS[document.status]?.label}
                        />
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          {document.highlights?.description ? 
                            renderHighlightedText(document.description || '', document.highlights.description) :
                            document.description
                          }
                        </div>
                        
                        <Space split={<Divider type="vertical" />} wrap>
                          <Space>
                            <UserOutlined />
                            <Text type="secondary">{document.owner_name}</Text>
                          </Space>
                          
                          {document.folder_name && (
                            <Space>
                              <FolderOutlined />
                              <Text type="secondary">{document.folder_name}</Text>
                            </Space>
                          )}
                          
                          {document.file_size && (
                            <Text type="secondary">{formatFileSize(document.file_size)}</Text>
                          )}
                          
                          <Space>
                            <span style={{ color: VISIBILITY_CONFIG[document.visibility].color }}>
                              {VISIBILITY_CONFIG[document.visibility].icon}
                            </span>
                            <Text type="secondary">{VISIBILITY_CONFIG[document.visibility].label}</Text>
                          </Space>
                        </Space>
                        
                        {document.tags.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Space wrap>
                              {document.tags.map(tag => (
                                <Tag 
                                  key={tag} 
                                  
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleSuggestionSearch(tag)}
                                >
                                  {tag}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                      </div>
                    }
                  />
                  
                  {/* 内容预览 */}
                  {document.highlights?.content && (
                    <div style={{ 
                      marginTop: 12,
                      padding: '8px 12px',
                      backgroundColor: '#fafafa',
                      borderRadius: '4px',
                      borderLeft: '3px solid #1890ff'
                    }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <HighlightOutlined /> 内容片段：
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {document.highlights.content.map((snippet, index) => (
                          <div key={index} style={{ fontSize: '13px', lineHeight: '1.5' }}>
                            <span dangerouslySetInnerHTML={{ __html: snippet }} />
                            {index < document.highlights!.content!.length - 1 && ' ... '}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default DocumentSearch;