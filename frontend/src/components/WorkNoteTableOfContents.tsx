import React, { useState, useEffect } from 'react';
import { Anchor, Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useMarkdownTOC, TOCItem } from '../hooks/useMarkdownTOC';

const { Link } = Anchor;

interface WorkNoteTableOfContentsProps {
  /** Markdown 内容 */
  content: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

/**
 * 工作笔记目录导航组件
 *
 * 功能：
 * - 自动从 Markdown 内容提取标题生成目录
 * - 支持点击跳转到对应章节
 * - 高亮当前阅读位置
 * - 响应式设计
 */
const WorkNoteTableOfContents: React.FC<WorkNoteTableOfContentsProps> = ({
  content,
  style,
  className
}) => {
  const toc = useMarkdownTOC(content);
  const [currentAnchor, setCurrentAnchor] = useState<string>('');

  // 渲染目录项
  const renderTOCItems = (items: TOCItem[]): React.ReactNode => {
    return items.map(item => (
      <Link
        key={item.id}
        href={`#${item.id}`}
        title={
          <span
            style={{
              fontSize: item.level === 1 ? 14 : item.level === 2 ? 13 : 12,
              fontWeight: item.level === 1 ? 600 : 400,
              paddingLeft: (item.level - 1) * 12
            }}
          >
            {item.text}
          </span>
        }
      />
    ));
  };

  // 处理锚点变化
  const handleChange = (currentActiveLink: string) => {
    setCurrentAnchor(currentActiveLink);
  };

  // 空状态
  if (!toc || toc.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          ...style
        }}
        className={className}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              暂无目录<br />文档中没有标题
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px 0',
        height: '100%',
        overflowY: 'auto',
        ...style
      }}
      className={className}
    >
      {/* 标题 */}
      <div
        style={{
          padding: '0 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>
            目录
          </span>
          <span
            style={{
              fontSize: 12,
              color: '#8c8c8c',
              marginLeft: 'auto'
            }}
          >
            {toc.length} 项
          </span>
        </div>
      </div>

      {/* 目录列表 */}
      <Anchor
        affix={false}
        getCurrentAnchor={() => currentAnchor}
        onChange={handleChange}
        items={toc.map(item => ({
          key: item.id,
          href: `#${item.id}`,
          title: (
            <span
              style={{
                fontSize: item.level === 1 ? 14 : item.level === 2 ? 13 : 12,
                fontWeight: item.level === 1 ? 600 : 400,
                color: currentAnchor === `#${item.id}` ? '#1890ff' : '#262626',
                display: 'block',
                padding: '4px 0',
                paddingLeft: (item.level - 1) * 12,
                transition: 'all 0.3s'
              }}
            >
              {item.text}
            </span>
          )
        }))}
      />
    </div>
  );
};

export default WorkNoteTableOfContents;
