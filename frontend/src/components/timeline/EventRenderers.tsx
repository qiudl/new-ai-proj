import React from 'react';
import { Tag, Typography, Space, Avatar, Tooltip, Button, Progress } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  BugOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  TagOutlined,
  StarOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  FolderOutlined,
  CommentOutlined,
  EyeOutlined,
  SendOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FolderOpenOutlined,
  RocketOutlined,
  RobotOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  TaskTimelineEvent,
  TaskTimelineEventType,
  EventSeverity,
  EventCategory,
  EventTypeDescriptions,
} from '../../types/timeline';

const { Text } = Typography;

// 事件渲染器接口
export interface EventRenderer {
  getIcon(): React.ReactNode;
  getColor(): string;
  getBackgroundColor(): string;
  getTitle(event: TaskTimelineEvent): string;
  getDescription(event: TaskTimelineEvent): React.ReactNode;
  getMetadataDisplay(event: TaskTimelineEvent): React.ReactNode;
  getPriority(): number; // 用于排序
}

// 基础事件渲染器
abstract class BaseEventRenderer implements EventRenderer {
  abstract getIcon(): React.ReactNode;
  abstract getColor(): string;
  
  getBackgroundColor(): string {
    const color = this.getColor();
    return `${color}15`; // 15% opacity
  }
  
  getTitle(event: TaskTimelineEvent): string {
    return EventTypeDescriptions[event.event_type] || event.event_type;
  }
  
  getDescription(event: TaskTimelineEvent): React.ReactNode {
    return <Text>{event.description}</Text>;
  }
  
  getMetadataDisplay(event: TaskTimelineEvent): React.ReactNode {
    if (!event.metadata) return null;
    
    return (
      <div style={{ marginTop: 8 }}>
        {this.renderOldNewValueChange(event)}
        {this.renderAdditionalMetadata(event)}
      </div>
    );
  }
  
  protected renderOldNewValueChange(event: TaskTimelineEvent): React.ReactNode {
    const { metadata } = event;
    if (!metadata?.old_value || !metadata?.new_value) return null;
    
    return (
      <div style={{ marginBottom: 8 }}>
        <Space direction="vertical" size={4}>
          <Text style={{ fontSize: 12, color: '#666' }}>变更内容：</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="red" style={{ margin: 0, textDecoration: 'line-through' }}>
              {this.formatValue(metadata.old_value)}
            </Tag>
            <Text style={{ color: '#999' }}>→</Text>
            <Tag color="green" style={{ margin: 0, fontWeight: 'bold' }}>
              {this.formatValue(metadata.new_value)}
            </Tag>
          </div>
        </Space>
      </div>
    );
  }
  
  protected renderAdditionalMetadata(event: TaskTimelineEvent): React.ReactNode {
    const { metadata } = event;
    if (!metadata) return null;
    
    const excludeKeys = ['old_value', 'new_value', 'old_status', 'new_status', 'priority'];
    const additionalData = Object.entries(metadata).filter(([key]) => !excludeKeys.includes(key));
    
    if (additionalData.length === 0) return null;
    
    return (
      <div>
        {additionalData.map(([key, value]) => (
          <div key={key} style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 12 }}>
              <Text strong>{key}:</Text>
              <span style={{ marginLeft: 8 }}>{this.formatValue(value)}</span>
            </Text>
          </div>
        ))}
      </div>
    );
  }
  
  protected formatValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
  
  getPriority(): number {
    return 0; // 默认优先级
  }
}

// 创建事件渲染器
export class CreatedEventRenderer extends BaseEventRenderer {
  getIcon() { return <PlusOutlined />; }
  getColor() { return '#52c41a'; }
  getPriority() { return 10; }
  
  getDescription(event: TaskTimelineEvent) {
    return (
      <Text>
        <Text strong>{event.username || '系统'}</Text> 创建了任务
        {event.task_title && <Text code> {event.task_title}</Text>}
      </Text>
    );
  }
}

// 更新事件渲染器
export class UpdatedEventRenderer extends BaseEventRenderer {
  getIcon() { return <EditOutlined />; }
  getColor() { return '#1890ff'; }
  getPriority() { return 5; }
  
  getDescription(event: TaskTimelineEvent) {
    const fieldsChanged = event.metadata?.changed_fields?.length || 0;
    return (
      <Text>
        <Text strong>{event.username || '系统'}</Text> 更新了任务
        {fieldsChanged > 0 && <Text type="secondary"> ({fieldsChanged} 个字段)</Text>}
      </Text>
    );
  }
}

// 状态变更渲染器
export class StatusChangedEventRenderer extends BaseEventRenderer {
  getIcon() { return <SwapOutlined />; }
  getColor() { return '#fa8c16'; }
  getPriority() { return 8; }
  
