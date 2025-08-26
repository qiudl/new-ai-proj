import React from 'react';
import { Space, Button, Tooltip, Dropdown, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';
import PermissionButton from './PermissionButton';
import { AnyPermission } from '../constants/permissions';

interface TableAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  permission?: AnyPermission;
  permissions?: AnyPermission[];
  requireAll?: boolean;
  danger?: boolean;
  disabled?: boolean;
  confirmTitle?: string;
  confirmContent?: string;
  onClick: (record: any) => void | Promise<void>;
}

interface PermissionTableActionsProps {
  record: any; // 表格行数据
  actions?: TableAction[]; // 自定义操作
  
  // 预设操作配置
  showView?: boolean;
  viewPermission?: AnyPermission;
  onView?: (record: any) => void;
  
  showEdit?: boolean;
  editPermission?: AnyPermission;
  onEdit?: (record: any) => void;
  
  showDelete?: boolean;
  deletePermission?: AnyPermission;
  onDelete?: (record: any) => void;
  deleteConfirmTitle?: string;
  deleteConfirmContent?: string | ((record: any) => string);
  
  // 更多操作下拉菜单
  moreActions?: TableAction[];
  
  // 样式配置
  size?: 'small' | 'middle' | 'large';
  maxVisibleActions?: number; // 最多显示多少个操作，超出的放入更多菜单
}

/**
 * 权限表格操作列组件
 * 
 * 提供常见的表格操作按钮，根据权限自动显示/隐藏
 * 支持查看、编辑、删除等预设操作，也支持自定义操作
 */
const PermissionTableActions: React.FC<PermissionTableActionsProps> = ({
  record,
  actions = [],
  
  showView = false,
  viewPermission,
  onView,
  
  showEdit = false,
  editPermission,
  onEdit,
  
  showDelete = false,
  deletePermission,
  onDelete,
  deleteConfirmTitle = '确认删除',
  deleteConfirmContent,
  
  moreActions = [],
  
  size = 'small',
  maxVisibleActions = 3
}) => {
  // 构建预设操作列表
  const presetActions: TableAction[] = [];
  
  if (showView && onView) {
    presetActions.push({
      key: 'view',
      label: '查看',
      icon: <EyeOutlined />,
      permission: viewPermission,
      onClick: onView
    });
  }
  
  if (showEdit && onEdit) {
    presetActions.push({
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      permission: editPermission,
      onClick: onEdit
    });
  }
  
  if (showDelete && onDelete) {
    presetActions.push({
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      permission: deletePermission,
      danger: true,
      confirmTitle: deleteConfirmTitle,
      confirmContent: typeof deleteConfirmContent === 'function' 
        ? deleteConfirmContent(record) 
        : deleteConfirmContent,
      onClick: onDelete
    });
  }
  
  // 合并所有操作
  const allActions = [...presetActions, ...actions];
  
  // 处理带确认的操作
  const handleActionClick = React.useCallback((action: TableAction) => {
    if (action.confirmTitle || action.confirmContent) {
      Modal.confirm({
        title: action.confirmTitle || '确认操作',
        content: action.confirmContent || `确定要${action.label}吗？`,
        okText: '确定',
        cancelText: '取消',
        okType: action.danger ? 'danger' : 'primary',
        onOk: () => action.onClick(record)
      });
    } else {
      action.onClick(record);
    }
  }, [record]);
  
  // 分割可见操作和更多操作
  const visibleActions = allActions.slice(0, maxVisibleActions);
  const hiddenActions = [
    ...allActions.slice(maxVisibleActions),
    ...moreActions
  ];
  
  // 渲染单个操作按钮
  const renderAction = (action: TableAction) => {
    return (
      <PermissionButton
        key={action.key}
        type="text"
        size={size}
        icon={action.icon}
        permission={action.permission}
        permissions={action.permissions}
        requireAll={action.requireAll}
        dangerousOperation={action.danger}
        fallbackMode="hide"
        disabled={action.disabled}
        onClick={() => handleActionClick(action)}
        style={action.danger ? { color: '#ff4d4f' } : undefined}
      >
        {size !== 'small' ? action.label : undefined}
      </PermissionButton>
    );
  };
  
  // 渲染下拉菜单项
  const renderDropdownItems = () => {
    return hiddenActions.map(action => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      danger: action.danger,
      disabled: action.disabled,
      onClick: () => handleActionClick(action)
    }));
  };
  
  if (allActions.length === 0) {
    return <span>-</span>;
  }
  
  return (
    <Space size="small">
      {/* 可见操作按钮 */}
      {visibleActions.map(renderAction)}
      
      {/* 更多操作下拉菜单 */}
      {hiddenActions.length > 0 && (
        <Dropdown
          menu={{ items: renderDropdownItems() }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button 
            type="text" 
            size={size} 
            icon={<MoreOutlined />}
            style={{ color: '#666' }}
          />
        </Dropdown>
      )}
    </Space>
  );
};

export default PermissionTableActions;