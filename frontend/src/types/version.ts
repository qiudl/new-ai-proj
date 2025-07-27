// Document Version Management Types
import React from 'react';
import {
  PlusCircleOutlined,
  RocketOutlined,
  BugOutlined,
  UndoOutlined,
  BranchesOutlined,
  QuestionOutlined
} from '@ant-design/icons';

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  title: string;
  content?: string;
  file_url?: string;
  file_size: number;
  mime_type?: string;
  change_summary?: string;
  created_by: number;
  created_at: string;
  is_major_version: boolean;
  tags: string[];
  metadata: Record<string, any>;
  
  // Related fields
  document_title?: string;
  created_by_name?: string;
  created_by_email?: string;
  label_count?: number;
  comment_count?: number;
}

export interface DocumentVersionComparison {
  id: number;
  document_id: number;
  from_version: number;
  to_version: number;
  diff_content?: string;
  added_lines: number;
  removed_lines: number;
  modified_lines: number;
  similarity_score: number;
  created_at: string;
}

export interface DocumentVersionBranch {
  id: number;
  document_id: number;
  branch_name: string;
  base_version: number;
  current_version: number;
  created_by: number;
  created_at: string;
  merged_at?: string;
  merged_by?: number;
  is_active: boolean;
  description?: string;
  
  // Related fields
  created_by_name?: string;
  merged_by_name?: string;
}

export interface DocumentVersionLabel {
  id: number;
  document_id: number;
  version_number: number;
  label: string;
  color: string;
  description?: string;
  created_by: number;
  created_at: string;
  
  // Related fields
  created_by_name?: string;
}

export interface DocumentVersionComment {
  id: number;
  document_id: number;
  version_number: number;
  user_id: number;
  content: string;
  line_number?: number;
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
  parent_id?: number;
  
  // Related fields
  username?: string;
  user_avatar?: string;
  replies?: DocumentVersionComment[];
}

export interface DocumentVersionStats {
  document_id: number;
  document_title: string;
  total_versions: number;
  major_versions: number;
  first_version_date: string;
  latest_version_date: string;
  current_version: number;
  total_size_all_versions: number;
  contributors_count: number;
}

// Request Types

