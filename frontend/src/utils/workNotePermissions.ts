/**
 * 工作笔记权限检查工具函数
 *
 * 基于后端 permission_checker.go 的权限规则实现前端权限验证
 *
 * 权限规则:
 * - 私有笔记/目录: 只有创建者可以编辑/删除
 * - 团队笔记/目录: 团队成员可以编辑/删除 (暂时允许所有登录用户)
 * - 公开笔记/目录: 只有系统管理员可以创建/编辑/删除
 * - 所有登录用户可以查看公开笔记
 * - 所有登录用户可以评论公开笔记
 */

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: number;
  userType?: string;
  role?: string;
  isEnterpriseAdmin?: boolean;  // 是否为企业管理员（后端is_enterprise_admin函数判断）
}

/**
 * 笔记信息接口
 */
export interface WorkNoteInfo {
  id: number;
  creatorId: number;
  visibility: 'private' | 'team' | 'public';
  status?: string;
}

/**
 * 目录信息接口
 */
export interface FolderInfo {
  id: number;
  creatorId: number;
  treeType: 'private' | 'team' | 'public';
}

/**
 * 检查用户是否为系统管理员
 * 系统管理员的定义：user_type = "system" 且 role = "admin"
 */
export function isSystemAdmin(user: UserInfo): boolean {
  return user.userType === 'system' && user.role === 'admin';
}

/**
 * 检查用户是否为企业管理员
 * 企业管理员由后端is_enterprise_admin()函数判断
 * 规则：access_level >= 4 OR can_make_decisions = true
 *
 * P0修复：使用登录响应中的is_enterprise_admin字段
 */
export function isEnterpriseAdmin(user: UserInfo): boolean {
  // 优先使用后端返回的is_enterprise_admin字段
  if (user.isEnterpriseAdmin !== undefined) {
    return user.isEnterpriseAdmin;
  }

  // Fallback: 系统管理员总是企业管理员
  return isSystemAdmin(user);
}

/**
 * 检查用户是否为笔记的创建者
 */
export function isNoteCreator(user: UserInfo, note: WorkNoteInfo): boolean {
  return user.id === note.creatorId;
}

/**
 * 检查用户是否为目录的创建者
 */
export function isFolderCreator(user: UserInfo, folder: FolderInfo): boolean {
  return user.id === folder.creatorId;
}

/**
 * 检查用户是否可以查看笔记
 *
 * 规则:
 * - 私有笔记: 只有创建者可以查看
 * - 团队笔记: 所有活跃企业成员可以查看 (前端允许所有登录用户，实际由后端判断)
 * - 公开笔记: 所有登录用户可以查看
 */
export function canViewNote(user: UserInfo, note: WorkNoteInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (note.visibility) {
    case 'private':
      return isNoteCreator(user, note);
    case 'team':
      // Team笔记：允许所有登录用户尝试查看，实际权限由后端判断
      return true;
    case 'public':
      return true;
    default:
      return false;
  }
}

/**
 * 检查用户是否可以创建笔记
 *
 * 规则:
 * - 私有笔记: 所有登录用户可以创建
 * - 团队笔记: 全体活跃企业成员可以创建 (前端允许所有登录用户尝试，实际由后端判断)
 * - 公开笔记: 只有系统管理员可以创建
 *
 * 注意：Team笔记的实际权限由后端 can_create_team_note() 函数判断
 * 前端允许所有登录用户看到创建按钮，后端会检查是否为活跃企业成员
 */
