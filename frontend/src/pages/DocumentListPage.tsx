import React from 'react';
import { useParams, Link } from 'react-router-dom';
import DocumentManager from '../components/DocumentManager';
import { Typography, Breadcrumb } from 'antd';
import { HomeOutlined, FileTextOutlined, ProjectOutlined } from '@ant-design/icons';

const { Title } = Typography;

const DocumentListPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Global document view (when no project ID)
  if (!projectId) {
    return (
      <div style={{ padding: '16px 24px', background: '#f5f5f5', minHeight: '100vh' }}>
        {/* 页面头部 */}
        <div style={{ 
          marginBottom: '24px',
          background: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
        }}>
          <Breadcrumb 
            style={{ marginBottom: '16px' }}
            items={[
              {
                title: (
                  <Link to="/">
                    <HomeOutlined />
                    <span>首页</span>
                  </Link>
                )
              },
              {
                title: (
                  <>
                    <FileTextOutlined />
                    <span>文档管理</span>
                  </>
                )
              }
            ]}
          />
          
          <Title level={2} style={{ margin: 0 }}>
            文档管理
          </Title>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            管理所有项目的文档、图片和PDF文件
          </p>
        </div>

        {/* 文档管理器 */}
        <DocumentManager showProjectFilter={true} />
      </div>
    );
  }

  // Project-specific document view
  return (
    <div style={{ padding: '16px 24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ 
        marginBottom: '24px',
        background: '#fff',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}>
        <Breadcrumb 
          style={{ marginBottom: '16px' }}
          items={[
            {
              title: (
                <Link to="/">
                  <HomeOutlined />
                  <span>首页</span>
                </Link>
              )
            },
            {
              title: (
                <Link to="/projects">
                  <ProjectOutlined />
                  <span>项目管理</span>
                </Link>
              )
            },
            {
              title: (
                <Link to={`/projects/${projectId}`}>
                  <span>项目详情</span>
                </Link>
              )
            },
            {
              title: (
                <>
                  <FileTextOutlined />
                  <span>项目文档</span>
                </>
              )
            }
          ]}
        />
        
        <Title level={2} style={{ margin: 0 }}>
          项目文档管理
        </Title>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          管理项目相关的文档、图片和PDF文件
        </p>
      </div>

      {/* 文档管理器 */}
      <DocumentManager 
        projectId={parseInt(projectId)} 
        showProjectFilter={false}
      />
    </div>
  );
};

export default DocumentListPage;