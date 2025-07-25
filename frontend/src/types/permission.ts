// Document permission types
export interface DocumentPermission {
  id: number;
  document_id: number;
  user_id: number;
  permission_type: 'read' | 'write' | 'admin' | 'comment';
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  
  // Related fields
  document_title?: string;
  username?: string;
  user_email?: string;
  grantor_name?: string;
}

export interface DocumentShare {
  id: number;
  document_id: number;
  share_token: string;
  share_type: 'link' | 'email' | 'team';
  permission_type: 'read' | 'comment';
  created_by: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  access_count: number;
  require_auth: boolean;
  allow_download: boolean;
  
  // Related fields
  document_title?: string;
  creator_name?: string;
}

export interface DocumentComment {
  id: number;
  document_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  position?: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  
  // Related fields
  username?: string;
  user_avatar?: string;
  replies?: DocumentComment[];
  reply_count?: number;
}

export interface UserDocumentPermission {
  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
  can_comment: boolean;
  can_share: boolean;
  is_owner: boolean;
}

// Request types
export interface GrantDocumentPermissionRequest {
  document_id: number;
  user_id: number;
  permission_type: 'read' | 'write' | 'admin' | 'comment';
  expires_at?: string;
}

export interface UpdateDocumentPermissionRequest {
  permission_type?: 'read' | 'write' | 'admin' | 'comment';
  expires_at?: string;
  is_active?: boolean;
}

export interface CreateDocumentShareRequest {
  document_id: number;
  share_type: 'link' | 'email' | 'team';
  permission_type: 'read' | 'comment';
  expires_at?: string;
  require_auth?: boolean;
  allow_download?: boolean;
}

export interface UpdateDocumentShareRequest {
  permission_type?: 'read' | 'comment';
  expires_at?: string;
  is_active?: boolean;
  require_auth?: boolean;
  allow_download?: boolean;
}

export interface AddDocumentCommentRequest {
  document_id: number;
  parent_id?: number;
  content: string;
  position?: string;
}

export interface UpdateDocumentCommentRequest {
  content?: string;
  is_resolved?: boolean;
}

// Response types
export interface DocumentPermissionResponse {
  permissions: DocumentPermission[];
  total_count: number;
}

export interface DocumentShareResponse {
  shares: DocumentShare[];
  total_count: number;
}

export interface DocumentCommentsResponse {
  comments: DocumentComment[];
  total_count: number;
}

// User search for permission management
export interface UserOption {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

// Permission configuration
export const PERMISSION_TYPES = {
  read: {
    label: '只读',
    description: '可以查看文档内容',
    color: 'blue',
    icon: '👀'
  },
  comment: {
    label: '评论',
    description: '可以查看和评论文档',
    color: 'orange',
    icon: '💬'
  },
  write: {
    label: '编辑',
    description: '可以查看、评论和编辑文档',
    color: 'green',
    icon: '✏️'
  },
  admin: {
    label: '管理',
    description: '可以管理文档的所有权限',
    color: 'red',
    icon: '🔧'
  }
} as const;

export const SHARE_TYPES = {
  link: {
    label: '公开链接',
    description: '任何拥有链接的人都可以访问',
    color: 'blue',
    icon: '🔗'
  },
  email: {
    label: '邮件分享',
    description: '通过邮件分享给特定用户',
    color: 'green',
    icon: '📧'
  },
  team: {
    label: '团队分享',
    description: '分享给团队成员',
    color: 'purple',
    icon: '👥'
  }
} as const;

// Permission helper functions
export function hasPermission(
  userPermissions: UserDocumentPermission,
  requiredPermission: keyof UserDocumentPermission
): boolean {
  return userPermissions[requiredPermission] === true;
}

export function getHighestPermission(permissions: DocumentPermission[]): DocumentPermission | null {
  if (permissions.length === 0) return null;
  
  const permissionLevels = {
    read: 1,
    comment: 2,
    write: 3,
    admin: 4
  };
  
  return permissions.reduce((highest, current) => {
    const currentLevel = permissionLevels[current.permission_type] || 0;
    const highestLevel = permissionLevels[highest.permission_type] || 0;
    return currentLevel > highestLevel ? current : highest;
  });
}

export function canGrantPermission(
  grantor: UserDocumentPermission,
  permissionType: DocumentPermission['permission_type']
): boolean {
  if (grantor.is_owner || grantor.can_admin) {
    return true;
  }
  
  // Users with write permission can grant read and comment permissions
  if (grantor.can_write && (permissionType === 'read' || permissionType === 'comment')) {
    return true;
  }
  
  return false;
}

export function isPermissionExpired(permission: DocumentPermission): boolean {
  if (!permission.expires_at) return false;
  return new Date(permission.expires_at) < new Date();
}

export function isShareExpired(share: DocumentShare): boolean {
  if (!share.expires_at) return false;
  return new Date(share.expires_at) < new Date();
}

export function formatPermissionType(type: DocumentPermission['permission_type']): string {
  return PERMISSION_TYPES[type]?.label || type;
}

export function formatShareType(type: DocumentShare['share_type']): string {
  return SHARE_TYPES[type]?.label || type;
}