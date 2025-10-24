/**
 * VersionPanelHeader - 版本面板头部组件
 *
 * 显示版本统计信息和快捷操作
 */

import React from 'react';
import { Space, Button, Tag, Tooltip } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

export interface VersionPanelHeaderProps {
  /** 总版本数 */
  totalCount: number;
  /** 当前版本号 */
  currentVersion: string;
  /** 刷新回调 */
  onRefresh: () => void;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 版本面板头部
 */
const VersionPanelHeader: React.FC<VersionPanelHeaderProps> = ({
  totalCount,
  currentVersion,
  onRefresh,
  loading = false
}) => {
  return (
    <Space size="small">
      {currentVersion && (
        <Tag color="blue">当前: v{currentVersion}</Tag>
      )}
      <Tag>{totalCount} 个版本</Tag>
      <Tooltip title="刷新版本列表">
        <Button
          type="text"
          size="small"
          icon={<SyncOutlined spin={loading} />}
          onClick={onRefresh}
          disabled={loading}
        />
      </Tooltip>
    </Space>
  );
};

VersionPanelHeader.displayName = 'VersionPanelHeader';

export default React.memo(VersionPanelHeader);
