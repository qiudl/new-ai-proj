import React from 'react';
import { Card, Badge } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { DocumentTemplate } from '../types';

interface TemplateCardProps {
  template: DocumentTemplate;
  selected: boolean;
  recommended?: boolean;
  onClick: () => void;
}

/**
 * 模板卡片组件
 */
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  selected,
  recommended = false,
  onClick,
}) => {
  return (
    <Badge.Ribbon
      text="推荐"
      color="volcano"
      style={{ display: recommended ? 'block' : 'none' }}
    >
      <Card
        hoverable
        onClick={onClick}
        style={{
          borderColor: selected ? '#1890ff' : '#d9d9d9',
          borderWidth: selected ? 2 : 1,
          backgroundColor: selected ? '#f0f8ff' : '#fff',
          cursor: 'pointer',
          height: '100%',
          transition: 'all 0.3s',
        }}
        styles={{ body: { padding: '20px 16px'  }}}
      >
        {/* 选中标记 */}
        {selected && (
          <CheckCircleFilled
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 20,
              color: '#1890ff',
              zIndex: 1,
            }}
          />
        )}

        {/* 图标 */}
        <div
          style={{
            fontSize: 48,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          {template.icon}
        </div>

        {/* 名称 */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 8,
            color: '#262626',
          }}
        >
          {template.name}
        </div>

        {/* 描述 */}
        <div
          style={{
            fontSize: 13,
            color: '#8c8c8c',
            textAlign: 'center',
            lineHeight: '1.5',
            minHeight: 40,
          }}
        >
          {template.description}
        </div>
      </Card>
    </Badge.Ribbon>
  );
};

export default TemplateCard;
