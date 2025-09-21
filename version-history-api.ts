/**
 * 版本历史API接口设计和实现
 * 提供完整的文档版本管理RESTful API
 */

import { Request, Response, NextFunction } from 'express';
import { 
  MyersDiffAlgorithm, 
  ThreeWayMergeAlgorithm, 
  VersionDiffUtils,
  DiffResult,
  MergeResult 
} from './version-diff-algorithm';

// ================================
// 数据传输对象 (DTOs)
// ================================

export interface CreateVersionDto {
  documentId: number;
  taskId: number;
  content: string;
  title?: string;
  changeSummary?: string;
  versionType?: 'auto' | 'manual' | 'merge' | 'rollback';
}

export interface UpdateVersionDto {
  title?: string;
  changeSummary?: string;
  isPublished?: boolean;
  tags?: string[];
}

export interface CompareVersionsDto {
  oldVersionId: number;
  newVersionId: number;
  format?: 'json' | 'html' | 'unified';
  contextLines?: number;
}

export interface MergeVersionsDto {
  baseVersionId: number;
  sourceVersionId: number;
  targetVersionId: number;
  autoResolveStrategy?: 'ours' | 'theirs' | 'manual';
}

export interface VersionQueryDto {
  documentId?: number;
  taskId?: number;
  versionType?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: number;
  isPublished?: boolean;
  hasTags?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'version_number' | 'content_size';
  sortOrder?: 'asc' | 'desc';
}

// ================================
// 响应数据结构
// ================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VersionResponse {
  id: number;
  documentId: number;
  taskId: number;
  versionNumber: string;
  versionType: string;
  title: string;
  contentSize: number;
  contentHash: string;
  changeSummary: string;
  isMajorVersion: boolean;
  isActive: boolean;
  isPublished: boolean;
  createdBy: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: string;
  tags: Array<{
    id: number;
    name: string;
    type: string;
    color: string;
  }>;
  statistics: {
    changeCount: number;
    accessCount: number;
  };
}

export interface DiffResponse {
  oldVersion: {
    id: number;
    versionNumber: string;
    title: string;
  };
  newVersion: {
    id: number;
    versionNumber: string;
    title: string;
  };
  statistics: {
    totalLines: number;
    addedLines: number;
    deletedLines: number;
    modifiedLines: number;
    unchangedLines: number;
  };
  diffs: DiffResult[];
  htmlDiff?: string;
  unifiedDiff?: string;
}

export interface MergeResponse {
  success: boolean;
  resultVersion?: {
    id: number;
    versionNumber: string;
    content: string;
  };
  conflicts: Array<{
    lineStart: number;
    lineEnd: number;
    conflictType: string;
    baseContent: string[];
    sourceContent: string[];
    targetContent: string[];
  }>;
  statistics: {
    autoResolvedCount: number;
    manualResolvedCount: number;
    totalConflicts: number;
  };
}

// ================================
// API控制器类
// ================================

export class VersionHistoryController {
  
  // ================================
  // 版本管理接口
  // ================================

  /**
   * 创建新版本
   * POST /api/versions
   */
  async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateVersionDto = req.body;
      
      // 参数验证
      if (!dto.documentId || !dto.taskId || !dto.content) {
        res.status(400).json({
          success: false,
          error: 'documentId, taskId, and content are required'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        dto.taskId, 
        'write'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // 创建版本
      const version = await this.versionService.createVersion({
        documentId: dto.documentId,
        taskId: dto.taskId,
        content: dto.content,
        title: dto.title || 'Untitled Version',
        changeSummary: dto.changeSummary,
        versionType: dto.versionType || 'auto',
        createdBy: req.user.id
      });

      // 记录访问日志
      await this.logVersionAccess(version.id, req.user.id, 'create', req.ip);

      const response: ApiResponse<VersionResponse> = {
        success: true,
        data: await this.formatVersionResponse(version),
        message: 'Version created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取版本列表
   * GET /api/versions
   */
  async getVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: VersionQueryDto = req.query as any;
      
      // 构建查询条件
      const options = {
        documentId: query.documentId ? parseInt(query.documentId.toString()) : undefined,
        taskId: query.taskId ? parseInt(query.taskId.toString()) : undefined,
        versionType: query.versionType,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        createdBy: query.createdBy ? parseInt(query.createdBy.toString()) : undefined,
        isPublished: query.isPublished ? query.isPublished === 'true' : undefined,
        hasTags: query.hasTags ? query.hasTags === 'true' : undefined,
        page: parseInt(query.page?.toString() || '1'),
        limit: parseInt(query.limit?.toString() || '20'),
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder || 'desc'
      };

      // 检查权限
      if (options.taskId) {
        const hasPermission = await this.checkVersionPermission(
          req.user?.id, 
          options.taskId, 
          'read'
        );
        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
          return;
        }
      }

      const result = await this.versionService.getVersions(options);
      
      const response: ApiResponse<VersionResponse[]> = {
        success: true,
        data: await Promise.all(result.data.map(v => this.formatVersionResponse(v))),
        pagination: {
          page: options.page,
          limit: options.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / options.limit)
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取单个版本详情
   * GET /api/versions/:id
   */
  async getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);
      const includeContent = req.query.includeContent === 'true';

      const version = await this.versionService.getVersionById(versionId, includeContent);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        version.taskId, 
        'read'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // 记录访问日志
      await this.logVersionAccess(versionId, req.user.id, 'view', req.ip);

      const response: ApiResponse<VersionResponse> = {
        success: true,
        data: await this.formatVersionResponse(version)
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新版本信息
   * PUT /api/versions/:id
   */
  async updateVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);
      const dto: UpdateVersionDto = req.body;

      const version = await this.versionService.getVersionById(versionId);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        version.taskId, 
        'write'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      const updatedVersion = await this.versionService.updateVersion(versionId, dto);

      const response: ApiResponse<VersionResponse> = {
        success: true,
        data: await this.formatVersionResponse(updatedVersion),
        message: 'Version updated successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除版本
   * DELETE /api/versions/:id
   */
  async deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);

      const version = await this.versionService.getVersionById(versionId);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // 检查权限（只有管理员可以删除版本）
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        version.taskId, 
        'admin'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      await this.versionService.deleteVersion(versionId);

      const response: ApiResponse = {
        success: true,
        message: 'Version deleted successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 版本对比接口
  // ================================

  /**
   * 比较两个版本
   * POST /api/versions/compare
   */
  async compareVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CompareVersionsDto = req.body;

      // 参数验证
      if (!dto.oldVersionId || !dto.newVersionId) {
        res.status(400).json({
          success: false,
          error: 'oldVersionId and newVersionId are required'
        });
        return;
      }

      // 获取版本数据
      const [oldVersion, newVersion] = await Promise.all([
        this.versionService.getVersionById(dto.oldVersionId, true),
        this.versionService.getVersionById(dto.newVersionId, true)
      ]);

      if (!oldVersion || !newVersion) {
        res.status(404).json({
          success: false,
          error: 'One or both versions not found'
        });
        return;
      }

      // 检查权限
      const hasOldPermission = await this.checkVersionPermission(
        req.user?.id, 
        oldVersion.taskId, 
        'read'
      );
      const hasNewPermission = await this.checkVersionPermission(
        req.user?.id, 
        newVersion.taskId, 
        'read'
      );

      if (!hasOldPermission || !hasNewPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // 计算差异
      const diffs = MyersDiffAlgorithm.diff(oldVersion.content, newVersion.content);
      const statistics = VersionDiffUtils.getDiffStatistics(diffs);

      // 根据请求的格式生成不同输出
      const format = dto.format || 'json';
      let htmlDiff: string | undefined;
      let unifiedDiff: string | undefined;

      if (format === 'html' || format === 'json') {
        htmlDiff = VersionDiffUtils.generateHtmlDiff(diffs);
      }

      if (format === 'unified' || format === 'json') {
        unifiedDiff = VersionDiffUtils.generateUnifiedDiff(
          oldVersion.content,
          newVersion.content,
          `v${oldVersion.versionNumber}`,
          `v${newVersion.versionNumber}`
        );
      }

      // 记录访问日志
      await this.logVersionAccess(
        dto.oldVersionId, 
        req.user.id, 
        'compare', 
        req.ip,
        { compareWith: dto.newVersionId }
      );

      const response: ApiResponse<DiffResponse> = {
        success: true,
        data: {
          oldVersion: {
            id: oldVersion.id,
            versionNumber: oldVersion.versionNumber,
            title: oldVersion.title
          },
          newVersion: {
            id: newVersion.id,
            versionNumber: newVersion.versionNumber,
            title: newVersion.title
          },
          statistics,
          diffs: format === 'json' ? diffs : [],
          htmlDiff,
          unifiedDiff
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 版本合并接口
  // ================================

  /**
   * 三方合并版本
   * POST /api/versions/merge
   */
  async mergeVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: MergeVersionsDto = req.body;

      // 参数验证
      if (!dto.baseVersionId || !dto.sourceVersionId || !dto.targetVersionId) {
        res.status(400).json({
          success: false,
          error: 'baseVersionId, sourceVersionId, and targetVersionId are required'
        });
        return;
      }

      // 获取版本数据
      const [baseVersion, sourceVersion, targetVersion] = await Promise.all([
        this.versionService.getVersionById(dto.baseVersionId, true),
        this.versionService.getVersionById(dto.sourceVersionId, true),
        this.versionService.getVersionById(dto.targetVersionId, true)
      ]);

      if (!baseVersion || !sourceVersion || !targetVersion) {
        res.status(404).json({
          success: false,
          error: 'One or more versions not found'
        });
        return;
      }

      // 检查权限（需要写权限）
      const permissions = await Promise.all([
        this.checkVersionPermission(req.user?.id, baseVersion.taskId, 'write'),
        this.checkVersionPermission(req.user?.id, sourceVersion.taskId, 'write'),
        this.checkVersionPermission(req.user?.id, targetVersion.taskId, 'write')
      ]);

      if (!permissions.every(p => p)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      // 执行三方合并
      const mergeResult = ThreeWayMergeAlgorithm.merge(
        baseVersion.content,
        sourceVersion.content,
        targetVersion.content
      );

      let resultVersion: any = null;

      // 如果合并成功，创建新版本
      if (mergeResult.success || dto.autoResolveStrategy) {
        const mergedContent = mergeResult.content.join('\\n');
        
        resultVersion = await this.versionService.createVersion({
          documentId: targetVersion.documentId,
          taskId: targetVersion.taskId,
          content: mergedContent,
          title: `Merged from v${sourceVersion.versionNumber}`,
          changeSummary: `Auto-merged from version ${sourceVersion.versionNumber}`,
          versionType: 'merge',
          createdBy: req.user.id
        });

        // 记录合并操作
        await this.versionService.recordMerge({
          documentId: targetVersion.documentId,
          baseVersionId: dto.baseVersionId,
          sourceVersionId: dto.sourceVersionId,
          targetVersionId: dto.targetVersionId,
          resultVersionId: resultVersion.id,
          mergeStatus: mergeResult.success ? 'completed' : 'completed_with_conflicts',
          conflictCount: mergeResult.conflicts.length,
          autoResolvedCount: mergeResult.autoResolvedCount,
          manualResolvedCount: mergeResult.manualResolvedCount,
          mergeStrategy: 'three_way',
          createdBy: req.user.id
        });
      }

      const response: ApiResponse<MergeResponse> = {
        success: true,
        data: {
          success: mergeResult.success,
          resultVersion: resultVersion ? {
            id: resultVersion.id,
            versionNumber: resultVersion.versionNumber,
            content: mergeResult.content.join('\\n')
          } : undefined,
          conflicts: mergeResult.conflicts.map(conflict => ({
            lineStart: conflict.lineStart,
            lineEnd: conflict.lineEnd,
            conflictType: conflict.conflictType,
            baseContent: conflict.baseContent,
            sourceContent: conflict.sourceContent,
            targetContent: conflict.targetContent
          })),
          statistics: {
            autoResolvedCount: mergeResult.autoResolvedCount,
            manualResolvedCount: mergeResult.manualResolvedCount,
            totalConflicts: mergeResult.conflicts.length
          }
        },
        message: mergeResult.success ? 'Merge completed successfully' : 'Merge completed with conflicts'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 版本回滚接口
  // ================================

  /**
   * 回滚到指定版本
   * POST /api/versions/:id/rollback
   */
  async rollbackToVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);
      const { createNewVersion = true } = req.body;

      const targetVersion = await this.versionService.getVersionById(versionId, true);
      if (!targetVersion) {
        res.status(404).json({
          success: false,
          error: 'Target version not found'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        targetVersion.taskId, 
        'write'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      let resultVersion: any = targetVersion;

      if (createNewVersion) {
        // 创建新版本作为回滚结果
        resultVersion = await this.versionService.createVersion({
          documentId: targetVersion.documentId,
          taskId: targetVersion.taskId,
          content: targetVersion.content,
          title: `Rollback to v${targetVersion.versionNumber}`,
          changeSummary: `Rolled back to version ${targetVersion.versionNumber}`,
          versionType: 'rollback',
          createdBy: req.user.id
        });
      }

      // 记录回滚操作
      await this.logVersionAccess(
        versionId, 
        req.user.id, 
        'rollback', 
        req.ip,
        { resultVersionId: resultVersion.id }
      );

      const response: ApiResponse<VersionResponse> = {
        success: true,
        data: await this.formatVersionResponse(resultVersion),
        message: `Successfully rolled back to version ${targetVersion.versionNumber}`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 版本标签管理接口
  // ================================

  /**
   * 为版本添加标签
   * POST /api/versions/:id/tags
   */
  async addVersionTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);
      const { tagName, tagType = 'custom', description, color = '#1976d2' } = req.body;

      if (!tagName) {
        res.status(400).json({
          success: false,
          error: 'tagName is required'
        });
        return;
      }

      const version = await this.versionService.getVersionById(versionId);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        version.taskId, 
        'write'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      const tag = await this.versionService.addVersionTag({
        versionId,
        tagName,
        tagType,
        description,
        color,
        createdBy: req.user.id
      });

      const response: ApiResponse = {
        success: true,
        data: tag,
        message: 'Tag added successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除版本标签
   * DELETE /api/versions/:id/tags/:tagId
   */
  async removeVersionTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versionId = parseInt(req.params.id);
      const tagId = parseInt(req.params.tagId);

      const version = await this.versionService.getVersionById(versionId);
      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found'
        });
        return;
      }

      // 检查权限
      const hasPermission = await this.checkVersionPermission(
        req.user?.id, 
        version.taskId, 
        'write'
      );
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
        return;
      }

      await this.versionService.removeVersionTag(tagId);

      const response: ApiResponse = {
        success: true,
        message: 'Tag removed successfully'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 版本统计接口
  // ================================

  /**
   * 获取版本统计信息
   * GET /api/versions/statistics
   */
  async getVersionStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { documentId, taskId, dateFrom, dateTo } = req.query;

      const options = {
        documentId: documentId ? parseInt(documentId.toString()) : undefined,
        taskId: taskId ? parseInt(taskId.toString()) : undefined,
        dateFrom: dateFrom ? new Date(dateFrom.toString()) : undefined,
        dateTo: dateTo ? new Date(dateTo.toString()) : undefined
      };

      const statistics = await this.versionService.getVersionStatistics(options);

      const response: ApiResponse = {
        success: true,
        data: statistics
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ================================
  // 辅助方法
  // ================================

  private async formatVersionResponse(version: any): Promise<VersionResponse> {
    // 格式化版本响应数据
    return {
      id: version.id,
      documentId: version.documentId,
      taskId: version.taskId,
      versionNumber: version.versionNumber,
      versionType: version.versionType,
      title: version.title,
      contentSize: version.contentSize,
      contentHash: version.contentHash,
      changeSummary: version.changeSummary,
      isMajorVersion: version.isMajorVersion,
      isActive: version.isActive,
      isPublished: version.isPublished,
      createdBy: {
        id: version.createdBy.id,
        username: version.createdBy.username,
        email: version.createdBy.email
      },
      createdAt: version.createdAt.toISOString(),
      tags: version.tags || [],
      statistics: {
        changeCount: version.changeCount || 0,
        accessCount: version.accessCount || 0
      }
    };
  }

  private async checkVersionPermission(
    userId: number, 
    taskId: number, 
    permissionType: 'read' | 'write' | 'admin'
  ): Promise<boolean> {
    // 实现权限检查逻辑
    // 这里应该调用权限服务检查用户对任务的权限
    return true; // 临时返回true，实际应实现权限检查
  }

  private async logVersionAccess(
    versionId: number,
    userId: number,
    actionType: string,
    ipAddress: string,
    metadata?: any
  ): Promise<void> {
    // 记录版本访问日志
    await this.versionService.logAccess({
      versionId,
      userId,
      actionType,
      ipAddress,
      metadata,
      createdAt: new Date()
    });
  }

  // 注入版本服务
  constructor(private versionService: any) {}
}

// ================================
// 路由定义
// ================================

import { Router } from 'express';

export function createVersionHistoryRoutes(controller: VersionHistoryController): Router {
  const router = Router();

  // 版本管理路由
  router.post('/versions', controller.createVersion.bind(controller));
  router.get('/versions', controller.getVersions.bind(controller));
  router.get('/versions/:id', controller.getVersion.bind(controller));
  router.put('/versions/:id', controller.updateVersion.bind(controller));
  router.delete('/versions/:id', controller.deleteVersion.bind(controller));

  // 版本对比路由
  router.post('/versions/compare', controller.compareVersions.bind(controller));

  // 版本合并路由
  router.post('/versions/merge', controller.mergeVersions.bind(controller));

  // 版本回滚路由
  router.post('/versions/:id/rollback', controller.rollbackToVersion.bind(controller));

  // 版本标签路由
  router.post('/versions/:id/tags', controller.addVersionTag.bind(controller));
  router.delete('/versions/:id/tags/:tagId', controller.removeVersionTag.bind(controller));

  // 统计信息路由
  router.get('/versions/statistics', controller.getVersionStatistics.bind(controller));

  return router;
}

// ================================
// 中间件
// ================================

/**
 * 认证中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // 验证JWT token
  try {
    // const payload = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = payload;
    req.user = { id: 1, username: 'admin' }; // 临时用户信息
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('API Error:', err);

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details
    });
    return;
  }

  if (err.name === 'NotFoundError') {
    res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
    return;
  }

  if (err.name === 'PermissionError') {
    res.status(403).json({
      success: false,
      error: 'Permission denied'
    });
    return;
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

/**
 * 限流中间件
 */
export function rateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  const requests = new Map();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    const validRequests = userRequests.filter((time: number) => now - time < windowMs);
    
    if (validRequests.length >= max) {
      res.status(429).json({
        success: false,
        error: 'Too many requests'
      });
      return;
    }
    
    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
}