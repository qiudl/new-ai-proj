/**
 * 文档协作面板组件
 * 显示在线用户、协作状态和实时通知
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Avatar,
  Badge,
  Space,
  Typography,
  Tooltip,
  Button,
  Tag,
  List,
  Timeline,
  Popover,
  Switch,
  Drawer,
  notification,
  message
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  EyeOutlined,
  BellOutlined,
  SettingOutlined,
  CloseOutlined,
  ShareAltOutlined,
  MessageOutlined
} from '@ant-design/icons';
import useRealtimeCollaboration, { OnlineUser, CollaborationEvent } from '../hooks/useRealtimeCollaboration';
import { Document } from '../types/document';

const { Text, Title } = Typography;

interface DocumentCollaborationPanelProps {
  document: Document;
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  enableRealTimeSync?: boolean;
  enableCursorSharing?: boolean;
  enableLiveEdit?: boolean;
}

const DocumentCollaborationPanel: React.FC<DocumentCollaborationPanelProps> = ({
  document,
  visible,
  onClose,
  currentUserId,
  currentUserName,
  enableRealTimeSync = true,
  enableCursorSharing = true,
  enableLiveEdit = false
}) => {
  const [showActivity, setShowActivity] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    documentChanges: true,
    userJoinLeave: true,
    documentLocks: true,
    mentions: true
  });

  // 使用实时协作Hook
  const collaboration = useRealtimeCollaboration({
    enabled: enableRealTimeSync,
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
    lockTimeout: 5 * 60 * 1000
  });

  // 处理协作事件通知
  useEffect(() => {
    const handleCollaborationEvent = (event: CollaborationEvent) => {
      if (!notificationSettings[event.type as keyof typeof notificationSettings]) {
        return;
      }

      switch (event.type) {
        case 'user_join':
          if (event.userId !== currentUserId) {
            message.info(`${event.userName} 加入了协作`, 2);
          }
          break;
        case 'user_leave':
          if (event.userId !== currentUserId) {
            message.info(`${event.userName} 离开了协作`, 2);
          }
          break;
        case 'document_lock':
          if (event.userId !== currentUserId) {
            notification.warning({
              message: '文档已被锁定',
              description: `${event.userName} 正在编辑此文档`,
              icon: <LockOutlined style={{ color: '#faad14' }} />
            });
          }
          break;
        case 'document_unlock':
          if (event.userId !== currentUserId) {
            notification.success({
              message: '文档已解锁',
              description: `${event.userName} 完成了编辑`,
              icon: <UnlockOutlined style={{ color: '#52c41a' }} />
            });
          }
          break;
        case 'document_update':
          if (event.userId !== currentUserId) {
            message.success(`${event.userName} 更新了文档`, 1.5);
          }
          break;
      }
    };

    // 监听协作事件
    if (collaboration.events.length > 0) {
      const latestEvent = collaboration.events[collaboration.events.length - 1];
      handleCollaborationEvent(latestEvent);
    }
  }, [collaboration.events, notificationSettings, currentUserId]);

  // 获取用户状态颜色
  const getUserStatusColor = (user: OnlineUser): string => {
    if (!user.isActive) return 'default';
    if (user.currentDocument === document.id) return 'green';
    return 'blue';
  };

  // 获取用户状态文本
  const getUserStatusText = (user: OnlineUser): string => {
    if (!user.isActive) return '离线';
    if (user.currentDocument === document.id) return '正在编辑此文档';
    return '在线';
  };

  // 邀请用户协作
  const handleInviteUser = () => {
    // 生成分享链接
    const shareUrl = `${window.location.origin}/documents/${document.id}?collaborate=true`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      message.success('协作链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制链接失败');
    });
  };

  // 获取当前文档的锁定状态
  const getCurrentDocumentLock = () => {
    return collaboration.documentLocks.get(document.id);
  };

  // 锁定/解锁文档
  const handleToggleDocumentLock = async () => {
    try {
      const currentLock = getCurrentDocumentLock();
      if (currentLock?.userId === currentUserId) {
        await collaboration.unlockDocument(document.id);
        message.success('文档已解锁');
      } else {
        await collaboration.lockDocument(document.id);
        message.success('文档已锁定');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <TeamOutlined />
          <span>协作面板</span>
          {collaboration.connected && (
            <Badge status="success" text="已连接" />
          )}
        </Space>
      }
      placement="right"
      width={360}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Tooltip title="活动历史">
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => setShowActivity(!showActivity)}
            />
          </Tooltip>
          <Tooltip title="通知设置">
            <Popover
              content={
                <div style={{ width: 250 }}>
                  <Title level={5}>通知设置</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>文档变更</span>
                      <Switch
                        
                        checked={notificationSettings.documentChanges}
                        onChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, documentChanges: checked }))
                        }
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>用户进出</span>
                      <Switch
                        
                        checked={notificationSettings.userJoinLeave}
                        onChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, userJoinLeave: checked }))
                        }
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>文档锁定</span>
                      <Switch
                        
                        checked={notificationSettings.documentLocks}
                        onChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, documentLocks: checked }))
                        }
                      />
                    </div>
                  </Space>
                </div>
              }
              title="通知设置"
              trigger="click"
            >
              <Button type="text" icon={<SettingOutlined />} />
            </Popover>
          </Tooltip>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 连接状态 */}
        <Card >
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Badge 
                status={collaboration.connected ? 'success' : 'error'} 
                text={collaboration.connected ? '实时协作已启用' : '连接断开'}
              />
            </Space>
            {!collaboration.connected && (
              <Button 
                 
                type="primary" 
                onClick={() => collaboration.connect()}
              >
                重新连接
              </Button>
            )}
          </Space>
        </Card>

        {/* 协作控制 */}
        <Card  title="协作控制">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              block
              icon={<ShareAltOutlined />}
              onClick={handleInviteUser}
            >
              邀请协作
            </Button>
            
            <Button
              block
              icon={getCurrentDocumentLock()?.userId === currentUserId ? <UnlockOutlined /> : <LockOutlined />}
              type={getCurrentDocumentLock() ? 'primary' : 'default'}
              onClick={handleToggleDocumentLock}
              disabled={getCurrentDocumentLock() && getCurrentDocumentLock()?.userId !== currentUserId}
            >
              {getCurrentDocumentLock()?.userId === currentUserId 
                ? '解锁文档' 
                : getCurrentDocumentLock() 
                  ? `被 ${getCurrentDocumentLock()?.userName} 锁定`
                  : '锁定编辑'
              }
            </Button>
          </Space>
        </Card>

        {/* 在线用户 */}
        <Card 
           
          title={`在线用户 (${collaboration.onlineUsers.length})`}
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              当前文档: {collaboration.onlineUsers.filter(u => u.currentDocument === document.id).length}
            </Text>
          }
        >
          <List
            
            dataSource={collaboration.onlineUsers}
            renderItem={(user) => (
              <List.Item>
                <Space>
                  <Badge 
                    status={getUserStatusColor(user) as unknown}
                    offset={[-2, 2]}
                  >
                    <Avatar 
                       
                      src={user.avatar}
                      icon={<UserOutlined />}
                    />
                  </Badge>
                  <div>
                    <div style={{ fontWeight: user.id === currentUserId ? 'bold' : 'normal' }}>
                      {user.name}
                      {user.id === currentUserId && <Text type="secondary"> (你)</Text>}
                    </div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {getUserStatusText(user)}
                    </Text>
                  </div>
                </Space>
                
                {user.currentDocument === document.id && user.id !== currentUserId && (
                  <Tooltip title="正在编辑">
                    <EditOutlined style={{ color: '#52c41a' }} />
                  </Tooltip>
                )}
              </List.Item>
            )}
          />
        </Card>

        {/* 活动历史 */}
        {showActivity && (
          <Card  title="最近活动">
            <Timeline
              items={collaboration.events.slice(-10).reverse().map((event, index) => ({
                children: (
                  <div>
                    <Text strong>{event.userName}</Text>
                    <Text> {getEventDescription(event)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                ),
                color: getEventColor(event.type)
              }))}
            />
          </Card>
        )}

        {/* 文档信息 */}
        <Card  title="文档信息">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">标题:</Text>
              <Text>{document.title}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">创建者:</Text>
              <Text>{document.owner_name}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">可见性:</Text>
              <Tag color={document.visibility === 'public' ? 'green' : document.visibility === 'team' ? 'blue' : 'default'}>
                {document.visibility === 'public' ? '公开' : document.visibility === 'team' ? '团队' : '私有'}
              </Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">最后更新:</Text>
              <Text>{new Date(document.updated_at).toLocaleString()}</Text>
            </div>
          </Space>
        </Card>
      </Space>
    </Drawer>
  );
};

// 获取事件描述
const getEventDescription = (event: CollaborationEvent): string => {
  switch (event.type) {
    case 'user_join': return '加入协作';
    case 'user_leave': return '离开协作';
    case 'document_lock': return '锁定了文档';
    case 'document_unlock': return '解锁了文档';
    case 'document_update': return '更新了文档';
    case 'document_create': return '创建了文档';
    case 'document_delete': return '删除了文档';
    default: return '进行了操作';
  }
};

// 获取事件颜色
const getEventColor = (type: string): string => {
  switch (type) {
    case 'user_join': return 'green';
    case 'user_leave': return 'red';
    case 'document_lock': return 'orange';
    case 'document_unlock': return 'blue';
    case 'document_update': return 'purple';
    default: return 'default';
  }
};

export default DocumentCollaborationPanel;