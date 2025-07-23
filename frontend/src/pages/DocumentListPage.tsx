import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentList from '../components/DocumentList';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const DocumentListPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Global document view (when no project ID)
  if (!projectId) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Title level={2} style={{ marginBottom: 24 }}>
            文档管理
          </Title>
          <DocumentList />
        </Card>
      </div>
    );
  }

  // Project-specific document view
  return (
    <div style={{ padding: 24 }}>
      <DocumentList projectId={parseInt(projectId)} />
    </div>
  );
};

export default DocumentListPage;