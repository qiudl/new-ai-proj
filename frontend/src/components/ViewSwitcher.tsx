import React from 'react';
import { Button } from 'antd';
import { FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons';
import './ViewSwitcher.css';

export type ViewType = 'task' | 'document';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className = '',
}) => {
  return (
    <div className={`view-switcher ${className}`}>
      <div className="view-switcher-buttons">
        <Button
          type={currentView === 'task' ? 'primary' : 'text'}
          icon={<UnorderedListOutlined />}
          onClick={() => onViewChange('task')}
          className={`view-button ${currentView === 'task' ? 'active' : ''}`}
        >
          📋 任务视图
        </Button>
        <Button
          type={currentView === 'document' ? 'primary' : 'text'}
          icon={<FileTextOutlined />}
          onClick={() => onViewChange('document')}
          className={`view-button ${currentView === 'document' ? 'active' : ''}`}
        >
          📄 文档视图
        </Button>
      </div>
    </div>
  );
};

export default ViewSwitcher;