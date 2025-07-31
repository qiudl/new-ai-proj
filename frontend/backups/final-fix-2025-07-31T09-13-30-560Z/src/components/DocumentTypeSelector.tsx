// @ts-nocheck
import React, { useState } from 'react';
import { Card, Select, Typography, Row, Col } from 'antd';
import { 
 FileTextOutlined, 
 FilePdfOutlined, 
 UserOutlined,
 BookOutlined,
 ToolOutlined,
 FolderOutlined
} from '@ant-design/icons';
import { DocumentType } from '../types/document';

const { Title, Text } = Typography;


// 文档类型配置
export const documentTypes = {
  markdown: {
    type: 'markdown' as DocumentType,
    name: 'Markdown文档',
    description: '支持富文本格式的文档',
    icon: <FileTextOutlined />,
    color: '#1890ff',
    extensions: ['.md'],
    template: '# 新建文档\n\n开始编写您的Markdown文档...'
  },
  image: {
    type: 'image' as DocumentType,
    name: '图片文件',
    description: '图片和媒体文件',
    icon: <PictureOutlined />,
    color: '#52c41a',
    extensions: ['.png', '.jpg', '.jpeg'],
    template: ''
  },
  pdf: {
    type: 'pdf' as DocumentType,
    name: 'PDF文档',
    description: 'PDF文档文件',
    icon: <FilePdfOutlined />,
    color: '#ff4d4f',
    extensions: ['.pdf'],
    template: ''
  }
};

// 文档分类配置
export const documentCategories = {
  project: {
    id: 'project',
    name: '项目文档',
    icon: <ProjectOutlined />,
    color: '#1890ff',
    description: '项目相关的文档资料',
    subcategories: [
      { id: 'requirement', name: '需求文档', description: '项目需求和规格说明' },
      { id: 'technical', name: '技术方案', description: '技术设计和架构文档' },
      { id: 'meeting', name: '会议纪要', description: '项目会议记录' },
      { id: 'plan', name: '项目计划', description: '项目进度和计划安排' },
      { id: 'summary', name: '总结报告', description: '项目总结和复盘' }
    ]
  },
  client: {
    id: 'client',
    name: '客户文档',
    icon: <UserOutlined />,
    color: '#52c41a',
    description: '客户相关的文档资料',
    subcategories: [
      { id: 'profile', name: '客户资料', description: '客户基本信息和档案' },
      { id: 'contract', name: '合同协议', description: '合同文件和协议' },
      { id: 'communication', name: '沟通记录', description: '客户沟通历史记录' },
      { id: 'change', name: '需求变更', description: '需求变更和修改记录' },
      { id: 'acceptance', name: '验收文档', description: '项目验收相关文档' }
    ]
  },
  user: {
    id: 'user',
    name: '用户文档',
    icon: <BookOutlined />,
    color: '#fa8c16',
    description: '面向用户的文档资料',
    subcategories: [
      { id: 'manual', name: '用户手册', description: '产品使用说明书' },
      { id: 'guide', name: '操作指南', description: '操作步骤和指导' },
      { id: 'faq', name: 'FAQ文档', description: '常见问题解答' },
      { id: 'training', name: '培训材料', description: '用户培训相关材料' },
      { id: 'release', name: '发布说明', description: '版本发布和更新说明' }
    ]
  },
  internal: {
    id: 'internal',
    name: '内部文档',
    icon: <ToolOutlined />,
    color: '#722ed1',
    description: '内部使用的文档资料',
    subcategories: [
      { id: 'process', name: '流程规范', description: '内部流程和规范制度' },
      { id: 'technical_doc', name: '技术文档', description: '技术实现和开发文档' },
      { id: 'knowledge', name: '团队知识库', description: '团队知识积累和分享' },
      { id: 'template', name: '模板库', description: '文档模板和样例' },
      { id: 'archive', name: '归档文档', description: '历史文档和归档资料' }
    ]
  }
};

interface DocumentTypeSelectorProps {
  selectedType?: DocumentType;
  selectedCategory?: string;
  selectedSubcategory?: string;
  onTypeChange?: (type: DocumentType) => void;
  onCategoryChange?: (category: string, subcategory?: string) => void;
  showCategories?: boolean;
  mode?: 'card' | 'compact';
  className?: string;
}