  getDescription(event: TaskTimelineEvent) {
    const oldStatus = event.metadata?.old_status || event.metadata?.old_value;
    const newStatus = event.metadata?.new_status || event.metadata?.new_value;
    
    return (
      <Text>
        <Text strong>{event.username || '系统'}</Text> 将任务状态从
        <Tag color="default" style={{ margin: '0 4px' }}>{this.getStatusName(oldStatus)}</Tag>
        更改为
        <Tag color="processing" style={{ margin: '0 4px' }}>{this.getStatusName(newStatus)}</Tag>
      </Text>
    );
  }
  
  private getStatusName(status: any): string {
    const statusMap: Record<string, string> = {
      'todo': '待办',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'blocked': '阻塞',
      'testing': '测试中',
      'draft': '草稿',
      'planning': '计划中'
    };
    return statusMap[String(status)] || String(status);
  }
}

// 完成事件渲染器
export class CompletedEventRenderer extends BaseEventRenderer {
  getIcon() { return <CheckCircleOutlined />; }
  getColor() { return '#52c41a'; }
  getBackgroundColor() { return '#f6ffed'; }
  getPriority() { return 9; }
  
  getDescription(event: TaskTimelineEvent) {
    return (
      <div>
        <Text>
          <Text strong>{event.username || '系统'}</Text> 完成了任务 🎉
        </Text>
        {event.metadata?.duration_ms && (
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              耗时: {Math.round(event.metadata.duration_ms / 1000 / 60)} 分钟
            </Text>
          </div>
        )}
      </div>
    );
  }
}

// 分配事件渲染器
export class AssignedEventRenderer extends BaseEventRenderer {
  getIcon() { return <TeamOutlined />; }
  getColor() { return '#13c2c2'; }
  getPriority() { return 7; }
  
  getDescription(event: TaskTimelineEvent) {
    const assignedTo = event.metadata?.new_value || event.metadata?.assignee_name;
    return (
      <Text>
        <Text strong>{event.username || '系统'}</Text> 将任务分配给
        <Avatar size="small" style={{ margin: '0 4px', backgroundColor: '#13c2c2' }}>
          {String(assignedTo).charAt(0).toUpperCase()}
        </Avatar>
        <Text strong>{assignedTo}</Text>
      </Text>
    );
  }
}

// 优先级变更渲染器
export class PriorityChangedEventRenderer extends BaseEventRenderer {
  getIcon() { return <ExclamationCircleOutlined />; }
  getColor() { return '#eb2f96'; }
  getPriority() { return 6; }
  
  getDescription(event: TaskTimelineEvent) {
    const oldPriority = event.metadata?.old_value;
    const newPriority = event.metadata?.new_value;
    
    return (
      <Text>
        <Text strong>{event.username || '系统'}</Text> 调整了任务优先级：
        {this.getPriorityTag(oldPriority)} → {this.getPriorityTag(newPriority)}
      </Text>
    );
  }
  
  private getPriorityTag(priority: any) {
    const priorityConfig: Record<string, { color: string; text: string }> = {
      high: { color: 'red', text: '高' },
      medium: { color: 'orange', text: '中' },
      low: { color: 'green', text: '低' },
    };
    const config = priorityConfig[String(priority)] || { color: 'default', text: String(priority) };
    return <Tag color={config.color} style={{ margin: '0 4px' }}>{config.text}</Tag>;
  }
}

// 时间相关事件渲染器
export class TimeRelatedEventRenderer extends BaseEventRenderer {
  getIcon() { return <CalendarOutlined />; }
  getColor() { return '#fa541c'; }
  getPriority() { return 4; }
  
  getDescription(event: TaskTimelineEvent) {
    const eventType = event.event_type;
    const username = event.username || '系统';
    
    if (eventType === 'deadline_changed') {
      return this.renderDeadlineChange(event, username);
    } else if (eventType === 'time_logged') {
      return this.renderTimeLogged(event, username);
    } else if (eventType === 'estimate_updated') {
      return this.renderEstimateUpdate(event, username);
    }
    
    return <Text><Text strong>{username}</Text> 更新了时间相关信息</Text>;
  }
  
  private renderDeadlineChange(event: TaskTimelineEvent, username: string) {
    return (
      <Text>
        <Text strong>{username}</Text> 更改了截止时间
        {event.metadata?.old_value && (
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(event.metadata.old_value).toLocaleDateString()} → {' '}
              {event.metadata.new_value ? new Date(event.metadata.new_value).toLocaleDateString() : '未设置'}
            </Text>
          </div>
        )}
      </Text>
    );
  }
  
  private renderTimeLogged(event: TaskTimelineEvent, username: string) {
    const minutes = event.metadata?.duration_ms ? Math.round(event.metadata.duration_ms / 1000 / 60) : 0;
    return (
      <Text>
        <Text strong>{username}</Text> 记录了工作时间：
        <Tag color="blue" style={{ margin: '0 4px' }}>{minutes} 分钟</Tag>
      </Text>
    );
  }
  
  private renderEstimateUpdate(event: TaskTimelineEvent, username: string) {
    return (
      <Text>
        <Text strong>{username}</Text> 更新了预估时间
        {event.metadata?.old_value && event.metadata?.new_value && (
          <span>：{event.metadata.old_value}h → {event.metadata.new_value}h</span>
        )}
      </Text>
    );
  }
}

// 评论事件渲染器
export class CommentEventRenderer extends BaseEventRenderer {
  getIcon() { return <CommentOutlined />; }
  getColor() { return '#722ed1'; }
  getPriority() { return 3; }
  
  getDescription(event: TaskTimelineEvent) {
    const username = event.username || '系统';
    const eventType = event.event_type;
    
    if (eventType === 'comment_added') {
      return (
        <div>
          <Text><Text strong>{username}</Text> 添加了评论</Text>
          {event.metadata?.comment_content && (
            <div style={{ 
              marginTop: 8, 
              padding: '8px 12px', 
              backgroundColor: '#fafafa',
              borderRadius: 4,
              borderLeft: '3px solid #722ed1'
            }}>
              <Text style={{ fontSize: 12, fontStyle: 'italic' }}>
                "{event.metadata.comment_content}"
              </Text>
            </div>
          )}
        </div>
      );
    }
    
    return <Text><Text strong>{username}</Text> 更新了评论</Text>;
  }
}

// 关系变更渲染器
export class RelationshipEventRenderer extends BaseEventRenderer {
  getIcon() { return <LinkOutlined />; }
  getColor() { return '#2f54eb'; }
  getPriority() { return 5; }
  
  getDescription(event: TaskTimelineEvent) {
    const username = event.username || '系统';
    const eventType = event.event_type;
    
    if (eventType === 'dependency_added') {
      return (
        <Text>
          <Text strong>{username}</Text> 添加了依赖关系
          {event.metadata?.dependency_task_title && (
            <Text code style={{ margin: '0 4px' }}>
              → {event.metadata.dependency_task_title}
            </Text>
          )}
        </Text>
      );
    } else if (eventType === 'child_added') {
      return (
        <Text>
          <Text strong>{username}</Text> 添加了子任务
          {event.metadata?.child_task_title && (
            <Text code style={{ margin: '0 4px' }}>
              {event.metadata.child_task_title}
            </Text>
          )}
        </Text>
      );
    } else if (eventType === 'parent_changed') {
      return (
        <Text>
          <Text strong>{username}</Text> 更改了父任务
        </Text>
      );
    }
    
    return <Text><Text strong>{username}</Text> 更新了任务关系</Text>;
  }
}

// 系统事件渲染器
export class SystemEventRenderer extends BaseEventRenderer {
  getIcon() { return <RobotOutlined />; }
  getColor() { return '#8c8c8c'; }
  getPriority() { return 1; }
  
  getDescription(event: TaskTimelineEvent) {
    const eventType = event.event_type;
    
    const systemEventDescriptions: Record<string, string> = {
      'bulk_updated': '批量更新了任务',
      'imported': '导入了任务',
      'exported': '导出了任务',
      'archived': '归档了任务',
      'template_applied': '应用了模板',
      'automation_triggered': '触发了自动化操作'
    };
    
    const description = systemEventDescriptions[eventType] || '执行了系统操作';
    
    return (
      <Text>
        <Text strong>系统</Text> {description}
        {event.metadata?.batch_id && (
          <Text code style={{ margin: '0 4px' }}>批次: {event.metadata.batch_id}</Text>
        )}
      </Text>
    );
  }
}

// 事件渲染器工厂
export class EventRendererFactory {
  private static renderers: Map<TaskTimelineEventType, () => EventRenderer> = new Map([
    ['created', () => new CreatedEventRenderer()],
    ['updated', () => new UpdatedEventRenderer()],
    ['deleted', () => new SystemEventRenderer()],
    ['restored', () => new SystemEventRenderer()],
    ['status_changed', () => new StatusChangedEventRenderer()],
    ['completed', () => new CompletedEventRenderer()],
    ['started', () => new StatusChangedEventRenderer()],
    ['paused', () => new StatusChangedEventRenderer()],
    ['cancelled', () => new StatusChangedEventRenderer()],
    ['assigned', () => new AssignedEventRenderer()],
    ['unassigned', () => new AssignedEventRenderer()],
    ['reassigned', () => new AssignedEventRenderer()],
    ['permission_changed', () => new SystemEventRenderer()],
    ['deadline_changed', () => new TimeRelatedEventRenderer()],
    ['due_date_extended', () => new TimeRelatedEventRenderer()],
    ['schedule_updated', () => new TimeRelatedEventRenderer()],
    ['time_logged', () => new TimeRelatedEventRenderer()],
    ['estimate_updated', () => new TimeRelatedEventRenderer()],
    ['title_changed', () => new UpdatedEventRenderer()],
    ['description_updated', () => new UpdatedEventRenderer()],
    ['priority_changed', () => new PriorityChangedEventRenderer()],
    ['tags_updated', () => new UpdatedEventRenderer()],
    ['attachment_added', () => new UpdatedEventRenderer()],
    ['attachment_removed', () => new UpdatedEventRenderer()],
    ['dependency_added', () => new RelationshipEventRenderer()],
    ['dependency_removed', () => new RelationshipEventRenderer()],
    ['parent_changed', () => new RelationshipEventRenderer()],
    ['child_added', () => new RelationshipEventRenderer()],
    ['child_removed', () => new RelationshipEventRenderer()],
    ['comment_added', () => new CommentEventRenderer()],
    ['comment_updated', () => new CommentEventRenderer()],
    ['comment_deleted', () => new CommentEventRenderer()],
    ['mention_added', () => new CommentEventRenderer()],
    ['review_requested', () => new CommentEventRenderer()],
    ['approval_given', () => new CommentEventRenderer()],
    ['bulk_updated', () => new SystemEventRenderer()],
    ['imported', () => new SystemEventRenderer()],
    ['exported', () => new SystemEventRenderer()],
    ['archived', () => new SystemEventRenderer()],
    ['template_applied', () => new SystemEventRenderer()],
    ['automation_triggered', () => new SystemEventRenderer()],
  ]);
  
  static getRenderer(eventType: TaskTimelineEventType): EventRenderer {
    const rendererFactory = this.renderers.get(eventType);
    if (rendererFactory) {
      return rendererFactory();
    }
    
    // 返回默认渲染器
    return new class extends BaseEventRenderer {
      getIcon() { return <InfoCircleOutlined />; }
      getColor() { return '#d9d9d9'; }
      
      getDescription(event: TaskTimelineEvent) {
        return (
          <Text>
            <Text strong>{event.username || '系统'}</Text> 执行了 
            <Text code>{event.event_type}</Text> 操作
          </Text>
        );
      }
    }();
  }
  
  static registerRenderer(eventType: TaskTimelineEventType, rendererFactory: () => EventRenderer) {
    this.renderers.set(eventType, rendererFactory);
  }
  
  static getAvailableEventTypes(): TaskTimelineEventType[] {
    return Array.from(this.renderers.keys());
  }
}

// 事件严重性渲染工具
export class SeverityRenderer {
  static getColor(severity: EventSeverity): string {
    const colors = {
      info: '#1890ff',
      warning: '#fa8c16',
      error: '#f5222d',
      critical: '#722ed1'
    };
    return colors[severity];
  }
  
  static getIcon(severity: EventSeverity): React.ReactNode {
    const icons = {
      info: <InfoCircleOutlined />,
      warning: <WarningOutlined />,
      error: <ExclamationCircleOutlined />,
      critical: <StopOutlined />
    };
    return icons[severity];
  }
  
  static getBadge(severity: EventSeverity): React.ReactNode {
    const config = {
      info: { color: 'blue', text: '信息' },
      warning: { color: 'orange', text: '警告' },
      error: { color: 'red', text: '错误' },
      critical: { color: 'purple', text: '严重' }
    };
    
    const { color, text } = config[severity];
    return <Tag color={color} size="small">{text}</Tag>;
  }
}

// 事件分类渲染工具
export class CategoryRenderer {
  static getColor(category: EventCategory): string {
    const colors = {
      system: '#8c8c8c',
      user: '#1890ff',
      automation: '#52c41a',
      integration: '#722ed1'
    };
    return colors[category];
  }
  
  static getIcon(category: EventCategory): React.ReactNode {
    const icons = {
      system: <RobotOutlined />,
      user: <UserOutlined />,
      automation: <RocketOutlined />,
      integration: <LinkOutlined />
    };
    return icons[category];
  }
  
  static getBadge(category: EventCategory): React.ReactNode {
    const config = {
      system: { color: 'default', text: '系统' },
      user: { color: 'blue', text: '用户' },
      automation: { color: 'green', text: '自动化' },
      integration: { color: 'purple', text: '集成' }
    };
    
    const { color, text } = config[category];
    return <Tag color={color} size="small">{text}</Tag>;
  }
}