/**
 * Task Description Versioning Interfaces
 * 任务描述版本化接口契约
 * 
 * 此文件定义了所有团队成员必须遵循的接口契约
 * 确保并行开发时的一致性
 */

// ============= 数据模型 =============

/**
 * 版本记录数据模型
 */
export interface TaskDescriptionVersion {
  id: number;
  taskId: number;
  version: number;
  content: string;
  updatedBy: number | null;
  updatedAt: Date;
}

/**
 * 版本历史条目（API返回用）
 */
export interface VersionHistoryItem {
  version: number;
  content: string;
  summary: string;
  updatedBy: number | null;
  updatedByName?: string;
  updatedAt: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

/**
 * 恢复请求
 */
export interface RestoreRequest {
  reason?: string;
}

/**
 * 恢复响应
 */
export interface RestoreResponse {
  taskId: number;
  currentVersionHint: number;
  restoredFromVersion: number;
}

// ============= 服务层接口 =============

/**
 * 任务版本化服务接口
 */
export interface ITaskVersioningService {
  /**
   * 更新任务描述并创建版本记录
   * @param taskId 任务ID
   * @param newDescription 新的描述内容
   * @param userId 操作用户ID
   * @returns Promise<void>
   * @throws {NotFoundError} 任务不存在
   * @throws {DatabaseError} 数据库操作失败
   */
  updateTaskWithVersioning(
    taskId: number,
    newDescription: string,
    userId: number
  ): Promise<void>;

  /**
   * 获取任务描述的历史版本列表
   * @param taskId 任务ID
   * @param cursor 分页游标
   * @param limit 每页数量(1-100)
   * @returns 分页的历史版本列表
   */
  getDescriptionHistory(
    taskId: number,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResponse<VersionHistoryItem>>;

  /**
   * 恢复任务描述到指定版本
   * @param taskId 任务ID
   * @param targetVersion 目标版本号
   * @param userId 操作用户ID
   * @param request 恢复请求参数
   * @returns 恢复结果
   * @throws {NotFoundError} 任务或版本不存在
   * @throws {ForbiddenError} 无权限
   */
  restoreDescriptionVersion(
    taskId: number,
    targetVersion: number,
    userId: number,
    request: RestoreRequest
  ): Promise<RestoreResponse>;

  /**
   * 检查功能是否启用
   * @returns 是否启用版本化功能
   */
  isVersioningEnabled(): boolean;
}

// ============= 数据访问层接口 =============

/**
 * 任务版本仓储接口
 */
export interface ITaskVersionRepository {
  /**
   * 创建新的版本记录
   */
  createVersion(
    data: Omit<TaskDescriptionVersion, 'id'>
  ): Promise<TaskDescriptionVersion>;

  /**
   * 获取下一个版本号
   */
  getNextVersionNumber(taskId: number): Promise<number>;

  /**
   * 查询历史版本
   */
  findVersionsByTaskId(
    taskId: number,
    offset: number,
    limit: number
  ): Promise<TaskDescriptionVersion[]>;

  /**
   * 获取特定版本
   */
  findByTaskIdAndVersion(
    taskId: number,
    version: number
  ): Promise<TaskDescriptionVersion | null>;

  /**
   * 统计版本数量
   */
  countVersions(taskId: number): Promise<number>;
}

// ============= 错误定义 =============

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
