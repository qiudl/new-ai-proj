// ==============================================
// Timeline Component Library v2.0
// ==============================================

// ================== Core Components ==================
// 基础时间线组件
export { default as TaskTimeline } from '../TaskTimeline';

// 增强版时间线组件（v1）
export { default as EnhancedTaskTimeline } from './EnhancedTaskTimeline';

// 增强版时间线组件（v2）- 推荐使用
export { default as EnhancedTaskTimelineV2 } from './EnhancedTaskTimelineV2';

// 虚拟化时间线组件（高性能）
export { default as VirtualizedTimeline } from './VirtualizedTimeline';

// 实时时间线组件（WebSocket支持）
export { default as RealTimeTimeline } from './RealTimeTimeline';

// ================== Demo Components ==================
// 组件库主页面（推荐作为入口）
export { default as TimelineLibrary } from './TimelineLibrary';

// 基础演示组件
export { default as TimelineDemo } from './TimelineDemo';

// 高级搜索演示组件
export { default as AdvancedSearchDemo } from './AdvancedSearchDemo';

// 性能测试演示组件
export { default as PerformanceTestDemo } from './PerformanceTestDemo';

// 实时功能演示组件
export { default as RealTimeDemo } from './RealTimeDemo';

// ================== Event System ==================
// 事件渲染器系统
export * from './EventRenderers';
export { EventRendererFactory } from './EventRenderers';

// 事件分组系统
export * from './EventGrouping';
export { IntelligentEventGrouper, GroupingStrategy } from './EventGrouping';

// ================== Search & Filter ==================
// 高级搜索组件
export { default as AdvancedSearch } from './AdvancedSearch';
export type { AdvancedSearchFilter } from './AdvancedSearch';

// 搜索工具类
export { TimelineSearchUtils } from '../../utils/TimelineSearchUtils';

// ================== Real-time Support ==================
// WebSocket管理器
export { WebSocketManager, TimelineWebSocketManager } from '../../utils/WebSocketManager';
export type { WebSocketMessage, TimelineWebSocketEvent, WebSocketEventHandler } from '../../utils/WebSocketManager';

// 模拟WebSocket服务器（开发用）
export { MockWebSocketServer, getMockWebSocketServer } from '../../utils/MockWebSocketServer';

// ================== Performance & Utils ==================
// 性能优化工具
export { TimelinePerformanceUtils } from '../../utils/TimelinePerformanceUtils';

// ================== Types & Interfaces ==================
// 时间线类型定义
export * from '../../types/timeline';

// ================== Library Information ==================
// 组件库版本和信息
export const TIMELINE_LIBRARY_VERSION = '2.0.0';
export const TIMELINE_LIBRARY_INFO = {
  version: '2.0.0',
  name: 'AI Project Timeline Components',
  description: 'A comprehensive timeline component library with real-time updates, advanced search, and performance optimization',
  features: [
    'Multiple timeline component variations',
    'Event type specialized renderers',
    'Intelligent event grouping',
    'Advanced search and filtering',
    'Virtual scrolling for performance',
    'Real-time WebSocket support',
    'Performance optimization tools',
    'Comprehensive demo components'
  ],
  components: {
    core: ['TaskTimeline', 'EnhancedTaskTimeline', 'EnhancedTaskTimelineV2', 'VirtualizedTimeline', 'RealTimeTimeline'],
    demo: ['TimelineDemo', 'AdvancedSearchDemo', 'PerformanceTestDemo', 'RealTimeDemo'],
    utils: ['EventRendererFactory', 'IntelligentEventGrouper', 'TimelineSearchUtils', 'TimelinePerformanceUtils'],
    realtime: ['WebSocketManager', 'TimelineWebSocketManager', 'MockWebSocketServer']
  }
};