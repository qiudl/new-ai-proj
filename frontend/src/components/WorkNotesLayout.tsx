import React from 'react';
import { Layout } from 'antd';

const { Sider, Content } = Layout;

interface WorkNotesLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  siderWidth?: number;
  collapsible?: boolean;
}

const WorkNotesLayout: React.FC<WorkNotesLayoutProps> = ({
  sidebar,
  children,
  siderWidth = 280,
  collapsible = false
}) => {
  return (
    <Layout style={{ minHeight: 'calc(100vh - 200px)', background: '#fff' }}>
      <Sider
        width={siderWidth}
        collapsible={collapsible}
        style={{
          background: '#fafafa',
          borderRight: '1px solid #f0f0f0',
          padding: '12px',
          overflow: 'auto'
        }}
      >
        {sidebar}
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