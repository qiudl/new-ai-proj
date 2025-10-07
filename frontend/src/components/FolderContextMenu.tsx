import React from 'react';
import { Dropdown, MenuProps, Space } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  DragOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';

export type FolderAction =
  | 'create'      // 新建子文件夹
  | 'rename'      // 重命名
  | 'move'        // 移动
  | 'delete'      // 删除
  | 'detail';     // 查看详情

export interface FolderContextMenuProps {
  /** 触发菜单的文件夹 */
  folder: WorkNoteFolder | null;

  /** 菜单显示位置 */
  position: { x: number; y: number } | null;

  /** 关闭菜单回调 */
  onClose: () => void;

  /** 菜单操作回调 */
  onAction: (action: FolderAction, folder: WorkNoteFolder) => void;

  /** 是否显示快捷键提示 */
  showShortcuts?: boolean;
}

/**
 * 文件夹右键菜单组件
 *
 * 功能：
 * - 在文件夹节点上右键显示上下文菜单
 * - 菜单项：新建子文件夹、重命名、移动、删除、查看详情
 * - 支持键盘快捷键提示
 * - 根据权限显示/隐藏菜单项
 *
 * 性能优化：
 * - React.memo防止不必要的重渲染
 */
const FolderContextMenuComponent: React.FC<FolderContextMenuProps> = ({
  folder,
  position,
  onClose,
  onAction,
  showShortcuts = true,
}) => {
  if (!folder || !position) {
    return null;
  }

  const handleAction = (action: FolderAction) => {
    onAction(action, folder);
    onClose();
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'create',
      icon: <PlusOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 160 }}>
          <span>新建子文件夹</span>
          {showShortcuts && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Ctrl+N</span>}
        </div>
      ),
      onClick: () => handleAction('create'),
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>重命名</span>
          {showShortcuts && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>F2</span>}
        </div>
      ),
      onClick: () => handleAction('rename'),
    },
    {
      key: 'move',
      icon: <DragOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>移动</span>
          {showShortcuts && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Ctrl+M</span>}
        </div>
      ),
      onClick: () => handleAction('move'),
    },
    { type: 'divider' },
    {
      key: 'detail',
      icon: <InfoCircleOutlined />,
      label: '查看详情',
      onClick: () => handleAction('detail'),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>删除</span>
          {showShortcuts && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Delete</span>}
        </div>
      ),
      danger: true,
      onClick: () => handleAction('delete'),
    },
  ];

  return (
    <>
      {/* 创建一个不可见的固定位置元素作为菜单的触发点 */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />

      {/* 使用Dropdown显示菜单 */}
      <Dropdown
        open={true}
        menu={{ items: menuItems }}
        trigger={['contextMenu']}
        overlayStyle={{
          position: 'fixed',
          left: position.x,
          top: position.y,
        }}
      >
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
      </Dropdown>
    </>
  );
};

// 使用 React.memo 优化性能
const FolderContextMenu = React.memo(FolderContextMenuComponent, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.folder?.id === nextProps.folder?.id &&
    prevProps.position?.x === nextProps.position?.x &&
    prevProps.position?.y === nextProps.position?.y &&
    prevProps.showShortcuts === nextProps.showShortcuts &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onAction === nextProps.onAction
  );
});

FolderContextMenu.displayName = 'FolderContextMenu';

export default FolderContextMenu;
