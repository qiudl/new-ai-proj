import React, { useState, useEffect } from 'react';
import { Layout, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { workNotesStorage } from '../utils/workNotesStorage';

const { Sider, Content } = Layout;

interface WorkNotesLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  siderWidth?: number;
  collapsedWidth?: number;
}

const WorkNotesLayout: React.FC<WorkNotesLayoutProps> = ({
  sidebar,
  children,
  siderWidth = 280,
  collapsedWidth = 48
}) => {
  // 强制默认展开，不读取localStorage
  const [collapsed, setCollapsed] = useState(false);

  // 保存折叠状态
  useEffect(() => {
    workNotesStorage.saveFolderCollapsed(collapsed);
  }, [collapsed]);

  return (
    <Layout style={{ minHeight: 'calc(100vh - 200px)', background: '#fff' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}  // 不使用默认触发器
        width={siderWidth}
        collapsedWidth={collapsedWidth}
        style={{
          background: '#fafafa',
          borderRight: '1px solid #f0f0f0',
          padding: collapsed ? '8px 4px' : '12px',
          overflow: 'auto',
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
          willChange: 'width, padding'
        }}
      >
        {/* 自定义折叠按钮 */}
        <div style={{
          marginBottom: 12,
          textAlign: collapsed ? 'center' : 'right',
          transition: 'all 0.3s ease'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: '#595959',
              fontSize: collapsed ? 18 : 16
            }}
            title={collapsed ? '展开文件夹' : '折叠文件夹'}
          />
        </div>

        {/* 文件夹树内容 */}
        <div style={{
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
          transitionDelay: collapsed ? '0s' : '0.1s'
        }}>
          {sidebar}
        </div>
      </Sider>

      <Layout style={{ background: '#fff' }}>
        <Content style={{ padding: '12px', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkNotesLayout;
