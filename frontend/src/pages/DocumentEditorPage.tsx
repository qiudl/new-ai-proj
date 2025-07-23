import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentEditor from '../components/DocumentEditor';
import { Typography } from 'antd';

const { Title } = Typography;

const DocumentEditorPage: React.FC = () => {
  const { id, projectId } = useParams<{ id?: string; projectId?: string }>();
  
  // 如果有id参数，说明是编辑现有文档
  const documentId = id ? parseInt(id) : undefined;
  // 如果有projectId参数，说明是创建新文档
  const finalProjectId = projectId ? parseInt(projectId) : undefined;

  if (!documentId && !finalProjectId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>参数错误</Title>
      </div>
    );
  }

  return (
    <DocumentEditor 
      documentId={documentId}
      projectId={finalProjectId}
    />
  );
};

export default DocumentEditorPage;