/**
 * 文档工具栏组件
 * 包含搜索、过滤、排序、视图切换和批量操作功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Space,
  Input,
  Select,
  Button,
  Radio,
  Divider,
  Badge,
  Dropdown,
  Tooltip,
  AutoComplete,
  Drawer,
  Form,
  DatePicker,
  Slider,
  Tag,
  Popover,
  Switch,
  Modal
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EyeOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  BookOutlined,
  FileTextOutlined,
  ExportOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  FilterOutlined,
  SaveOutlined,
  HistoryOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  StarOutlined,
  CloseOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue' },
  text: { label: 'Text', color: 'default' },
  pdf: { label: 'PDF', color: 'red' },
  word: { label: 'Word', color: 'blue' },
  excel: { label: 'Excel', color: 'green' },
  image: { label: 'Image', color: 'orange' }
};

// 文档状态配置
const DOCUMENT_STATUS = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

// 高级搜索配置
interface AdvancedSearchConfig {
  fuzzySearch: boolean;
  semanticSearch: boolean;
  includeContent: boolean;
  dateRange?: [string, string];
  sizeRange?: [number, number];
  tags: string[];
  authors: string[];
  projects: string[];
}

// 保存的搜索过滤器
interface SavedFilter {
  id: string;
  name: string;
  config: AdvancedSearchConfig;
  query: string;
  createdAt: string;
}

interface DocumentToolbarProps {
  mode: 'simple' | 'advanced';
  
  // 搜索相关
  searchText: string;
  onSearchChange: (value: string) => void;
  showSearch: boolean;
  searchSuggestions?: string[];
  onGetSearchSuggestions?: (query: string) => Promise<string[]>;
  
  // 过滤相关
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  advancedFilters?: AdvancedSearchConfig;
  onAdvancedFiltersChange?: (config: AdvancedSearchConfig) => void;
  
  // 排序相关
  sortBy: 'updated_at' | 'created_at' | 'title';
  onSortByChange: (value: 'updated_at' | 'created_at' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  
  // 视图相关
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  showViewToggle: boolean;
  
  // 选择模式相关
  isSelectMode: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  
  // 批量操作
  onBatchDelete: () => void;
  
  // 操作回调
  onCreateDocument: () => void;
  onUpload?: () => void;
  
  // 功能开关
  allowUpload: boolean;
  allowBatch: boolean;
  enableIntelligentSearch?: boolean;
  
  // 保存的搜索过滤器
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
  
  // Google Docs 集成
  enableGoogleDocsIntegration?: boolean;
  onGoogleDocsImport?: () => Promise<void>;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  mode,
  searchText,
  onSearchChange,
  showSearch,
  searchSuggestions = [],
  onGetSearchSuggestions,
  filterStatus,
  onFilterStatusChange,
  filterType,
  onFilterTypeChange,
  advancedFilters,
  onAdvancedFiltersChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  showViewToggle,
  isSelectMode,
  selectedCount,
  totalCount,
  onToggleSelectMode,
  onSelectAll,
  onClearSelection,
  onBatchDelete,
  onCreateDocument,
  onUpload,
  allowUpload,
  allowBatch,
  enableIntelligentSearch = false,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter
}) => {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<string[]>([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(searchSuggestions);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [saveFilterModalVisible, setSaveFilterModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 获取搜索建议
  const handleSearchSuggestions = useCallback(async (query: string) => {
    if (onGetSearchSuggestions && query.trim()) {
      try {
        const suggestions = await onGetSearchSuggestions(query);
        setAutoCompleteOptions(suggestions);
      } catch (error) {
        console.error('获取搜索建议失败:', error);
      }
    }
  }, [onGetSearchSuggestions]);

  // 更新搜索建议
  useEffect(() => {
    setCurrentSuggestions(searchSuggestions);
  }, [searchSuggestions]);

  // 高级搜索配置处理
  const handleAdvancedFilterSubmit = useCallback((values: unknown) => {
    if (onAdvancedFiltersChange) {
      onAdvancedFiltersChange(values);
    }
    setFilterDrawerVisible(false);
  }, [onAdvancedFiltersChange]);

  // 保存搜索过滤器
  const handleSaveFilter = useCallback((filterName: string) => {
    if (onSaveFilter && advancedFilters) {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name: filterName,
        config: advancedFilters,
        query: searchText,
        createdAt: new Date().toISOString()
      };
      onSaveFilter(newFilter);
      setSaveFilterModalVisible(false);
    }
  }, [onSaveFilter, advancedFilters, searchText]);

  // 加载搜索过滤器
  const handleLoadFilter = useCallback((filter: SavedFilter) => {
    if (onLoadFilter) {
      onLoadFilter(filter);
    }
  }, [onLoadFilter]);

  // 智能搜索选项
  const intelligentSearchOptions = [
    { label: '模糊匹配', value: 'fuzzy' },
    { label: '语义搜索', value: 'semantic' },
    { label: '包含内容', value: 'content' }
  ];

  // 批量操作菜单
  const batchMenuItems: MenuProps['items'] = [
    {
      key: 'batch-template-set',
      label: '设为模板',
      icon: <BookOutlined />,
      disabled: selectedCount === 0
    },
    {
      key: 'batch-template-unset',
      label: '取消模板',
      icon: <FileTextOutlined />,
      disabled: selectedCount === 0
    },
    {
      type: 'divider'
    },
    {
      key: 'batch-export',
      label: '批量导出',
      icon: <ExportOutlined />,
      children: [
        {
          key: 'batch-export-pdf',
          label: '导出为 PDF'
        },
        {
          key: 'batch-export-word',
          label: '导出为 Word'
        },
        {
          key: 'batch-export-zip',
          label: '打包下载'
        }
      ],
      disabled: selectedCount === 0
    }
  ];

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      {/* 左侧操作按钮 */}
      <Space wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateDocument}
        >
          新建文档
        </Button>
        
        {allowUpload && onUpload && (
          <Button
            icon={<UploadOutlined />}
            onClick={onUpload}
          >
            上传文件
          </Button>
        )}
        
        {allowBatch && mode === 'advanced' && (
          <>
            <Divider type="vertical" />
            
            {/* 批量操作 */}
            <Button
              type={isSelectMode ? 'primary' : 'default'}
              icon={isSelectMode ? <EyeOutlined /> : <AppstoreOutlined />}
              onClick={onToggleSelectMode}
            >
              {isSelectMode ? '退出选择' : '批量操作'}
            </Button>
            
            {isSelectMode && (
              <>
                <Button
                  onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
                  size="small"
                >
                  {selectedCount === totalCount ? '取消全选' : '全选'}
                </Button>
                
                <Badge count={selectedCount} showZero>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={onBatchDelete}
                    disabled={selectedCount === 0}
                  >
                    批量删除
                  </Button>
                </Badge>
                
                <Button
                  icon={<CopyOutlined />}
                  disabled={selectedCount === 0}
                >
                  批量复制
                </Button>
                
                <Dropdown
                  menu={{ items: batchMenuItems }}
                  trigger={['click']}
                  disabled={selectedCount === 0}
                >
                  <Button
                    icon={<MoreOutlined />}
                    disabled={selectedCount === 0}
                  >
                    更多操作
                  </Button>
                </Dropdown>
              </>
            )}
          </>
        )}
      </Space>
      
      {/* 右侧搜索和过滤 */}
      <Space wrap>
        {/* 增强搜索 */}
        {showSearch && (
          <Space.Compact>
            {enableIntelligentSearch ? (
              <AutoComplete
                style={{ width: mode === 'simple' ? 200 : 250 }}
                value={searchText}
                options={autoCompleteOptions.map(option => ({ value: option }))}
                onSearch={handleSearchSuggestions}
                onSelect={onSearchChange}
                onChange={onSearchChange}
                placeholder="智能搜索文档..."
                allowClear
              >
                <Input
                  prefix={<SearchOutlined />}
                  suffix={
                    <Popover
                      content={
                        <div style={{ width: 200 }}>
                          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>搜索选项:</div>
                          {intelligentSearchOptions.map(option => (
                            <div key={option.value}>
                              <Switch
                                size="small"
                                checked={advancedFilters?.[option.value as keyof AdvancedSearchConfig] as boolean}
                                onChange={(checked) => {
                                  if (onAdvancedFiltersChange && advancedFilters) {
                                    onAdvancedFiltersChange({
                                      ...advancedFilters,
                                      [option.value]: checked
                                    });
                                  }
                                }}
                              />
                              <span style={{ marginLeft: 8 }}>{option.label}</span>
                            </div>
                          ))}
                        </div>
                      }
                      trigger="click"
                      title="智能搜索配置"
                    >
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<BulbOutlined />}
                        style={{ color: '#1890ff' }}
                      />
                    </Popover>
                  }
                />
              </AutoComplete>
            ) : (
              <Search
                placeholder="搜索文档..."
                allowClear
                style={{ width: mode === 'simple' ? 200 : 250 }}
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                onSearch={onSearchChange}
              />
            )}
            
            {mode === 'advanced' && (
              <>
                <Tooltip title="高级过滤">
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setFilterDrawerVisible(true)}
                    type={advancedFilters && Object.values(advancedFilters).some(v => 
                      Array.isArray(v) ? v.length > 0 : v
                    ) ? 'primary' : 'default'}
                  />
                </Tooltip>
                
                {savedFilters.length > 0 && (
                  <Dropdown
                    menu={{
                      items: [
                        ...savedFilters.map(filter => ({
                          key: filter.id,
                          label: (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
                              <span>{filter.name}</span>
                              <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFilter?.(filter.id);
                                }}
                              />
                            </div>
                          ),
                          onClick: () => handleLoadFilter(filter)
                        })),
                        { type: 'divider' },
                        {
                          key: 'save-current',
                          label: '保存当前搜索',
                          icon: <SaveOutlined />,
                          onClick: () => setSaveFilterModalVisible(true)
                        }
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Tooltip title="保存的搜索">
                      <Button icon={<HistoryOutlined />} />
                    </Tooltip>
                  </Dropdown>
                )}
              </>
            )}
          </Space.Compact>
        )}
        
        {/* 高级模式的过滤器 */}
        {mode === 'advanced' && (
          <>
            <Select
              value={filterStatus}
              onChange={onFilterStatusChange}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="all">全部状态</Option>
              {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
            
            <Select
              value={filterType}
              onChange={onFilterTypeChange}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="all">全部类型</Option>
              {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </>
        )}
        
        {/* 排序 */}
        <Select
          value={`${sortBy}-${sortOrder}`}
          onChange={(value) => {
            const [field, order] = value.split('-');
            onSortByChange(field as unknown);
            onSortOrderChange(order as unknown);
          }}
          style={{ width: mode === 'simple' ? 100 : 120 }}
          size="small"
        >
          <Option value="updated_at-desc">最近更新</Option>
          <Option value="created_at-desc">最近创建</Option>
          <Option value="title-asc">标题 A-Z</Option>
          <Option value="title-desc">标题 Z-A</Option>
        </Select>
        
        {mode === 'simple' && (
          <Tooltip title={sortOrder === 'desc' ? '降序排列' : '升序排列'}>
            <Button
              size="small"
              icon={sortOrder === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
              onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            />
          </Tooltip>
        )}
        
        {/* 视图模式切换 */}
        {showViewToggle && (
          <Radio.Group
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
            size="small"
          >
            <Radio.Button value="table">
              <Tooltip title="表格视图">
                <UnorderedListOutlined />
              </Tooltip>
            </Radio.Button>
            <Radio.Button value="grid">
              <Tooltip title="网格视图">
                <AppstoreOutlined />
              </Tooltip>
            </Radio.Button>
          </Radio.Group>
        )}
      </Space>

      {/* 高级过滤抽屉 */}
      <Drawer
        title="高级过滤设置"
        placement="right"
        width={400}
        open={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setFilterDrawerVisible(false)}>
                取消
              </Button>
              <Button type="primary" onClick={() => form.submit()}>
                应用过滤
              </Button>
            </Space>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={advancedFilters}
          onFinish={handleAdvancedFilterSubmit}
        >
          <Form.Item name="fuzzySearch" label="模糊搜索" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item name="semanticSearch" label="语义搜索" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item name="includeContent" label="搜索内容" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item name="dateRange" label="创建时间范围">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="sizeRange" label="文件大小范围 (KB)">
            <Slider
              range
              min={0}
              max={10000}
              marks={{
                0: '0',
                1000: '1MB',
                5000: '5MB',
                10000: '10MB+'
              }}
            />
          </Form.Item>
          
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="输入或选择标签"
              tokenSeparators={[',']}
            >
              <Option value="重要">重要</Option>
              <Option value="紧急">紧急</Option>
              <Option value="会议纪要">会议纪要</Option>
              <Option value="技术文档">技术文档</Option>
              <Option value="产品规格">产品规格</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="authors" label="作者">
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择作者"
            >
              <Option value="张三">张三</Option>
              <Option value="李四">李四</Option>
              <Option value="王五">王五</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="projects" label="项目">
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择项目"
            >
              <Option value="企业管理系统">企业管理系统</Option>
              <Option value="移动应用开发">移动应用开发</Option>
              <Option value="数据分析平台">数据分析平台</Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 保存过滤器模态框 */}
      <Modal
        title="保存搜索过滤器"
        open={saveFilterModalVisible}
        onCancel={() => setSaveFilterModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSaveFilterModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={() => {
              const filterName = (document.getElementById('filter-name-input') as HTMLInputElement)?.value;
              if (filterName?.trim()) {
                handleSaveFilter(filterName.trim());
              }
            }}
          >
            保存
          </Button>
        ]}
      >
        <Input 
          id="filter-name-input"
          placeholder="输入过滤器名称" 
          prefix={<SaveOutlined />}
        />
      </Modal>
    </div>
  );
};

export default DocumentToolbar;