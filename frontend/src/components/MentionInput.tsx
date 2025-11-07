/**
 * MentionInput - 支持@用户的输入组件
 * 基于Ant Design的Mentions组件实现
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Mentions, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { userService } from '../services/userService';
import { User } from '../types/user';
import debounce from 'lodash/debounce';

const { Option } = Mentions;

export interface MentionInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onMentionedUsersChange?: (userIds: number[]) => void;
  placeholder?: string;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MentionInput组件
 * 支持@用户功能的文本输入框
 */
const MentionInput: React.FC<MentionInputProps> = ({
  value = '',
  onChange,
  onMentionedUsersChange,
  placeholder = '输入 @ 提及用户...',
  autoSize = { minRows: 2, maxRows: 6 },
  maxLength,
  disabled = false,
  className = '',
  style = {},
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<number>>(new Set());
  // 维护username到user_id的映射
  const [usernameToIdMap, setUsernameToIdMap] = useState<Map<string, number>>(new Map());

  /**
   * 搜索用户 (防抖)
   */
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query || query.trim().length === 0) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const result = await userService.searchUsers(query, 1, 20);
        const foundUsers = result.users || [];
        setUsers(foundUsers);

        // 更新username到ID的映射
        const newMap = new Map(usernameToIdMap);
        foundUsers.forEach(user => {
          newMap.set(user.username, user.id);
        });
        setUsernameToIdMap(newMap);
      } catch (error) {
        console.error('Failed to search users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [usernameToIdMap]
  );

  /**
   * 处理@用户搜索
   */
  const handleSearch = (query: string) => {
    searchUsers(query);
  };

  /**
   * 处理文本变化
   */
  const handleChange = (newValue: string) => {
    onChange?.(newValue);

    // 提取@用户ID
    extractMentionedUsers(newValue);
  };

  /**
   * 从文本中提取@用户的ID
   */
  const extractMentionedUsers = (text: string) => {
    // 匹配 @username 格式（Mentions组件的默认格式）
    const mentionPattern = /@(\w+)/g;
    const matches = [...text.matchAll(mentionPattern)];

    const userIds = new Set<number>();
    matches.forEach(match => {
      const username = match[1];
      const userId = usernameToIdMap.get(username);
      if (userId) {
        userIds.add(userId);
      }
    });

    setMentionedUserIds(userIds);
    onMentionedUsersChange?.(Array.from(userIds));
  };

  /**
   * 处理用户选择
   * 将@用户转换为 @[username](user_id) 格式
   */
  const handleSelect = (option: { value: string; key: string }) => {
    // option.value 是用户名，option.key 是用户ID
    console.log('User selected:', option);
  };

  /**
   * 渲染用户选项
   */
  const renderUserOption = (user: User) => {
    return (
      <Option
        key={user.id.toString()}
        value={user.username}
        data-user-id={user.id}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{user.username}</div>
            {user.email && (
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {user.email}
              </div>
            )}
          </div>
        </div>
      </Option>
    );
  };

  /**
   * 初始化时提取已有的@用户
   */
  useEffect(() => {
    if (value) {
      extractMentionedUsers(value);
    }
  }, [value]);

  return (
    <div className={`mention-input ${className}`} style={style}>
      <Mentions
        value={value}
        onChange={handleChange}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder={placeholder}
        autoSize={autoSize}
        disabled={disabled}
        loading={loading}
        prefix="@"
        split=""
        maxLength={maxLength}
        notFoundContent={loading ? <Spin size="small" /> : '暂无匹配用户'}
      >
        {users.map((user) => renderUserOption(user))}
      </Mentions>

      {/* 显示已@的用户数量 */}
      {mentionedUserIds.size > 0 && (
        <div style={{
          marginTop: '4px',
          fontSize: '12px',
          color: '#1890ff'
        }}>
          已提及 {mentionedUserIds.size} 位用户
        </div>
      )}
    </div>
  );
};

export default MentionInput;
