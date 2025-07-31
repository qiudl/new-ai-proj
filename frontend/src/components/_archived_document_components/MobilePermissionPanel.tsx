import React from 'react';
import DocumentPermissionPanel from './DocumentPermissionPanel';

interface MobilePermissionPanelProps {
  documentId: number;
  onPermissionChange?: () => void;
}

const MobilePermissionPanel: React.FC<MobilePermissionPanelProps> = (props) => {
  // For now, we'll just return the regular DocumentPermissionPanel
  // This can be extended to have mobile-specific layouts if needed
  return (
    <DocumentPermissionPanel
      {...props}
    />
  );
};

export default MobilePermissionPanel;