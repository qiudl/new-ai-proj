import React from 'react';
import { Grid } from 'antd';
import DocumentFileManager from './DocumentFileManager';

const { useBreakpoint } = Grid;

interface ResponsiveDocumentManagerProps {
  folderId?: number;
  showSearch?: boolean;
  onDocumentSelect?: (document: any) => void;
  onDocumentUpdate?: () => void;
}

const ResponsiveDocumentManager: React.FC<ResponsiveDocumentManagerProps> = (props) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // For now, we'll just return the regular DocumentFileManager
  // This can be extended to have different mobile layouts if needed
  return (
    <DocumentFileManager
      {...props}
    />
  );
};

export default ResponsiveDocumentManager;