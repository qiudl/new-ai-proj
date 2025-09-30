import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Input,
  List,
  Typography,
  Space,
  Button,
  Checkbox,
  Collapse,
  Tag,
  Tooltip,
  Empty,
  Card,
  Badge,
  Divider,
  Progress
} from 'antd';
import {
  SearchOutlined,
  HighlightOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
  FileTextOutlined,
  SettingOutlined
} from '@ant-design/icons';
import './DocumentSearchPanel.css';

const { Search } = Input;
const { Text } = Typography;
const { Panel } = Collapse;

export interface SearchResult {
  id: string;
  content: string;
  line: number;
  column: number;
  beforeContext: string;
  afterContext: string;
  matchedText: string;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  includeComments: boolean;
  includeCode: boolean;
}

export interface DocumentSearchPanelProps {
  content: string;
  onResultClick?: (result: SearchResult) => void;
  onHighlightChange?: (query: string, results: SearchResult[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

const DocumentSearchPanel: React.FC<DocumentSearchPanelProps> = ({
  content,
  onResultClick,
  onHighlightChange,
  className = '',
  style = {}
}) => {
  // 状态管理
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    includeComments: true,
    includeCode: true
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // 执行搜索
  const performSearch = useCallback((searchQuery: string, searchOptions: SearchOptions) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setCurrentIndex(-1);
      onHighlightChange?.('', []);
      return;
    }

    setIsSearching(true);
    
    // 清除之前的超时
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      try {
        const lines = content.split('\n');
        const searchResults: SearchResult[] = [];
        
        let searchRegex: RegExp;
        
        if (searchOptions.regex) {
          try {
            searchRegex = new RegExp(
              searchQuery, 
              searchOptions.caseSensitive ? 'g' : 'gi'
            );
          } catch {
            // 如果正则表达式无效，回退到普通搜索
            const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchRegex = new RegExp(
              searchOptions.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery,
              searchOptions.caseSensitive ? 'g' : 'gi'
            );
          }
        } else {
          const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          searchRegex = new RegExp(
            searchOptions.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery,
            searchOptions.caseSensitive ? 'g' : 'gi'
          );
        }

        lines.forEach((line, lineIndex) => {
          // 根据选项过滤内容类型
          const isComment = line.trim().startsWith('//') || 
                           line.trim().startsWith('/*') || 
                           line.trim().startsWith('*') ||
                           line.trim().startsWith('#');
          
          if (!searchOptions.includeComments && isComment) return;
          if (!searchOptions.includeCode && !isComment) return;

          let match;
          const lineMatches: SearchResult[] = [];
          
          while ((match = searchRegex.exec(line)) !== null) {
            const beforeContext = line.substring(Math.max(0, match.index - 20), match.index);
            const afterContext = line.substring(
              match.index + match[0].length, 
              Math.min(line.length, match.index + match[0].length + 20)
            );

            lineMatches.push({
              id: `${lineIndex}-${match.index}`,
              content: line,
              line: lineIndex + 1,
              column: match.index + 1,
              beforeContext,
              afterContext,
              matchedText: match[0]
            });

            // 防止无限循环（当匹配空字符串时）
            if (match[0].length === 0) {
              searchRegex.lastIndex++;
            }
          }

          searchResults.push(...lineMatches);
        });

        setResults(searchResults);
        setCurrentIndex(searchResults.length > 0 ? 0 : -1);
        onHighlightChange?.(searchQuery, searchResults);
        
        // 添加到搜索历史
        if (searchResults.length > 0) {
          setSearchHistory(prev => {
            const newHistory = [searchQuery, ...prev.filter(h => h !== searchQuery)];
            return newHistory.slice(0, 10); // 保持最近10个搜索记录
          });
        }
      } catch (error) {
        console.error('搜索错误:', error);
        setResults([]);
        setCurrentIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 延迟300ms执行搜索，避免频繁搜索
  }, [content, onHighlightChange]);

  // 监听查询和选项变化
  useEffect(() => {
    performSearch(query, options);
  }, [query, options, performSearch]);

  // 导航到下一个结果
  const navigateNext = useCallback(() => {
    if (results.length === 0) return;
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    onResultClick?.(results[nextIndex]);
  }, [results, currentIndex, onResultClick]);

  // 导航到上一个结果
  const navigatePrevious = useCallback(() => {
    if (results.length === 0) return;
    const prevIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    onResultClick?.(results[prevIndex]);
  }, [results, currentIndex, onResultClick]);

  // 选项变更处理
  const handleOptionChange = useCallback((key: keyof SearchOptions, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setCurrentIndex(-1);
    onHighlightChange?.('', []);
  }, [onHighlightChange]);

  // 高亮搜索结果文本
  const highlightMatch = useCallback((text: string, matchedText: string) => {
    if (!matchedText) return text;
    
    const regex = new RegExp(
      `(${matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      options.caseSensitive ? 'g' : 'gi'
    );
    
    return text.replace(regex, '<mark>$1</mark>');
  }, [options.caseSensitive]);

  // 搜索统计信息
  const searchStats = useMemo(() => {
    if (!query || results.length === 0) return null;
    return `${currentIndex + 1} / ${results.length}`;
  }, [query, results.length, currentIndex]);

  return (
    <div className={`document-search-panel ${className}`} style={style}>
      {/* 搜索输入框 */}
      <div className="search-input-section">
        <Search
          placeholder="搜索文档内容..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={(value) => setQuery(value)}
          loading={isSearching}
          suffix={
            <Space>
              {query && (
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={clearSearch}
                />
              )}
              <Badge count={results.length} size="small" color="#1890ff">
                <SearchOutlined />
              </Badge>
            </Space>
          }
        />
        
        {/* 搜索导航和统计 */}
        {results.length > 0 && (
          <div className="search-navigation">
            <Space>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {searchStats}
              </Text>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                onClick={navigatePrevious}
                disabled={results.length === 0}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                onClick={navigateNext}
                disabled={results.length === 0}
              />
            </Space>
          </div>
        )}
      </div>

      {/* 搜索选项 */}
      <Collapse 
        size="small" 
        ghost
        items={[
          {
            key: 'options',
            label: (
              <Space>
                <FilterOutlined />
                <Text>搜索选项</Text>
              </Space>
            ),
            children: (
              <div className="search-options">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={options.caseSensitive}
                    onChange={(e) => handleOptionChange('caseSensitive', e.target.checked)}
                  >
                    区分大小写
                  </Checkbox>
                  <Checkbox
                    checked={options.wholeWord}
                    onChange={(e) => handleOptionChange('wholeWord', e.target.checked)}
                  >
                    全词匹配
                  </Checkbox>
                  <Checkbox
                    checked={options.regex}
                    onChange={(e) => handleOptionChange('regex', e.target.checked)}
                  >
                    正则表达式
                  </Checkbox>
                  <Divider style={{ margin: '8px 0' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>内容类型</Text>
                  <Checkbox
                    checked={options.includeComments}
                    onChange={(e) => handleOptionChange('includeComments', e.target.checked)}
                  >
                    包含注释
                  </Checkbox>
                  <Checkbox
                    checked={options.includeCode}
                    onChange={(e) => handleOptionChange('includeCode', e.target.checked)}
                  >
                    包含代码
                  </Checkbox>
                </Space>
              </div>
            )
          }
        ]}
      />

      {/* 搜索结果列表 */}
      <div className="search-results">
        {isSearching ? (
          <div className="search-loading">
            <Progress type="line" percent={100} showInfo={false} status="active" />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
              搜索中...
            </Text>
          </div>
        ) : query && results.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到匹配结果"
            style={{ margin: '20px 0' }}
          />
        ) : results.length > 0 ? (
          <List
            size="small"
            dataSource={results}
            renderItem={(result, index) => (
              <List.Item
                className={`search-result-item ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  onResultClick?.(result);
                }}
              >
                <div className="result-content">
                  <div className="result-location">
                    <Space>
                      <Tag size="small" color="blue">
                        L{result.line}:{result.column}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        第 {result.line} 行
                      </Text>
                    </Space>
                  </div>
                  <div className="result-text">
                    <Text style={{ fontSize: '12px' }}>
                      {result.beforeContext}
                      <span className="match-highlight">
                        {result.matchedText}
                      </span>
                      {result.afterContext}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
            pagination={results.length > 50 ? {
              size: 'small',
              pageSize: 50,
              showSizeChanger: false,
              showQuickJumper: false
            } : false}
          />
        ) : null}
      </div>

      {/* 搜索历史 */}
      {searchHistory.length > 0 && !query && (
        <div className="search-history">
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            最近搜索
          </Text>
          <div className="history-tags">
            {searchHistory.map((term, index) => (
              <Tag
                key={index}
                style={{ cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => setQuery(term)}
              >
                {term}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSearchPanel;