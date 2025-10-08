import React, { useMemo, useCallback } from 'react';
import { Breadcrumb, Space } from 'antd';
import {
  HomeOutlined,
  RightOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';

export interface FolderBreadcrumbProps {
  /** 当前文件夹 */
  folder: WorkNoteFolder | null;

  /** 所有文件夹列表（用于构建路径） */
  folders: WorkNoteFolder[];

  /** 点击面包屑回调 */
  onNavigate: (folderId: number | null) => void;

  /** 最大显示项数（超出则省略中间部分） */
  maxItems?: number;

  /** 是否显示图标 */
  showIcon?: boolean;
}

interface BreadcrumbItem {
  title: React.ReactNode;
  onClick?: () => void;
  key?: string | number;
}

/**
 * 文件夹面包屑导航组件
 *
 * 功能：
 * - 显示当前文件夹路径：首页 > 文件夹A > 子文件夹B
 * - 点击面包屑快速跳转
 * - 最后一级文件夹高亮显示
 * - 路径过长时省略中间部分
 * - 支持显示文件夹图标和颜色
 *
 * 性能优化：
 * - React.memo防止不必要的重渲染
 * - useMemo缓存计算结果
 * - useCallback缓存回调函数
 */
const FolderBreadcrumbComponent: React.FC<FolderBreadcrumbProps> = ({
  folder,
  folders,
  onNavigate,
  maxItems = 5,
  showIcon = true,
}) => {
  // 构建面包屑路径
  const buildPath = useCallback((currentFolder: WorkNoteFolder | null): BreadcrumbItem[] => {
    const path: BreadcrumbItem[] = [];

    // 添加根级（全部笔记）
    path.push({
      key: 'root',
      title: (
        <Space size={4}>
          <HomeOutlined />
          <span>全部笔记</span>
        </Space>
      ),
      onClick: () => onNavigate(null),
    });

    if (!currentFolder) return path;

    // 递归收集祖先文件夹
    const collectAncestors = (folderId: number): WorkNoteFolder[] => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return [];

      if (folder.parent_id) {
        return [...collectAncestors(folder.parent_id), folder];
      }
      return [folder];
    };

    const ancestors = collectAncestors(currentFolder.id);

    // 转换为面包屑项
    ancestors.forEach((f, index) => {
      const isLast = index === ancestors.length - 1;

      path.push({
        key: f.id,
        title: (
          <Space size={4}>
            {showIcon && f.icon && <span>{f.icon}</span>}
            {!showIcon && <FolderOutlined />}
            <span
              style={{
                color: f.color || undefined,
                fontWeight: isLast ? 600 : 400,
              }}
            >
              {f.name}
            </span>
          </Space>
        ),
        onClick: isLast ? undefined : () => onNavigate(f.id),
      });
    });

    return path;
  }, [folders, onNavigate, showIcon]);

  const breadcrumbItems = useMemo(() => buildPath(folder), [folder, buildPath]);

  // 路径过长时省略中间部分
  const displayItems = useMemo(() => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems;
    }

    // 保留首尾，省略中间
    const firstItem = breadcrumbItems[0];
    const lastItems = breadcrumbItems.slice(-(maxItems - 2));

    return [
      firstItem,
      {
        key: 'ellipsis',
        title: (
          <span
            style={{
              color: '#999',
              cursor: 'default',
              userSelect: 'none',
            }}
          >
            ...
          </span>
        ),
      },
      ...lastItems,
    ];
  }, [breadcrumbItems, maxItems]);

  // 转换为Ant Design Breadcrumb格式
  const antdItems = displayItems.map((item) => ({
    key: item.key,
    title: item.onClick ? (
      <a
        onClick={(e) => {
          e.preventDefault();
          item.onClick?.();
        }}
        style={{
          color: 'inherit',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (item.onClick) {
            e.currentTarget.style.color = '#1890ff';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'inherit';
        }}
      >
        {item.title}
      </a>
    ) : (
      item.title
    ),
  }));

  return (
    <Breadcrumb
      items={antdItems}
      separator={<RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />}
      style={{
        padding: '12px 16px',
        background: '#fafafa',
        borderBottom: '1px solid #e8e8e8',
        fontSize: 14,
      }}
    />
  );
};

// 使用 React.memo 优化性能
const FolderBreadcrumb = React.memo(FolderBreadcrumbComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在这些props改变时重新渲染
  return (
    prevProps.folder?.id === nextProps.folder?.id &&
    prevProps.folders === nextProps.folders &&
    prevProps.maxItems === nextProps.maxItems &&
    prevProps.showIcon === nextProps.showIcon &&
    prevProps.onNavigate === nextProps.onNavigate
  );
});

FolderBreadcrumb.displayName = 'FolderBreadcrumb';

export default FolderBreadcrumb;
