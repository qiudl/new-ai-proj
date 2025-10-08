import React from 'react';
import { Button, Tooltip, Badge } from 'antd';
import { MenuFoldOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import DocumentSearch from './DocumentSearch';

export interface DocumentSidebarHeaderProps {
  onSearch: (query: string) => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
  documentCount: number;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const DocumentSidebarHeader: React.FC<DocumentSidebarHeaderProps> = ({
  onSearch,
  onToggleCollapse,
  collapsed,
  documentCount,
  loading = false,
  onRefresh,
  className = ''
}) => {
  return (
    <div className={`sidebar-header ${className}`}>
      <div className="header-top">
        <div className="header-title">
          <FileTextOutlined />
          <span>文档列表</span>
          <Badge 
            count={documentCount} 
            style={{ 
              backgroundColor: '#1890ff',
              fontSize: '12px',
              height: '20px',
              lineHeight: '20px',
              minWidth: '20px'
            }}
          />
        </div>
        
        <div className="header-actions">
          {onRefresh && (
            <Tooltip title="刷新列表">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
                className="action-button"
              />
            </Tooltip>
          )}
          
          <Tooltip title="折叠侧边栏">
            <Button
              type="text"
              size="small"
              icon={<MenuFoldOutlined />}
              onClick={onToggleCollapse}
              className="action-button"
            />
          </Tooltip>
        </div>
      </div>
      
      <div className="header-search">
        <DocumentSearch
          onSearch={onSearch}
          placeholder="搜索文档标题、内容或标签..."
        />
      </div>
    </div>
  );
};

export default DocumentSidebarHeader;