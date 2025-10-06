import React from 'react';
import { Alert, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { AIConfig, DocumentTemplateType } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants';

interface SelectionSummaryProps {
  selectedAIConfig: AIConfig | null;
  selectedTemplate: DocumentTemplateType | null;
}

/**
 * 选择摘要组件
 */
const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectedAIConfig,
  selectedTemplate,
}) => {
  const isComplete = selectedAIConfig && selectedTemplate;

  return (
    <Alert
      message={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isComplete ? (
            <>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>已完成选择</span>
            </>
          ) : (
            <>
              <CloseCircleOutlined style={{ color: '#faad14' }} />
              <span>请完成选择</span>
            </>
          )}
        </div>
      }
      description={
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#595959', marginRight: 8 }}>AI模型:</span>
            {selectedAIConfig ? (
              <Tag color="blue">
                {selectedAIConfig.provider.toUpperCase()} - {selectedAIConfig.model}
              </Tag>
            ) : (
              <span style={{ color: '#bfbfbf' }}>未选择</span>
            )}
          </div>
          <div>
            <span style={{ color: '#595959', marginRight: 8 }}>文档模板:</span>
            {selectedTemplate ? (
              <Tag color="green">
                {DOCUMENT_TEMPLATES[selectedTemplate].icon}{' '}
                {DOCUMENT_TEMPLATES[selectedTemplate].name}
              </Tag>
            ) : (
              <span style={{ color: '#bfbfbf' }}>未选择</span>
            )}
          </div>
        </div>
      }
      type={isComplete ? 'success' : 'warning'}
      showIcon={false}
      style={{ marginTop: 24 }}
    />
  );
};

export default SelectionSummary;
