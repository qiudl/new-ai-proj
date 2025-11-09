/**
 * ConnectionStatus - 协作连接状态显示组件
 */

import React from 'react';
import { Tag, Tooltip } from 'antd';
import { WifiOutlined, SyncOutlined, DisconnectOutlined, WarningOutlined } from '@ant-design/icons';

interface ConnectionStatusProps {
  isConnected: boolean;
  isSynced: boolean;
  error?: Error | null;
}

export default function ConnectionStatus({ isConnected, isSynced, error }: ConnectionStatusProps): JSX.Element {
  if (error) {
    return (
      <Tooltip title={`连接错误: ${error.message}`}>
        <Tag icon={<WarningOutlined />} color="error">
          连接失败
        </Tag>
      </Tooltip>
    );
  }

  if (!isConnected) {
    return (
      <Tooltip title="正在连接到协作服务器...">
        <Tag icon={<DisconnectOutlined />} color="default">
          未连接
        </Tag>
      </Tooltip>
    );
  }

  if (!isSynced) {
    return (
      <Tooltip title="正在同步文档数据...">
        <Tag icon={<SyncOutlined spin />} color="processing">
          同步中
        </Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="已连接并同步">
      <Tag icon={<WifiOutlined />} color="success">
        已连接
      </Tag>
    </Tooltip>
  );
}
