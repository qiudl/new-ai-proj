import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
// ✅ FIXED - react-window v2 exports List directly, not FixedSizeList (TS2305)
import { List } from 'react-window';
import { Card, Space, Typography, Button, Spin, Empty, message } from 'antd';
import { ReloadOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import { TaskTimelineEvent } from '../../types/timeline';
import { EventRendererFactory } from './EventRenderers';
import { IntelligentEventGrouper, GroupingStrategy, EventGroup } from './EventGrouping';

const { Text } = Typography;

interface VirtualizedTimelineProps {
  events: TaskTimelineEvent[];
  loading?: boolean;
  height?: number;
  itemHeight?: number;
  overscanCount?: number;
  enableGrouping?: boolean;
  groupingStrategy?: GroupingStrategy;
  compactMode?: boolean;
  onEventClick?: (event: TaskTimelineEvent) => void;
  onRefresh?: () => void;
}

interface VirtualTimelineItemData {
  type: 'event' | 'group-header' | 'group-separator';
  event?: TaskTimelineEvent;
  group?: EventGroup;
  groupIndex?: number;
  eventIndex?: number;
  isExpanded?: boolean;
  compactMode?: boolean;
  onEventClick?: (event: TaskTimelineEvent) => void;
  onToggleExpanded?: (eventId: number) => void;
}

// 虚拟化列表项渲染器
const VirtualTimelineItem: React.FC<{ index: number; style: React.CSSProperties; data: VirtualTimelineItemData[] }> = ({
  index,
  style,
  data
}) => {
  const item = data[index];
  
  if (!item) return <div style={style}></div>;

  const renderEvent = (event: TaskTimelineEvent, isExpanded = false) => {
    const renderer = EventRendererFactory.getRenderer(event.event_type);
    
    return (
      <Card
        
        hoverable
        onClick={() => item.onEventClick?.(event)}
        style={{
          cursor: item.onEventClick ? 'pointer' : 'default',
          backgroundColor: renderer.getBackgroundColor(),
          border: `1px solid ${renderer.getColor()}20`,
          borderRadius: 6,
          margin: '4px 8px',
          minHeight: item.compactMode ? 60 : 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {/* 事件图标 */}
          <div style={{ 
            width: 24, 
            height: 24, 
            borderRadius: '50%', 
            backgroundColor: renderer.getColor(),
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 12,
            color: 'white',
            flexShrink: 0
          }}>
            {renderer.getIcon()}
          </div>
          
          {/* 事件内容 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ 
              fontSize: item.compactMode ? 12 : 13, 
              fontWeight: 'bold',
              marginBottom: 4,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}>
              {renderer.getTitle(event)}
            </div>
            
            <div style={{ 
              fontSize: item.compactMode ? 11 : 12,
              color: '#666',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: item.compactMode ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {renderer.getDescription(event)}
            </div>
            
            {/* 时间信息 */}
            <div style={{ 
              fontSize: 10,
              color: '#999',
              marginTop: 4 
            }}>
              {new Date(event.event_date).toLocaleString('zh-CN')}
              {event.username && (
                <span style={{ marginLeft: 8 }}>
                  @{event.username}
                </span>
              )}
            </div>
          </div>
          
          {/* 严重性指示器 */}
          {event.severity && event.severity !== 'info' && (
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: event.severity === 'error' ? '#ff4d4f' : event.severity === 'warning' ? '#faad14' : '#52c41a',
              flexShrink: 0
            }} />
          )}
        </div>
      </Card>
    );
  };

  const renderGroupHeader = (group: EventGroup) => (
    <div style={{
      ...style,
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #e8e8e8',
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#333'
    }}>
      <Space>
        <span>{group.title}</span>
        <span style={{
          fontSize: 12,
          // ✅ FIXED - Removed duplicate color property (TS1117)
          backgroundColor: '#1890ff',
          color: 'white',
          padding: '2px 6px',
          borderRadius: 10
        }}>
          {group.events.length}
        </span>
        {group.metadata.priority && (
          <span style={{ fontSize: 11, color: '#666' }}>
            优先级: {group.metadata.priority}
          </span>
        )}
      </Space>
    </div>
  );

  const renderGroupSeparator = () => (
    <div style={{
      ...style,
      height: 16,
      backgroundColor: 'transparent'
    }} />
  );

  return (
    <div style={style}>
      {item.type === 'event' && item.event && renderEvent(item.event, item.isExpanded)}
      {item.type === 'group-header' && item.group && renderGroupHeader(item.group)}
      {item.type === 'group-separator' && renderGroupSeparator()}
    </div>
  );
};

const VirtualizedTimeline: React.FC<VirtualizedTimelineProps> = ({
  events,
  loading = false,
  height = 600,
  itemHeight = 100,
  overscanCount = 5,
  enableGrouping = true,
  groupingStrategy = GroupingStrategy.BY_DATE,
  compactMode = false,
  onEventClick,
  onRefresh
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const listRef = useRef<List>(null);

  // 切换事件展开状态
  const toggleEventExpansion = useCallback((eventId: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  // 分组事件
  const groupedEvents = useMemo(() => {
    if (!enableGrouping) {
      return [{ key: 'all', title: '所有事件', events, metadata: {} }];
    }
    return IntelligentEventGrouper.groupEvents(events, groupingStrategy);
  }, [events, enableGrouping, groupingStrategy]);

  // 构建虚拟化列表数据
  const virtualListData = useMemo((): VirtualTimelineItemData[] => {
    const items: VirtualTimelineItemData[] = [];
    
    groupedEvents.forEach((group, groupIndex) => {
      // 添加组标题 (如果启用分组)
      if (enableGrouping) {
        items.push({
          type: 'group-header',
          group,
          groupIndex,
          compactMode,
          onEventClick,
          onToggleExpanded: toggleEventExpansion
        });
      }
      
      // 添加组内事件
      group.events.forEach((event, eventIndex) => {
        items.push({
          type: 'event',
          event,
          groupIndex,
          eventIndex,
          isExpanded: expandedEvents.has(event.id),
          compactMode,
          onEventClick,
          onToggleExpanded: toggleEventExpansion
        });
      });
      
      // 添加组分隔符 (除了最后一组)
      if (enableGrouping && groupIndex < groupedEvents.length - 1) {
        items.push({
          type: 'group-separator',
          compactMode,
          onEventClick,
          onToggleExpanded: toggleEventExpansion
        });
      }
    });
    
    return items;
  }, [groupedEvents, enableGrouping, expandedEvents, compactMode, onEventClick, toggleEventExpansion]);

  // 计算动态项目高度
  const getItemSize = useCallback((index: number) => {
    const item = virtualListData[index];
    if (!item) return itemHeight;
    
    switch (item.type) {
      case 'group-header':
        return 40;
      case 'group-separator':
        return 16;
      case 'event':
        return compactMode ? 70 : itemHeight;
      default:
        return itemHeight;
    }
  }, [virtualListData, itemHeight, compactMode]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToItem(0, 'start');
  }, []);

  // 性能监控
  const performanceStats = useMemo(() => {
    const totalEvents = events.length;
    const virtualizedItems = virtualListData.length;
    const memoryEfficiency = totalEvents > 0 ? (overscanCount * 2 / totalEvents * 100).toFixed(1) : '0';
    
    return {
      totalEvents,
      virtualizedItems,
      memoryEfficiency: `${memoryEfficiency}%`,
      groupCount: groupedEvents.length
    };
  }, [events.length, virtualListData.length, overscanCount, groupedEvents.length]);

  if (loading) {
    return (
      <Card style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="没有时间线事件" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>虚拟化时间线</span>
          <span style={{ fontSize: 12, color: '#666' }}>
            ({performanceStats.totalEvents} 事件, {performanceStats.groupCount} 分组, 内存效率: {performanceStats.memoryEfficiency})
          </span>
        </Space>
      }
      extra={
        <Space>
          {onRefresh && (
            <Button
              
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
            >
              刷新
            </Button>
          )}
          <Button
            
            icon={<ExpandOutlined />}
            onClick={scrollToTop}
            title="回到顶部"
          />
        </Space>
      }
      style={{ height: height + 100 }}
      styles={{ body: { height, padding: 0  }}}
    >
      <List
        ref={listRef}
        height={height}
        itemCount={virtualListData.length}
        itemSize={getItemSize}
        itemData={virtualListData}
        overscanCount={overscanCount}
        style={{ width: '100%' }}
      >
        {VirtualTimelineItem}
      </List>
    </Card>
  );
};

export default VirtualizedTimeline;