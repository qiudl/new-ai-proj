import React from 'react';
import { Modal, Button, Space, Typography, Divider } from 'antd';
import { ControlOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ShortcutHelpProps {
  visible: boolean;
  onClose: () => void;
  shortcuts?: Array<{
    key: string;
    description: string;
    category: string;
    icon?: string;
  }>;
}

const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ 
  visible, 
  onClose, 
  shortcuts = [] 
}) => {
  // 默认快捷键列表
  const defaultShortcuts = [
    { key: 'Ctrl + N', description: '快速创建笔记', category: '创建操作', icon: '🚀' },
    { key: 'Ctrl + Shift + N', description: '完整创建笔记', category: '创建操作', icon: '📝' },
    { key: 'Ctrl + K', description: '聚焦搜索框', category: '导航操作', icon: '🔍' },
    { key: 'Ctrl + R', description: '刷新笔记列表', category: '通用操作', icon: '🔄' },
    { key: 'Escape', description: '关闭对话框/取消操作', category: '通用操作', icon: '❌' },
  ];

  // 使用传入的快捷键或默认快捷键
  const shortcutList = shortcuts.length > 0 ? shortcuts : defaultShortcuts;
  
  // 按类别分组
  const groupedShortcuts = shortcutList.reduce((groups, shortcut) => {
    const category = shortcut.category || '通用';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, typeof shortcutList>);

  return (
    <Modal
      title={
        <Space>
          <ControlOutlined style={{ color: '#1890ff' }} />
          <span>键盘快捷键</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          知道了
        </Button>
      ]}
      width={480}
      styles={{
        body: {
          padding: '24px',
        }
      }}
      destroyOnClose
      maskClosable={true}
    >
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts], categoryIndex) => (
          <div key={category} style={{ marginBottom: categoryIndex < Object.keys(groupedShortcuts).length - 1 ? '20px' : '0' }}>
            <Title level={5} style={{ 
              color: '#666',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {category}
            </Title>
            
            {categoryShortcuts.map((shortcut, index) => (
              <div
                key={`${category}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: index % 2 === 0 ? '#fafafa' : 'transparent',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? '#fafafa' : 'transparent';
                }}
              >
                <Space>
                  {shortcut.icon && (
                    <span style={{ fontSize: '16px' }}>{shortcut.icon}</span>
                  )}
                  <Text style={{ fontSize: '14px' }}>{shortcut.description}</Text>
                </Space>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  {shortcut.key.split(' + ').map((keyPart, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      style={{
                        padding: '3px 8px',
                        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        fontWeight: 600,
                        color: '#595959',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        minWidth: '24px',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                      }}
                    >
                      {keyPart}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
            
            {categoryIndex < Object.keys(groupedShortcuts).length - 1 && (
              <Divider style={{ margin: '16px 0' }} />
            )}
          </div>
        ))}
        
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
        }}>
          <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
            💡 提示：这些快捷键可以帮助您更高效地管理工作笔记。在任何页面都可以使用，除了在输入框中输入时。
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default ShortcutHelp;