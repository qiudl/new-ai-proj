/**
 * ActiveUsersPanel - 显示当前活跃用户列表
 */

import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export interface CollaborationUser {
  userId: number;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number };
}

interface ActiveUsersPanelProps {
  users: CollaborationUser[];
}

export default function ActiveUsersPanel({ users }: ActiveUsersPanelProps): JSX.Element {
  if (users.length === 0) {
    return <div className="active-users-panel">仅你一人</div>;
  }

  return (
    <div className="active-users-panel">
      <span className="active-users-label">协作中:</span>
      <Avatar.Group maxCount={5} maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>
        {users.map((user) => (
          <Tooltip key={user.userId} title={user.userName} placement="bottom">
            <Avatar
              style={{ backgroundColor: user.userColor }}
              icon={<UserOutlined />}
            >
              {user.userName.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    </div>
  );
}