const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  selectedType = 'markdown',
  selectedCategory,
  selectedSubcategory,
  onTypeChange,
  onCategoryChange,
  showCategories = true,
  mode = 'card',
  className
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(selectedCategory || null);

  // 处理文档类型选择
  const handleTypeSelect = (type: DocumentType) => {
    onTypeChange?.(type);
  };

  // 处理分类选择
  const handleCategorySelect = (categoryId: string, subcategoryId?: string) => {
    setExpandedCategory(categoryId);
    onCategoryChange?.(categoryId, subcategoryId);
  };

  // 渲染文档类型选择器
  const renderTypeSelector = () => {
    if (mode === 'compact') {
      return (
        <Select
          value={selectedType}
          onChange={handleTypeSelect}
          style={{ width: '100%' }}
          placeholder="选择文档类型"
        >
          {Object.values(documentTypes).map(type => (
            <Option key={type.type} value={type.type}>
              <span style={{ color: type.color, marginRight: '8px' }}>
                {type.icon}
              </span>
              {type.name}
            </Option>
          ))}
        </Select>
      );
    }

    return (
      <div>
        <Title level={5} style={{ marginBottom: '12px' }}>
          文档类型
        </Title>
        <Row gutter={[12, 12]}>
          {Object.values(documentTypes).map(type => (
            <Col key={type.type} span={8}>
              <Card
                size="small"
                className={`document-type-card ${selectedType === type.type ? 'selected' : ''}`}
                onClick={() => handleTypeSelect(type.type)}
                style={{
                  cursor: 'pointer',
                  border: selectedType === type.type ? `2px solid ${type.color}` : '1px solid #d9d9d9',
                  backgroundColor: selectedType === type.type ? `${type.color}08` : '#fff'
                }}
                styles={{ body: { padding: '12px', textAlign: 'center' } }}
              >
                <div style={{ fontSize: '24px', color: type.color, marginBottom: '8px' }}>
                  {type.icon}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {type.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {type.description}
                </div>
                <div style={{ marginTop: '8px' }}>
                  {type.extensions.map(ext => (
                    <Tag key={ext} color={type.color}>
                      {ext}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  // 渲染分类选择器
  const renderCategorySelector = () => {
    if (!showCategories) return null;

    if (mode === 'compact') {
      return (
        <div style={{ marginTop: '16px' }}>
          <Select
            value={selectedCategory}
            onChange={(categoryId) => handleCategorySelect(categoryId)}
            style={{ width: '100%', marginBottom: '8px' }}
            placeholder="选择文档分类"
            allowClear
          >
            {Object.values(documentCategories).map(category => (
              <Option key={category.id} value={category.id}>
                <span style={{ color: category.color, marginRight: '8px' }}>
                  {category.icon}
                </span>
                {category.name}
              </Option>
            ))}
          </Select>
          
          {selectedCategory && documentCategories[selectedCategory as keyof typeof documentCategories] && (
            <Select
              value={selectedSubcategory}
              onChange={(subcategoryId) => handleCategorySelect(selectedCategory, subcategoryId)}
              style={{ width: '100%' }}
              placeholder="选择子分类"
              allowClear
            >
              {documentCategories[selectedCategory as keyof typeof documentCategories].subcategories.map((sub: any) => (
                <Option key={sub.id} value={sub.id}>
                  {sub.name}
                </Option>
              ))}
            </Select>
          )}
        </div>
      );
    }

    return (
      <div style={{ marginTop: '24px' }}>
        <Title level={5} style={{ marginBottom: '12px' }}>
          文档分类
        </Title>
        <Row gutter={[12, 12]}>
          {Object.values(documentCategories).map(category => (
            <Col key={category.id} span={12}>
              <Card
                size="small"
                className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
                onClick={() => handleCategorySelect(category.id)}
                style={{
                  cursor: 'pointer',
                  border: selectedCategory === category.id ? `2px solid ${category.color}` : '1px solid #d9d9d9',
                  backgroundColor: selectedCategory === category.id ? `${category.color}08` : '#fff'
                }}
                styles={{ body: { padding: '12px' } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px', color: category.color, marginRight: '8px' }}>
                    {category.icon}
                  </span>
                  <span style={{ fontWeight: 'bold' }}>
                    {category.name}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {category.description}
                </div>
                
                {selectedCategory === category.id && (
                  <div style={{ marginTop: '12px' }}>
                    <Text style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
                      子分类：
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {category.subcategories.map(sub => (
                        <Tooltip key={sub.id} title={sub.description}>
                          <Tag
                            color={selectedSubcategory === sub.id ? category.color : 'default'}
                            style={{ 
                              cursor: 'pointer', 
                              margin: '2px',
                              fontSize: '11px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategorySelect(category.id, sub.id);
                            }}
                          >
                            {sub.name}
                          </Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  return (
    <div className={className}>
      {renderTypeSelector()}
      {renderCategorySelector()}
    </div>
  );
};

export default DocumentTypeSelector;