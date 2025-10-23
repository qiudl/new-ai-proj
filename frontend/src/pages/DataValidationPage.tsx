import React from 'react';
import { Card } from 'antd';
import DataValidationPanel from '../components/DataValidationPanel';

const DataValidationPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title="数据验证系统" 
        style={{ maxWidth: '100%' }}
        styles={{ body: { padding: '24px'  }}}
      >
        <DataValidationPanel />
      </Card>
    </div>
  );
};

export default DataValidationPage;