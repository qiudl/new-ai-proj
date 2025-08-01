// 快捷键帮助组件 - Timer System 2.0
import React from 'react';
import { Modal, Table, Typography, Space, Tag, Divider } from 'antd';
import { ControlOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

interface KeyboardShortcutsHelpProps {
  visible: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  visible,
  onClose,
  shortcuts
}) => {
  // 按分类分组快捷键
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || '通用';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  // 分类颜色映射
  const categoryColors: Record<string, string> = {
    '计时控制': 'blue',
    '任务管理': 'green',
    '导航': 'orange',
    '快速操作': 'purple',
    '界面': 'cyan',
    '操作': 'magenta',
    '帮助': 'gold',
    '通用': 'default'
  };

  const columns = [
    {
      title: '快捷键',
      dataIndex: 'key',
      key: 'key',
      width: 150,
      render: (key: string) => (
        <Tag 
          style={{ 
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            padding: '4px 8px',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: '1px solid #d9d9d9',
            borderRadius: '4px'
          }}
        >
          {key}
        </Tag>
      ),
    },
    {
      title: '功能描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <Text>{description}</Text>
      ),
    },
  ];

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
      footer={null}
      width={800}
      centered
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 说明信息 */}
        <div style={{ 
          background: '#f6f9ff', 
          padding: '16px', 
          borderRadius: '6px',
          marginBottom: '24px',
          border: '1px solid #e6f3ff'
        }}>
          <Space align="start">
            <InfoCircleOutlined style={{ color: '#1890ff', marginTop: '2px' }} />
            <div>
              <Text strong style={{ color: '#1890ff' }}>使用说明</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '13px' }}>
                • 快捷键在输入框和弹窗中不会生效，确保焦点在主界面上<br />
                • ⌘ 代表 Mac 的 Command 键，在 Windows/Linux 上对应 Ctrl 键<br />
                • 可以通过 Shift + ? 随时打开此帮助窗口
              </Text>
            </div>
          </Space>
        </div>

        {/* 按分类显示快捷键 */}
        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts], index) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <Space>
                <Tag 
                  color={categoryColors[category] || 'default'}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {category}
                </Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {categoryShortcuts.length} 个快捷键
                </Text>
              </Space>
            </div>
            
            <Table
              dataSource={categoryShortcuts.map((shortcut, idx) => ({
                ...shortcut,
                id: `${category}-${idx}`
              }))}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="id"
              style={{ marginBottom: '16px' }}
            />
            
            {index < Object.entries(groupedShortcuts).length - 1 && (
              <Divider style={{ margin: '16px 0' }} />
            )}
          </div>
        ))}

        {/* 特殊说明 */}
        <div style={{ 
          background: '#fffbe6', 
          padding: '16px', 
          borderRadius: '6px',
          border: '1px solid #ffe58f',
          marginTop: '24px'
        }}>
          <Text strong style={{ color: '#faad14' }}>💡 高效技巧</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            • 使用 Cmd/Ctrl + 数字键 (1-9) 可以快速选择对应位置的任务<br />
            • 专注模式 (Cmd/Ctrl + F) 可以隐藏干扰元素，提升工作专注度<br />
            • 快速保存 (Cmd/Ctrl + Shift + S) 会保存当前所有未保存的更改
          </Text>
        </div>

        {/* 底部统计信息 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px',
          padding: '12px',
          background: '#fafafa',
          borderRadius: '6px'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            共 {shortcuts.length} 个快捷键 • Timer System 2.0 • 按 ESC 关闭此窗口
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;