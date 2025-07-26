/**
 * 文档工具栏组件
 * 包含搜索、过滤、排序、视图切换和批量操作功能
 */

import React from 'react';
import {
  Space,
  Input,
  Select,
  Button,
  Radio,
  Divider,
  Badge,
  Dropdown,
  Tooltip
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
  SortDescendingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Search } = Input;
const { Option } = Select;

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

interface DocumentToolbarProps {
  mode: 'simple' | 'advanced';
  
  // 搜索相关
  searchText: string;
  onSearchChange: (value: string) => void;
  showSearch: boolean;
  
  // 过滤相关
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  
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
  
  // Google Docs 集成
  enableGoogleDocsIntegration?: boolean;
  onGoogleDocsImport?: () => Promise<void>;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  mode,
  searchText,
  onSearchChange,
  showSearch,
  filterStatus,
  onFilterStatusChange,
  filterType,
  onFilterTypeChange,
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
  allowBatch
}) => {

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
        {/* 搜索 */}
        {showSearch && (
          <Search
            placeholder="搜索文档..."
            allowClear
            style={{ width: mode === 'simple' ? 200 : 250 }}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={onSearchChange}
          />
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
            onSortByChange(field as any);
            onSortOrderChange(order as any);
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
    </div>
  );
};

export default DocumentToolbar;