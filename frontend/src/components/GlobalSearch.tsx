import React, { useState, useCallback, useRef } from 'react';
import {
  Input,
  AutoComplete,
  Button,
  Dropdown,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  Divider
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  ProjectOutlined,
  UserOutlined,
  BookOutlined,
  SettingOutlined,
  HistoryOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { debounce } from 'lodash';
import { searchService, SearchResult } from '../services/searchService';
import EnhancedSearchInterface from './EnhancedSearchInterface';

const { Search } = Input;
const { Text } = Typography;

interface GlobalSearchProps {
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  onResultSelect?: (result: SearchResult) => void;
}

interface SearchOption {
  value: string;
  label: React.ReactNode;
  type?: string;
  result?: SearchResult;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = '搜索文档、任务、项目...',
  size = 'middle',
  style,
  onResultSelect
}) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<any>(null);

  // 防抖搜索建议
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        // 获取搜索建议
        const suggestions = await searchService.getAutocompleteSuggestions(searchQuery, undefined, 8);
        
        // 执行快速搜索获取实际结果
        const searchResults = await searchService.search({
          query: searchQuery,
          limit: 5,
          include_content: false
        });

        const searchOptions: SearchOption[] = [];

        // 添加搜索建议
        if (suggestions.length > 0) {
          searchOptions.push({
            value: 'suggestions-header',
            label: (
              <div style={{ padding: '4px 0', color: '#999', fontSize: '12px' }}>
                搜索建议
              </div>
            )
          });

          suggestions.forEach(suggestion => {
            searchOptions.push({
              value: suggestion,
              label: (
                <div style={{ padding: '4px 0' }}>
                  <Space>
                    <SearchOutlined style={{ color: '#1890ff' }} />
                    <Text>{suggestion}</Text>
                  </Space>
                </div>
              ),
              type: 'suggestion'
            });
          });
        }

        // 添加实际搜索结果
        if (searchResults.results.length > 0) {
          if (suggestions.length > 0) {
            searchOptions.push({
              value: 'divider-1',
              label: <Divider style={{ margin: '4px 0' }} />
            });
          }

          searchOptions.push({
            value: 'results-header',
            label: (
              <div style={{ padding: '4px 0', color: '#999', fontSize: '12px' }}>
                搜索结果
              </div>
            )
          });

          searchResults.results.forEach(result => {
            searchOptions.push({
              value: `result-${result.id}`,
              label: (
                <div style={{ padding: '8px 0' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      {getTypeIcon(result.type)}
                      <Text strong ellipsis style={{ maxWidth: 200 }}>
                        {result.title}
                      </Text>
<Tag color={getStatusColor(result.status)}>
                        {result.status}
                      </Tag>
                    </Space>
                    {result.description && (
                      <Text 
                        type="secondary" 
                        style={{ fontSize: '12px' }}
                        ellipsis
                      >
                        {result.description}
                      </Text>
                    )}
                    {result.project_name && (
                      <Space size="small">
                        <ProjectOutlined style={{ fontSize: '10px', color: '#999' }} />
                        <Text type="secondary" style={{ fontSize: '10px' }}>
                          {result.project_name}
                        </Text>
                      </Space>
                    )}
                  </Space>
                </div>
              ),
              type: 'result',
              result
            });
          });

          // 添加查看更多选项
          searchOptions.push({
            value: 'view-more',
            label: (
              <div style={{ 
                padding: '8px 0', 
                textAlign: 'center',
                borderTop: '1px solid #f0f0f0',
                marginTop: '4px'
              }}>
                <Button type="link" size="small">
                  查看所有结果 ({searchResults.total_count})
                </Button>
              </div>
            ),
            type: 'action'
          });
        }

        setOptions(searchOptions);
      } catch (error) {
        console.error('搜索建议失败:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'task': return <BookOutlined style={{ color: '#52c41a' }} />;
      case 'project': return <ProjectOutlined style={{ color: '#fa8c16' }} />;
      case 'user': return <UserOutlined style={{ color: '#722ed1' }} />;
      default: return <SearchOutlined />;
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

  // 处理搜索输入变化
  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      debouncedSearch(value);
    } else {
      setOptions([]);
    }
  };

  // 处理选项选择
  const handleSelect = (value: string, option: any) => {
    const selectedOption = option as SearchOption;
    
    if (selectedOption.type === 'suggestion') {
      // 如果是搜索建议，更新查询并搜索
      setQuery(value);
      handleDirectSearch(value);
    } else if (selectedOption.type === 'result' && selectedOption.result) {
      // 如果是搜索结果，直接跳转或回调
      if (onResultSelect) {
        onResultSelect(selectedOption.result);
      } else {
        window.open(selectedOption.result.url, '_blank');
      }
      
      // 添加到搜索历史
      addToSearchHistory(query);
      
      // 清空搜索框
      setQuery('');
      setOptions([]);
    } else if (selectedOption.type === 'action' && value === 'view-more') {
      // 打开高级搜索
      setAdvancedVisible(true);
      addToSearchHistory(query);
    }
  };

  // 直接搜索处理
  const handleDirectSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setAdvancedVisible(true);
    addToSearchHistory(searchQuery);
  };

  // 添加到搜索历史
  const addToSearchHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setSearchHistory(prev => {
      const newHistory = [searchQuery, ...prev.filter(h => h !== searchQuery)];
      return newHistory.slice(0, 10); // 保留最近10次搜索
    });
  };

  // 快捷搜索下拉菜单
  const quickSearchMenu: import('antd').MenuProps = {
    items: [
      {
        key: 'documents',
        label: '搜索文档',
        icon: <FileTextOutlined />,
        onClick: () => {
          setQuery('type:document');
          setAdvancedVisible(true);
        }
      },
      {
        key: 'tasks',
        label: '搜索任务',
        icon: <BookOutlined />,
        onClick: () => {
          setQuery('type:task');
          setAdvancedVisible(true);
        }
      },
      {
        key: 'projects',
        label: '搜索项目',
        icon: <ProjectOutlined />,
        onClick: () => {
          setQuery('type:project');
          setAdvancedVisible(true);
        }
      },
      {
        type: 'divider' as const
      },
      {
        key: 'advanced',
        label: '高级搜索',
        icon: <SettingOutlined />,
        onClick: () => setAdvancedVisible(true)
      },
      {
        key: 'history',
        label: '搜索历史',
        icon: <HistoryOutlined />,
        children: searchHistory.length > 0 ? searchHistory.map((historyQuery, index) => ({
          key: `history-${index}`,
          label: historyQuery,
          onClick: () => {
            setQuery(historyQuery);
            handleDirectSearch(historyQuery);
          }
        })) : [
          {
            key: 'no-history',
            label: '暂无搜索历史',
            disabled: true
          }
        ]
      }
    ]
  };

  return (
    <>
      <div style={{ position: 'relative', ...style }}>
        <AutoComplete
          value={query}
          options={options}
          onSearch={handleSearch}
          onSelect={handleSelect}
          style={{ width: '100%' }}
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
          notFoundContent={loading ? '搜索中...' : null}
          popupClassName="global-search-dropdown"
        >
          <Input.Group compact>
            <Search
              ref={searchRef}
              placeholder={placeholder}
              size={size}
              loading={loading}
              onSearch={handleDirectSearch}
              enterButton={
                <Dropdown menu={quickSearchMenu} trigger={['click']} placement="bottomRight">
                  <Button icon={<FilterOutlined />} />
                </Dropdown>
              }
              style={{ width: '100%' }}
              allowClear
            />
          </Input.Group>
        </AutoComplete>

        {/* 快捷键提示 */}
        {size !== 'small' && (
          <div style={{
            position: 'absolute',
            right: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            <Tooltip title="快捷键: Ctrl/Cmd + K">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ⌘K
              </Text>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 高级搜索模态框 */}
      <Modal
        title="高级搜索"
        open={advancedVisible}
        onCancel={() => setAdvancedVisible(false)}
        footer={null}
        width={1200}
        destroyOnClose
      >
        <EnhancedSearchInterface
          mode="embedded"
          initialQuery={query}
          onResultSelect={(result) => {
            if (onResultSelect) {
              onResultSelect(result);
            } else {
              window.open(result.url, '_blank');
            }
            setAdvancedVisible(false);
          }}
        />
      </Modal>

      {/* 全局样式 */}
      <style>
        {`
          .global-search-dropdown .ant-select-item-option-disabled {
            opacity: 0.5;
          }
          
          .global-search-dropdown .ant-select-item-option-content > div:first-child {
            border: none !important;
          }
          
          .global-search-dropdown .ant-select-item-option:hover {
            background-color: #f5f5f5;
          }
          
          .global-search-dropdown .ant-select-item-option-active {
            background-color: #e6f7ff;
          }
        `}
      </style>
    </>
  );
};

// 全局搜索快捷键组件
export const GlobalSearchShortcut: React.FC<{
  onOpen: () => void;
}> = ({ onOpen }) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K 打开搜索
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);

  return null;
};

export default GlobalSearch;