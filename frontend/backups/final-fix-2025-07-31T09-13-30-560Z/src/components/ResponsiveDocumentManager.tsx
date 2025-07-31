// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Grid, Drawer, Card, Typography, Affix, FloatButton } from 'antd';
import { MenuOutlined, UpOutlined } from '@ant-design/icons';
import DocumentFileManager from './DocumentFileManager';
import MobileDocumentList from './MobileDocumentList';
import MobileSearchPanel from './MobileSearchPanel';
import MobileFilterPanel from './MobileFilterPanel';

const { useBreakpoint } = Grid;


interface ResponsiveDocumentManagerProps {
  folderId?: number;
  showSearch?: boolean;
  onDocumentSelect?: (document: any) => void;
  onDocumentUpdate?: () => void;
  title?: string;
  showBreadcrumb?: boolean;
  mobileOptimized?: boolean;
}

const ResponsiveDocumentManager: React.FC<ResponsiveDocumentManagerProps> = ({
  folderId,
  showSearch = true,
  onDocumentSelect,
  onDocumentUpdate,
  title,
  showBreadcrumb = true,
  mobileOptimized = true,
  ...props
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg && screens.md;
  
  // Mobile-specific state
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'grid' | 'compact'>('compact');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Auto-hide drawer on screen size change
  useEffect(() => {
    if (!isMobile && mobileDrawerVisible) {
      setMobileDrawerVisible(false);
    }
  }, [isMobile, mobileDrawerVisible]);

  // Mobile-optimized render
  if (isMobile && mobileOptimized) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        position: 'relative'
      }}>
        {/* Mobile Header */}
        <Affix offsetTop={0}>
          <Card
            style={{
              margin: 0,
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              borderTop: 0,
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={() => setMobileDrawerVisible(true)}
                  />
                  <Title level={5} style={{ margin: 0 }}>
                    {title || '文档管理'}
                  </Title>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    type={showMobileSearch ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                  >
                    搜索
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                  >
                    筛选
                  </Button>
                </Space>
              </Col>
            </Row>
            
            {/* Mobile Search Panel */}
            {showMobileSearch && (
              <div style={{ marginTop: 12 }}>
                <MobileSearchPanel
                  onSearch={(searchTerm) => {
                    console.log('Mobile search:', searchTerm);
                  }}
                />
              </div>
            )}
            
            {/* Mobile Filter Panel */}
            {showMobileFilters && (
              <div style={{ marginTop: 12 }}>
                <MobileFilterPanel
                  onFilterChange={(filters) => {
                    console.log('Mobile filters:', filters);
                  }}
                />
              </div>
            )}
          </Card>
        </Affix>

        {/* Mobile Content */}
        <div style={{ padding: '8px' }}>
          <MobileDocumentList
            folderId={folderId}
            viewMode={mobileViewMode}
            onViewModeChange={setMobileViewMode}
            onDocumentSelect={onDocumentSelect}
            onDocumentUpdate={onDocumentUpdate}
          />
        </div>

        {/* Mobile Drawer */}
        <Drawer
          title="操作菜单"
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          width={280}
        >
          {/* Mobile navigation content */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button block>新建文档</Button>
            <Button block>上传文件</Button>
            <Button block>批量操作</Button>
            <Button block>设置</Button>
          </Space>
        </Drawer>

        {/* Back to Top */}
        <FloatButton.BackTop
          style={{
            right: 24,
            bottom: 24}}
          icon={<UpOutlined />}
        />
      </div>
    );
  }

  // Tablet-optimized render
  if (isTablet) {
    return (
      <div style={{ padding: isMobile ? '8px' : '16px' }}>
        <DocumentFileManager
          folderId={folderId}
          showSearch={showSearch}
          onDocumentSelect={onDocumentSelect}
          onDocumentUpdate={onDocumentUpdate}
          {...props}
        />
      </div>
    );
  }

  // Desktop render (default)
  return (
    <DocumentFileManager
      folderId={folderId}
      showSearch={showSearch}
      onDocumentSelect={onDocumentSelect}
      onDocumentUpdate={onDocumentUpdate}
      {...props}
    />
  );
};

export default ResponsiveDocumentManager;