export interface CreateDocumentVersionRequest {
  document_id: number;
  title: string;
  content?: string;
  file_url?: string;
  file_size: number;
  mime_type?: string;
  change_summary?: string;
  is_major_version: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

export interface UpdateDocumentVersionRequest {
  title?: string;
  change_summary?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface RestoreDocumentVersionRequest {
  target_version: number;
  change_summary?: string;
}

export interface CompareVersionsRequest {
  document_id: number;
  from_version: number;
  to_version: number;
}

export interface CreateVersionLabelRequest {
  document_id: number;
  version_number: number;
  label: string;
  color: string;
  description?: string;
}

export interface CreateVersionCommentRequest {
  document_id: number;
  version_number: number;
  content: string;
  line_number?: number;
  parent_id?: number;
}

export interface CreateVersionBranchRequest {
  document_id: number;
  branch_name: string;
  base_version: number;
  description?: string;
}

// Response Types

export interface DocumentVersionResponse {
  versions: DocumentVersion[];
  total_count: number;
  current_page: number;
  page_size: number;
  has_more: boolean;
}

export interface DocumentVersionHistoryResponse {
  document_id: number;
  document_title: string;
  versions: DocumentVersion[];
  stats: DocumentVersionStats;
  labels: DocumentVersionLabel[];
  branches: DocumentVersionBranch[];
}

export interface VersionComparisonResponse {
  document_id: number;
  from_version: number;
  to_version: number;
  diff_content?: string;
  added_lines: number;
  removed_lines: number;
  modified_lines: number;
  similarity_score: number;
  summary: string;
}

// UI State Types

export interface VersionViewMode {
  type: 'list' | 'timeline' | 'tree';
  showMajorOnly: boolean;
  showLabels: boolean;
  showComments: boolean;
}

export interface VersionFilter {
  dateRange?: [string, string];
  creators?: number[];
  majorVersionsOnly?: boolean;
  withLabels?: boolean;
  withComments?: boolean;
  searchTerm?: string;
}

export interface VersionCompareSelection {
  fromVersion?: number;
  toVersion?: number;
  isComparing: boolean;
}

// Version Management Configuration

export const VERSION_CHANGE_TYPES = {
  created: {
    label: '创建',
    color: 'green',
    icon: React.createElement(PlusCircleOutlined)
  },
  major: {
    label: '主要版本',
    color: 'red',
    icon: React.createElement(RocketOutlined)
  },
  minor: {
    label: '次要版本',
    color: 'blue',
    icon: React.createElement(BugOutlined)
  },
  restored: {
    label: '恢复版本',
    color: 'orange',
    icon: React.createElement(UndoOutlined)
  },
  merged: {
    label: '合并版本',
    color: 'purple',
    icon: React.createElement(BranchesOutlined)
  },
  unknown: {
    label: '未知',
    color: 'default',
    icon: React.createElement(QuestionOutlined)
  }
} as const;

export const VERSION_LABEL_COLORS = [
  '#f50',      // red
  '#2db7f5',   // blue
  '#87d068',   // green
  '#108ee9',   // blue-6
  '#f56a00',   // orange
  '#722ed1',   // purple
  '#52c41a',   // green-6
  '#fa8c16',   // orange-6
  '#eb2f96',   // magenta
  '#13c2c2',   // cyan
] as const;

export const DEFAULT_VERSION_METADATA = {
  auto_generated: false,
  source: 'manual',
  build_info: {},
  custom_fields: {}
} as const;

// Utility Functions

export function getVersionName(version: DocumentVersion): string {
  if (version.is_major_version) {
    return `v${version.version_number}.0`;
  }
  return `v${version.version_number}`;
}

export function getVersionChangeType(version: DocumentVersion): keyof typeof VERSION_CHANGE_TYPES {
  if (!version.change_summary) {
    return 'unknown';
  }
  
  const summary = version.change_summary.toLowerCase();
  if (summary.includes('initial') || summary.includes('created')) {
    return 'created';
  } else if (summary.includes('restored')) {
    return 'restored';
  } else if (summary.includes('merged')) {
    return 'merged';
  } else if (version.is_major_version) {
    return 'major';
  }
  return 'minor';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatVersionDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calculateVersionDiff(comparison: DocumentVersionComparison): string {
  const total = comparison.added_lines + comparison.removed_lines + comparison.modified_lines;
  if (total === 0) {
    return '无变更';
  }
  
  const parts = [];
  if (comparison.added_lines > 0) {
    parts.push(`+${comparison.added_lines} 行`);
  }
  if (comparison.removed_lines > 0) {
    parts.push(`-${comparison.removed_lines} 行`);
  }
  if (comparison.modified_lines > 0) {
    parts.push(`~${comparison.modified_lines} 行`);
  }
  
  return parts.join(', ');
}

export function getSimilarityText(score: number): { text: string; color: string } {
  if (score >= 0.9) {
    return { text: '极高相似', color: 'green' };
  } else if (score >= 0.7) {
    return { text: '高相似', color: 'blue' };
  } else if (score >= 0.5) {
    return { text: '中等相似', color: 'orange' };
  } else if (score >= 0.3) {
    return { text: '低相似', color: 'red' };
  } else {
    return { text: '完全不同', color: 'red' };
  }
}

export function isVersionCurrent(version: DocumentVersion, currentVersion: number): boolean {
  return version.version_number === currentVersion;
}

export function canRestoreVersion(version: DocumentVersion, currentVersion: number): boolean {
  return version.version_number !== currentVersion;
}

export function getVersionTimeline(versions: DocumentVersion[]): Array<{
  version: DocumentVersion;
  isFirst: boolean;
  isLast: boolean;
  timeSinceNext?: number;
}> {
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  return sortedVersions.map((version, index) => {
    const isFirst = index === 0;
    const isLast = index === sortedVersions.length - 1;
    
    let timeSinceNext: number | undefined;
    if (!isLast) {
      const currentTime = new Date(version.created_at).getTime();
      const nextTime = new Date(sortedVersions[index + 1].created_at).getTime();
      timeSinceNext = currentTime - nextTime;
    }
    
    return {
      version,
      isFirst,
      isLast,
      timeSinceNext
    };
  });
}