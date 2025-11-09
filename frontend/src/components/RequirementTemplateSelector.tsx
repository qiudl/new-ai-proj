/**
 * 需求模板选择器组件
 * Requirement Template Selector Component
 */

import React, { useState } from 'react';
import { Modal, Card, Row, Col, Badge, Empty, Input, Tabs, Space, Tag } from 'antd';
import {
  PlusCircleOutlined,
  BugOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  RequirementTemplate,
  RequirementTemplateType,
} from '../types/requirementTemplate';
import {
  REQUIREMENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from '../config/requirementTemplates';

const { Search } = Input;
const { TabPane } = Tabs;

interface RequirementTemplateSelectorProps {
  visible: boolean;
  onSelect: (template: RequirementTemplate) => void;
  onCancel: () => void;
}

/**
 * 获取图标组件
 */
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    PlusCircleOutlined: <PlusCircleOutlined />,
    BugOutlined: <BugOutlined />,
    ThunderboltOutlined: <ThunderboltOutlined />,
    UserOutlined: <UserOutlined />,
    ExperimentOutlined: <ExperimentOutlined />,
    SafetyOutlined: <SafetyOutlined />,
  };
  return iconMap[iconName] || <PlusCircleOutlined />;
};

/**
 * 需求模板选择器组件
 */
const RequirementTemplateSelector: React.FC<RequirementTemplateSelectorProps> = ({
  visible,
  onSelect,
  onCancel,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  /**
   * 过滤模板
   */
  const filterTemplates = (templates: RequirementTemplate[]): RequirementTemplate[] => {
    if (!searchText) return templates;

    const lowerSearch = searchText.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(lowerSearch) ||
        template.description.toLowerCase().includes(lowerSearch) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(lowerSearch))
    );
  };

  /**
   * 获取当前显示的模板列表
   */
  const getDisplayTemplates = (): RequirementTemplate[] => {
    if (activeTab === 'all') {
      return filterTemplates(REQUIREMENT_TEMPLATES);
    }

    const category = TEMPLATE_CATEGORIES.find((c) => c.id === activeTab);
    return category ? filterTemplates(category.templates) : [];
  };

  /**
   * 渲染模板卡片
   */
  const renderTemplateCard = (template: RequirementTemplate) => {
    return (
      <Col xs={24} sm={12} md={8} key={template.id}>
        <Card
          hoverable
          onClick={() => onSelect(template)}
          style={{
            borderColor: template.color,
            borderWidth: 2,
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* 图标和标题 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px', color: template.color }}>
                {getIconComponent(template.icon)}
              </span>
              <h4 style={{ margin: 0, fontSize: '16px' }}>{template.name}</h4>
            </div>

            {/* 描述 */}
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: '#8c8c8c',
                minHeight: '36px',
              }}
            >
              {template.description}
            </p>

            {/* 标签 */}
            {template.tags && template.tags.length > 0 && (
              <div>
                {template.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} style={{ fontSize: '11px', marginBottom: '4px' }}>
                    {tag}
                  </Tag>
                ))}
              </div>
            )}

            {/* 推荐标签 */}
            {template.recommended_for && template.recommended_for.length > 0 && (
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                推荐: {template.recommended_for.join('、')}
              </div>
            )}
          </Space>
        </Card>
      </Col>
    );
  };

  const displayTemplates = getDisplayTemplates();

  return (
    <Modal
      title="选择需求模板"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      bodyStyle={{ padding: '24px' }}
    >
      {/* 搜索框 */}
      <div style={{ marginBottom: '16px' }}>
        <Search
          placeholder="搜索模板名称、描述或标签..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
        />
      </div>

      {/* 分类标签 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <Badge count={REQUIREMENT_TEMPLATES.length} offset={[10, 0]}>
              全部模板
            </Badge>
          }
          key="all"
        />
        {TEMPLATE_CATEGORIES.map((category) => (
          <TabPane
            tab={
              <Badge count={category.templates.length} offset={[10, 0]}>
                {category.name}
              </Badge>
            }
            key={category.id}
          />
        ))}
      </Tabs>

      {/* 模板网格 */}
      <div style={{ marginTop: '16px', maxHeight: '500px', overflowY: 'auto' }}>
        {displayTemplates.length > 0 ? (
          <Row gutter={[16, 16]}>{displayTemplates.map(renderTemplateCard)}</Row>
        ) : (
          <Empty
            description={
              searchText ? `未找到匹配 "${searchText}" 的模板` : '暂无模板'
            }
          />
        )}
      </div>

      {/* 提示信息 */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f0f2f5',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#8c8c8c',
        }}
      >
        💡 提示: 选择模板后，表单将自动填充预设内容，您可以根据实际需求进行修改
      </div>
    </Modal>
  );
};

export default RequirementTemplateSelector;
