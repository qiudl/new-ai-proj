import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Card, Typography, Button, Space, Divider, Spin, message } from 'antd';
import {
  FolderOutlined,
  TagOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { workNotesService, CategoryStats } from '../services/workNotesService';

const { Title, Text } = Typography;

interface TreeNode {
  title: React.ReactNode;
  key: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  count?: number;
}

interface WorkNotesTreeSidebarProps {
  onCategorySelect?: (category: string) => void;
  onTagSelect?: (tag: string) => void;
  onAssociationSelect?: (type: string) => void;
  onTimeRangeSelect?: (range: string) => void;
  onRefresh?: () => void;
  selectedCategory?: string;
  selectedTag?: string;
  selectedAssociation?: string;
  selectedTimeRange?: string;
}

const WorkNotesTreeSidebar: React.FC<WorkNotesTreeSidebarProps> = ({
  onCategorySelect,
  onTagSelect,
  onAssociationSelect,
  onTimeRangeSelect,
  onRefresh,
  selectedCategory,
  selectedTag,
  selectedAssociation,
  selectedTimeRange
}) => {
  const [loading, setLoading] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // 加载分类统计数据
  const loadCategoryStats = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await workNotesService.getCategoryStats();
      setCategoryStats(stats);
    } catch (error) {
      console.error('Failed to load category stats:', error);
      message.error('加载分类统计失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadCategoryStats();
  }, [loadCategoryStats]);

  // 处理刷新
  const handleRefresh = () => {
    loadCategoryStats();
    onRefresh?.();
  };

  // 获取分类显示名称
  const getCategoryDisplayName = (key: string): string => {
    const categoryNames: { [key: string]: string } = {
      frontend: '前端开发',
      backend: '后端开发',
      'ui-design': 'UI设计',
      'data-analysis': '数据分析'
    };
    return categoryNames[key] || key;
  };

  // 构建树形数据
  const categoryTreeData: TreeNode[] = categoryStats ? [
    {
      title: '📁 项目分类',
      key: 'categories',
      children: Object.entries(categoryStats.categories).map(([key, value]) => ({
        title: `${value.icon} ${getCategoryDisplayName(key)} (${value.count})`,
        key: `category-${key}`,
        count: value.count
      }))
    }
  ] : [];

  const tagTreeData: TreeNode[] = categoryStats ? [
    {
      title: '🏷️ 标签分类',
      key: 'tags',
      children: Object.entries(categoryStats.tags).map(([key, value]) => ({
        title: `#${key} (${value})`,
        key: `tag-${key}`,
        count: value
      }))
    }
  ] : [];

  const associationTreeData: TreeNode[] = categoryStats ? [
    {
      title: '🔗 关联状态',
      key: 'associations',
      children: [
        { title: `已关联任务 (${categoryStats.associations.associated})`, key: 'association-associated', count: categoryStats.associations.associated },
        { title: `未关联任务 (${categoryStats.associations.unassociated})`, key: 'association-unassociated', count: categoryStats.associations.unassociated },
        { title: `可转换文档 (${categoryStats.associations.convertible})`, key: 'association-convertible', count: categoryStats.associations.convertible },
      ]
    }
  ] : [];

  const timeRangeTreeData: TreeNode[] = categoryStats ? [
    {
      title: '⏰ 时间筛选',
      key: 'timeRanges',
      children: [
        { title: `今天 (${categoryStats.timeRanges.today})`, key: 'time-today', count: categoryStats.timeRanges.today },
        { title: `本周 (${categoryStats.timeRanges.thisWeek})`, key: 'time-thisWeek', count: categoryStats.timeRanges.thisWeek },
        { title: `本月 (${categoryStats.timeRanges.thisMonth})`, key: 'time-thisMonth', count: categoryStats.timeRanges.thisMonth },
        { title: `更早 (${categoryStats.timeRanges.earlier})`, key: 'time-earlier', count: categoryStats.timeRanges.earlier },
      ]
    }
  ] : [];

  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (!key) {
      // 清空选择
      setSelectedKeys([]);
      return;
    }

    setSelectedKeys([key]);

    // 根据key的前缀判断类型
    if (key.startsWith('category-')) {
      const categoryKey = key.replace('category-', '');
      onCategorySelect?.(categoryKey);
    } else if (key.startsWith('tag-')) {
      const tagKey = key.replace('tag-', '');
      onTagSelect?.(tagKey);
    } else if (key.startsWith('association-')) {
      const associationType = key.replace('association-', '');
      onAssociationSelect?.(associationType);
    } else if (key.startsWith('time-')) {
      const timeRange = key.replace('time-', '');
      onTimeRangeSelect?.(timeRange);
    }
  };

  // 根据选中状态更新selectedKeys
  useEffect(() => {
    const keys: React.Key[] = [];
    if (selectedCategory) keys.push(`category-${selectedCategory}`);
    if (selectedTag) keys.push(`tag-${selectedTag}`);
    if (selectedAssociation) keys.push(`association-${selectedAssociation}`);
    if (selectedTimeRange) keys.push(`time-${selectedTimeRange}`);
    setSelectedKeys(keys);
  }, [selectedCategory, selectedTag, selectedAssociation, selectedTimeRange]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin tip="加载筛选数据...">
          <div style={{ minHeight: '80px' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>筛选导航</Title>
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          size="small"
          onClick={handleRefresh}
          title="刷新树状结构"
          loading={loading}
        />
      </div>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 项目分类 */}
        {categoryTreeData.length > 0 && (
          <Card size="small" title={null}>
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={selectedKeys.filter(key => (key as string).startsWith('category-'))}
              treeData={categoryTreeData}
              onSelect={handleTreeSelect}
              style={{ background: 'transparent' }}
            />
          </Card>
        )}

        <Divider style={{ margin: '8px 0' }} />

        {/* 标签分类 */}
        {tagTreeData.length > 0 && (
          <Card size="small" title={null}>
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={selectedKeys.filter(key => (key as string).startsWith('tag-'))}
              treeData={tagTreeData}
              onSelect={handleTreeSelect}
              style={{ background: 'transparent' }}
            />
          </Card>
        )}

        <Divider style={{ margin: '8px 0' }} />

        {/* 关联状态 */}
        {associationTreeData.length > 0 && (
          <Card size="small" title={null}>
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={selectedKeys.filter(key => (key as string).startsWith('association-'))}
              treeData={associationTreeData}
              onSelect={handleTreeSelect}
              style={{ background: 'transparent' }}
            />
          </Card>
        )}

        <Divider style={{ margin: '8px 0' }} />

        {/* 时间筛选 */}
        {timeRangeTreeData.length > 0 && (
          <Card size="small" title={null}>
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={selectedKeys.filter(key => (key as string).startsWith('time-'))}
              treeData={timeRangeTreeData}
              onSelect={handleTreeSelect}
              style={{ background: 'transparent' }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default WorkNotesTreeSidebar;