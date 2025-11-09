/**
 * RequirementDetailLayout - 需求详情页面布局组件
 *
 * 职责:
 * - 提供两栏响应式布局 (lg=16 左, lg=8 右)
 * - 管理整体页面结构
 * - 与任务详情页保持一致的布局规范
 * - 不包含具体业务逻辑
 */

import React from 'react';
import { Row, Col } from 'antd';

export interface RequirementDetailLayoutProps {
  /** 左侧主内容区 */
  content: React.ReactNode;
  /** 右侧信息栏 */
  sidebar: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * RequirementDetailLayout 组件
 *
 * 布局结构:
 * ```
 * <Row gutter={[24, 24]}>
 *   <Col lg={16}>  // 左侧主内容
 *   <Col lg={8}>   // 右侧信息栏
 * </Row>
 * ```
 */
export const RequirementDetailLayout: React.FC<RequirementDetailLayoutProps> = ({
  content,
  sidebar,
  className,
  style
}) => {
  return (
    <Row
      gutter={[24, 24]}
      className={className}
      style={{
        position: 'relative',
        ...style
      }}
    >
      {/* 左侧主要内容区 */}
      <Col
        xs={24}
        sm={24}
        md={24}
        lg={16}
        xl={16}
      >
        {content}
      </Col>

      {/* 右侧信息栏 */}
      <Col
        xs={24}
        sm={24}
        md={24}
        lg={8}
        xl={8}
        className="info-sidebar"
      >
        {sidebar}
      </Col>
    </Row>
  );
};

RequirementDetailLayout.displayName = 'RequirementDetailLayout';
