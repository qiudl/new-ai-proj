import React from 'react';
import { Dropdown, MenuProps, Space } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  DragOutlined,
  FolderOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';
import { useWorkNotePermissions } from '../hooks/useWorkNotePermissions';

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
  onAction: (action: FolderAction, folder: WorkNoteFolder | null) => void;

  /** 是否显示快捷键提示 */
  showShortcuts?: boolean;

  /** 是否只显示创建选项（用于根节点） */
  showCreateOnly?: boolean;
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
  showCreateOnly = false,
}) => {
  // 权限检查
  const {
    isSystemAdmin,
    canCreateFolder,
    canEditFolder,
    canDeleteFolder,
    canMoveFolder
  } = useWorkNotePermissions();

  if (!position) {
    return null;
  }

  const handleAction = (action: FolderAction) => {
    onAction(action, folder);
    onClose();
  };

  // 根节点只显示创建选项
  if (showCreateOnly) {
    const createOnlyItems: MenuProps['items'] = [
      {
        key: 'create',
        icon: <PlusOutlined />,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 160 }}>
            <span>新建文件夹</span>
            {showShortcuts && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Ctrl+N</span>}
          </div>
        ),
        onClick: () => handleAction('create'),
      },
    ];

    return (
      <>
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
        <Dropdown
          open={true}
          menu={{ items: createOnlyItems }}
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
  }

  // 文件夹节点显示完整菜单
  if (!folder) {
    return null;
  }

  // 计算当前文件夹的权限
  const folderInfo = {
    id: folder.id,
    creatorId: folder.owner_id,
    treeType: folder.visibility as 'private' | 'team' | 'public'
  };

  const hasEditPermission = canEditFolder(folderInfo);
  const hasDeletePermission = canDeleteFolder(folderInfo);
  const hasMovePermission = canMoveFolder(folderInfo);
  const hasCreatePermission = canCreateFolder(folder.visibility as 'private' | 'team' | 'public');

  const menuItems: MenuProps['items'] = [
    {
      key: 'create',
      icon: hasCreatePermission ? <PlusOutlined /> : <LockOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 160 }}>
          <span>{hasCreatePermission ? '新建子文件夹' : '新建子文件夹 (无权限)'}</span>
          {showShortcuts && hasCreatePermission && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Ctrl+N</span>}
        </div>
      ),
      disabled: !hasCreatePermission,
      onClick: () => hasCreatePermission && handleAction('create'),
    },
    {
      key: 'rename',
      icon: hasEditPermission ? <EditOutlined /> : <LockOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{hasEditPermission ? '重命名' : '重命名 (无权限)'}</span>
          {showShortcuts && hasEditPermission && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>F2</span>}
        </div>
      ),
      disabled: !hasEditPermission,
      onClick: () => hasEditPermission && handleAction('rename'),
    },
    {
      key: 'move',
      icon: hasMovePermission ? <DragOutlined /> : <LockOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{hasMovePermission ? '移动' : '移动 (无权限)'}</span>
          {showShortcuts && hasMovePermission && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Ctrl+M</span>}
        </div>
      ),
      disabled: !hasMovePermission,
      onClick: () => hasMovePermission && handleAction('move'),
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
      icon: hasDeletePermission ? <DeleteOutlined /> : <LockOutlined />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{hasDeletePermission ? '删除' : '删除 (无权限)'}</span>
          {showShortcuts && hasDeletePermission && <span style={{ fontSize: 12, color: '#999', marginLeft: 24 }}>Delete</span>}
        </div>
      ),
      danger: hasDeletePermission,
      disabled: !hasDeletePermission,
      onClick: () => hasDeletePermission && handleAction('delete'),
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