export function canCreateNote(user: UserInfo, visibility: 'private' | 'team' | 'public'): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (visibility) {
    case 'private':
    case 'team':
      // Team笔记：允许所有登录用户尝试，实际由后端检查企业成员资格
      return true;
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以编辑笔记
 *
 * 规则:
 * - 私有笔记: 只有创建者可以编辑
 * - 团队笔记: 只有创建者可以编辑自己的笔记
 * - 公开笔记: 只有系统管理员可以编辑
 */
export function canEditNote(user: UserInfo, note: WorkNoteInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (note.visibility) {
    case 'private':
    case 'team':
      // Team笔记：只有创建者可以编辑自己的笔记
      return isNoteCreator(user, note);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以删除笔记
 *
 * 规则:
 * - 私有笔记: 只有创建者可以删除
 * - 团队笔记: 只有创建者可以删除自己的笔记
 * - 公开笔记: 只有系统管理员可以删除
 */
export function canDeleteNote(user: UserInfo, note: WorkNoteInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (note.visibility) {
    case 'private':
    case 'team':
      // Team笔记：只有创建者可以删除自己的笔记
      return isNoteCreator(user, note);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以发布笔记
 *
 * 规则:
 * - 私有笔记: 创建者可以发布
 * - 团队笔记: 创建者可以发布自己的笔记
 * - 公开笔记: 只有系统管理员可以发布
 */
export function canPublishNote(user: UserInfo, note: WorkNoteInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (note.visibility) {
    case 'private':
    case 'team':
      // Team笔记：创建者可以发布自己的笔记
      return isNoteCreator(user, note);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以评论笔记
 *
 * 规则:
 * - 所有登录用户都可以评论公开笔记
 * - 私有笔记和团队笔记暂不支持评论
 */
export function canCommentNote(user: UserInfo, note: WorkNoteInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  // 目前只有公开笔记支持评论
  if (note.visibility === 'public') {
    return true;
  }

  return false;
}

/**
 * 检查用户是否可以创建目录
 *
 * 规则:
 * - 私有目录: 所有登录用户可以创建
 * - 团队目录: 仅企业管理员可以创建（使用后端is_enterprise_admin判断）
 * - 公开目录: 只有系统管理员可以创建
 *
 * P0修复：Team文件夹权限使用is_enterprise_admin字段判断
 * 企业管理员（access_level >= 4 OR can_make_decisions = true）现在可以看到创建按钮
 */
export function canCreateFolder(user: UserInfo, treeType: 'private' | 'team' | 'public'): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (treeType) {
    case 'private':
      return true;
    case 'team':
      // P0修复：使用isEnterpriseAdmin判断，而非isSystemAdmin
      return isEnterpriseAdmin(user);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以编辑目录
 *
 * 规则:
 * - 私有目录: 只有创建者可以编辑
 * - 团队目录: 仅企业管理员可以编辑（使用后端is_enterprise_admin判断）
 * - 公开目录: 只有系统管理员可以编辑
 *
 * P0修复：Team文件夹权限使用is_enterprise_admin字段判断
 */
export function canEditFolder(user: UserInfo, folder: FolderInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (folder.treeType) {
    case 'private':
      return isFolderCreator(user, folder);
    case 'team':
      // P0修复：使用isEnterpriseAdmin判断，而非isSystemAdmin
      return isEnterpriseAdmin(user);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以删除目录
 *
 * 规则:
 * - 私有目录: 只有创建者可以删除
 * - 团队目录: 仅企业管理员可以删除（使用后端is_enterprise_admin判断）
 * - 公开目录: 只有系统管理员可以删除
 *
 * P0修复：Team文件夹权限使用is_enterprise_admin字段判断
 */
export function canDeleteFolder(user: UserInfo, folder: FolderInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (folder.treeType) {
    case 'private':
      return isFolderCreator(user, folder);
    case 'team':
      // P0修复：使用isEnterpriseAdmin判断，而非isSystemAdmin
      return isEnterpriseAdmin(user);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 检查用户是否可以移动目录
 *
 * 规则:
 * - 私有目录: 只有创建者可以移动
 * - 团队目录: 仅企业管理员可以移动（使用后端is_enterprise_admin判断）
 * - 公开目录: 只有系统管理员可以移动
 *
 * P0修复：Team文件夹权限使用is_enterprise_admin字段判断
 */
export function canMoveFolder(user: UserInfo, folder: FolderInfo): boolean {
  if (!user || !user.id) {
    return false;
  }

  switch (folder.treeType) {
    case 'private':
      return isFolderCreator(user, folder);
    case 'team':
      // P0修复：使用isEnterpriseAdmin判断，而非isSystemAdmin
      return isEnterpriseAdmin(user);
    case 'public':
      return isSystemAdmin(user);
    default:
      return false;
  }
}

/**
 * 从localStorage获取当前用户信息
 *
 * P0修复：优先从currentUser读取完整用户信息（包含is_enterprise_admin字段）
 * Fallback到从JWT token payload解析基本信息
 */
export function getCurrentUser(): UserInfo | null {
  try {
    // P0修复：优先从localStorage的currentUser读取完整用户信息
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      return {
        id: currentUser.id,
        userType: currentUser.user_type || currentUser.userType,
        role: currentUser.role,
        isEnterpriseAdmin: currentUser.is_enterprise_admin  // P0修复：使用后端返回的字段
      };
    }

    // Fallback: 从JWT token解析基本信息
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));

    return {
      id: payload.user_id || payload.userId || 0,
      userType: payload.user_type || payload.userType,
      role: payload.role,
      isEnterpriseAdmin: undefined  // token payload中没有此字段
    };
  } catch (error) {
    console.error('[workNotePermissions] Failed to parse user info:', error);
    return null;
  }
}

/**
 * 工作笔记权限检查器类
 * 提供面向对象的API和缓存机制
 */
export class WorkNotePermissionChecker {
  private user: UserInfo | null;
  private permissionCache: Map<string, boolean>;

  constructor(user?: UserInfo) {
    this.user = user || getCurrentUser();
    this.permissionCache = new Map();
  }

  /**
   * 更新当前用户
   */
  setUser(user: UserInfo) {
    this.user = user;
    this.clearCache();
  }

  /**
   * 清除权限缓存
   */
  clearCache() {
    this.permissionCache.clear();
  }

  /**
   * 获取缓存的权限检查结果
   */
  private getCached(key: string): boolean | undefined {
    return this.permissionCache.get(key);
  }

  /**
   * 设置权限检查结果到缓存
   */
  private setCache(key: string, value: boolean) {
    this.permissionCache.set(key, value);
  }

  /**
   * 检查是否为系统管理员
   */
  isSystemAdmin(): boolean {
    if (!this.user) return false;

    const cacheKey = 'isSystemAdmin';
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = isSystemAdmin(this.user);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记查看权限
   */
  canViewNote(note: WorkNoteInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canViewNote:${note.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canViewNote(this.user, note);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记创建权限
   */
  canCreateNote(visibility: 'private' | 'team' | 'public'): boolean {
    if (!this.user) return false;

    const cacheKey = `canCreateNote:${visibility}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canCreateNote(this.user, visibility);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记编辑权限
   */
  canEditNote(note: WorkNoteInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canEditNote:${note.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canEditNote(this.user, note);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记删除权限
   */
  canDeleteNote(note: WorkNoteInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canDeleteNote:${note.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canDeleteNote(this.user, note);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记发布权限
   */
  canPublishNote(note: WorkNoteInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canPublishNote:${note.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canPublishNote(this.user, note);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查笔记评论权限
   */
  canCommentNote(note: WorkNoteInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canCommentNote:${note.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canCommentNote(this.user, note);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查目录创建权限
   */
  canCreateFolder(treeType: 'private' | 'team' | 'public'): boolean {
    if (!this.user) return false;

    const cacheKey = `canCreateFolder:${treeType}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canCreateFolder(this.user, treeType);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查目录编辑权限
   */
  canEditFolder(folder: FolderInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canEditFolder:${folder.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canEditFolder(this.user, folder);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查目录删除权限
   */
  canDeleteFolder(folder: FolderInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canDeleteFolder:${folder.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canDeleteFolder(this.user, folder);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 检查目录移动权限
   */
  canMoveFolder(folder: FolderInfo): boolean {
    if (!this.user) return false;

    const cacheKey = `canMoveFolder:${folder.id}`;
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached;

    const result = canMoveFolder(this.user, folder);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 获取笔记的所有权限状态
   */
  getNotePermissions(note: WorkNoteInfo) {
    return {
      canView: this.canViewNote(note),
      canEdit: this.canEditNote(note),
      canDelete: this.canDeleteNote(note),
      canPublish: this.canPublishNote(note),
      canComment: this.canCommentNote(note),
      isCreator: this.user ? isNoteCreator(this.user, note) : false
    };
  }

  /**
   * 获取目录的所有权限状态
   */
  getFolderPermissions(folder: FolderInfo) {
    return {
      canEdit: this.canEditFolder(folder),
      canDelete: this.canDeleteFolder(folder),
      canMove: this.canMoveFolder(folder),
      isCreator: this.user ? isFolderCreator(this.user, folder) : false
    };
  }
}

/**
 * 导出默认实例
 */
export const workNotePermissionChecker = new WorkNotePermissionChecker();
