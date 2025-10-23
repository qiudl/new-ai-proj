import React, { useMemo } from 'react';
import { Row, Col, Divider, Input, Spin, Empty, Button, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { AIConfig, DocumentTemplateType } from '../types';
import { useAIConfigs } from '../hooks/useAIConfigs';
import { useTemplateFilter } from '../hooks/useTemplateFilter';
import AIConfigCard from '../components/AIConfigCard';
import TemplateCard from '../components/TemplateCard';
import SelectionSummary from '../components/SelectionSummary';

interface AIModelSelectorProps {
  selectedAIConfig: AIConfig | null;
  selectedTemplate: DocumentTemplateType | null;
  onAIConfigChange: (config: AIConfig | null) => void;
  onTemplateChange: (template: DocumentTemplateType | null) => void;
}

/**
 * AI模型选择器组件
 */
const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  selectedAIConfig,
  selectedTemplate,
  onAIConfigChange,
  onTemplateChange,
}) => {
  const { configs, loading, error, reload } = useAIConfigs();
  const { searchText, setSearchText, filteredTemplates } = useTemplateFilter();

  // 智能推荐模板 (简化版,可以根据任务标题推荐)
  const recommendedTemplate = useMemo<DocumentTemplateType>(() => {
    // 默认推荐技术设计文档
    // 在实际使用时,可以根据task.title进行智能推荐
    return 'technical_design';
  }, []);

  /**
   * 处理AI配置选择
   */
  const handleAIConfigClick = (config: AIConfig) => {
    if (selectedAIConfig?.id === config.id) {
      onAIConfigChange(null); // 取消选择
    } else {
      onAIConfigChange(config); // 选择
    }
  };

  /**
   * 处理模板选择
   */
  const handleTemplateClick = (templateType: DocumentTemplateType) => {
    if (selectedTemplate === templateType) {
      onTemplateChange(null); // 取消选择
    } else {
      onTemplateChange(templateType); // 选择
    }
  };

  return (
    <div>
      {/* AI配置选择区 */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            1. 选择AI模型
          </h3>
          {error && (
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={reload}
              size="small"
            >
              重新加载
            </Button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="加载AI配置中...">
              <div style={{ minHeight: '100px' }} />
            </Spin>
          </div>
        )}

        {error && !loading && (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!loading && !error && configs.length === 0 && (
          <Empty
            description="暂无可用的AI配置"
            style={{ padding: '40px 0' }}
          />
        )}

        {!loading && !error && configs.length > 0 && (
          <Row gutter={[16, 16]}>
            {configs.map((config) => (
              <Col xs={24} sm={24} md={12} lg={12} key={config.id}>
                <AIConfigCard
                  config={config}
                  selected={selectedAIConfig?.id === config.id}
                  onClick={() => handleAIConfigClick(config)}
                />
              </Col>
            ))}
          </Row>
        )}
      </div>

      <Divider />

      {/* 文档模板选择区 */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            2. 选择文档模板
          </h3>
          <Input
            placeholder="搜索模板..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        </div>

        <Row gutter={[16, 16]}>
          {filteredTemplates.map((template) => (
            <Col xs={12} sm={12} md={8} lg={6} key={template.type}>
              <TemplateCard
                template={template}
                selected={selectedTemplate === template.type}
                recommended={template.type === recommendedTemplate}
                onClick={() => handleTemplateClick(template.type)}
              />
            </Col>
          ))}
        </Row>

        {filteredTemplates.length === 0 && (
          <Empty
            description="没有找到匹配的模板"
            style={{ padding: '40px 0' }}
          />
        )}
      </div>

      {/* 选择摘要 */}
      <SelectionSummary
        selectedAIConfig={selectedAIConfig}
        selectedTemplate={selectedTemplate}
      />
    </div>
  );
};

export default AIModelSelector;
