import React from 'react';
import { Button, Space, Dropdown, Menu } from 'antd';
import { 
  ExpandAltOutlined, 
  ShrinkOutlined, 
  BulbOutlined,
  SearchOutlined,
  MoreOutlined
} from '@ant-design/icons';

interface HierarchicalBatchActionsProps {
  onExpandAll: () => Promise<void>;
  onCollapseAll: () => void;
  onSmartExpand: () => Promise<void>;
  onExpandToLevel: (level: number) => Promise<void>;
  loading?: boolean;
}

const HierarchicalBatchActions: React.FC<HierarchicalBatchActionsProps> = ({
  onExpandAll,
  onCollapseAll,
  onSmartExpand,
  onExpandToLevel,
  loading = false,
}) => {
  const expandMenu = (
    <Menu
      items={[
        {
          key: 'level-1',
          label: '🌳 展开到L1',
          onClick: () => onExpandToLevel(1),
        },
        {
          key: 'level-2',
          label: '📚 展开到L2',
          onClick: () => onExpandToLevel(2),
        },
        {
          key: 'level-3',
          label: '📖 展开到L3',
          onClick: () => onExpandToLevel(3),
        },
        {
          type: 'divider',
        },
        {
          key: 'smart',
          label: '🎯 智能展开',
          onClick: onSmartExpand,
        },
      ]}
    />
  );

  return (
    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: '6px' }}>
      <Space>
        <span style={{ fontWeight: 500, color: '#666' }}>批量操作:</span>
        <Button
          size="small"
          icon={<ExpandAltOutlined />}
          onClick={onExpandAll}
          loading={loading}
        >
          全部展开
        </Button>
        <Button
          size="small"
          icon={<ShrinkOutlined />}
          onClick={onCollapseAll}
          disabled={loading}
        >
          全部折叠
        </Button>
        <Button
          size="small"
          icon={<BulbOutlined />}
          onClick={onSmartExpand}
          loading={loading}
          type="primary"
          ghost
        >
          智能展开
        </Button>
        <Dropdown overlay={expandMenu} placement="bottomLeft">
          <Button size="small" icon={<MoreOutlined />}>
            更多展开选项
          </Button>
        </Dropdown>
      </Space>
    </div>
  );
};

export default HierarchicalBatchActions;