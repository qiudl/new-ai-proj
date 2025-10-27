/**
 * 基础权限说明组件
 *
 * 用于在权限管理界面展示基础权限信息
 * 帮助管理员理解哪些权限是所有用户默认拥有的
 */

import React from 'react';
import {
  BASE_PERMISSION_CATEGORIES,
  BASE_PERMISSION_DESCRIPTIONS,
  BASE_PERMISSIONS_ARRAY
} from '../constants/permissions';

interface BasePermissionsInfoProps {
  /** 是否显示详细描述 */
  showDescriptions?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示为折叠面板 */
  collapsible?: boolean;
}

/**
 * 基础权限信息组件
 */
export const BasePermissionsInfo: React.FC<BasePermissionsInfoProps> = ({
  showDescriptions = true,
  className = '',
  collapsible = false
}) => {
  const [isExpanded, setIsExpanded] = React.useState(!collapsible);

  const toggleExpand = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`base-permissions-info ${className}`}>
      {/* 标题栏 */}
      <div
        className="base-permissions-header"
        onClick={toggleExpand}
        style={{
          padding: '12px 16px',
          backgroundColor: '#f0f7ff',
          borderLeft: '4px solid #1890ff',
          borderRadius: '4px',
          marginBottom: isExpanded ? '16px' : '0',
          cursor: collapsible ? 'pointer' : 'default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: '#1890ff', fontSize: '14px', fontWeight: 600 }}>
            ℹ️ 基础权限说明
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            以下 {BASE_PERMISSIONS_ARRAY.length} 个权限是所有认证用户默认拥有的核心功能权限，无需手动分配
          </p>
        </div>
        {collapsible && (
          <span style={{ fontSize: '18px', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        )}
      </div>

      {/* 权限列表 */}
      {isExpanded && (
        <div className="base-permissions-content">
          {Object.entries(BASE_PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
            <div
              key={categoryKey}
              className="base-permission-category"
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #e8e8e8'
              }}
            >
              {/* 分类标题 */}
              <div className="category-header" style={{ marginBottom: '8px' }}>
                <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#333' }}>
                  {category.name}
                </h5>
                {showDescriptions && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                    {category.description}
                  </p>
                )}
              </div>

              {/* 权限列表 */}
              <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
                {category.permissions.map((permission) => (
                  <li
                    key={permission}
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px'
                    }}
                  >
                    <code
                      style={{
                        backgroundColor: '#fff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        border: '1px solid #d9d9d9',
                        fontSize: '11px',
                        fontFamily: 'Monaco, Consolas, monospace',
                        color: '#d63031'
                      }}
                    >
                      {permission}
                    </code>
                    {showDescriptions && BASE_PERMISSION_DESCRIPTIONS[permission] && (
                      <span style={{ marginLeft: '8px', color: '#999' }}>
                        - {BASE_PERMISSION_DESCRIPTIONS[permission]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 底部说明 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fffbe6',
              borderLeft: '4px solid #faad14',
              borderRadius: '4px',
              marginTop: '16px'
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
              <strong>📌 设计理念：</strong>
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
              <li><strong>简化用户体验</strong> - 新用户无需配置即可使用基本功能</li>
              <li><strong>数据隔离</strong> - 虽然开放功能权限，但严格限制只能访问自己的数据</li>
              <li><strong>向后兼容</strong> - 不影响现有的权限系统和角色配置</li>
            </ul>
          </div>
        </div>
      )}

      {/* 样式 */}
      <style>{`
        .base-permissions-info {
          width: 100%;
        }

        .base-permissions-header:hover {
          background-color: ${collapsible ? '#e6f4ff' : '#f0f7ff'};
        }

        .base-permission-category:hover {
          border-color: #1890ff;
          box-shadow: 0 1px 4px rgba(24, 144, 255, 0.1);
        }

        .base-permissions-content {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

/**
 * 基础权限徽章组件
 * 用于在权限列表中标识基础权限
 */
export const BasePermissionBadge: React.FC<{ permission: string }> = ({ permission }) => {
  const { isBasePermission } = require('../constants/permissions');

  if (!isBasePermission(permission)) {
    return null;
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        backgroundColor: '#e6f4ff',
        color: '#1890ff',
        fontSize: '11px',
        borderRadius: '10px',
        marginLeft: '8px',
        fontWeight: 500
      }}
      title="基础权限 - 所有认证用户默认拥有"
    >
      基础
    </span>
  );
};

export default BasePermissionsInfo;
