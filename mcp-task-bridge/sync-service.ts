/**
 * Sync Service - Cross-database synchronization for MCP
 *
 * Provides methods to sync entities between local and remote databases
 * using UUID as the unique identifier.
 */

import { BaseClient, ClientConfig } from './base-client';
import {
  Task,
  Project,
  Document,
  SyncableEntityType,
  SyncDirection,
  ConflictStrategy,
  SyncEntityRequest,
  SyncEntityResponse,
  BatchSyncRequest,
  BatchSyncResponse,
  GetByUUIDRequest,
  SyncStatus,
  ApiResponse,
} from './types';

export class SyncService {
  private localClient: BaseClient;
  private remoteClient: BaseClient | null = null;

  constructor(localConfig: ClientConfig, remoteConfig?: ClientConfig) {
    this.localClient = new BaseClient(localConfig);
    if (remoteConfig) {
      this.remoteClient = new BaseClient(remoteConfig);
    }
  }

  /**
   * Set or update the remote client configuration
   */
  setRemoteClient(config: ClientConfig): void {
    this.remoteClient = new BaseClient(config);
  }

  /**
   * Get task by UUID
   */
  async getTaskByUUID(uuid: string, source: 'local' | 'remote' = 'local'): Promise<ApiResponse<Task>> {
    const client = source === 'local' ? this.localClient : this.remoteClient;
    if (!client) {
      return { success: false, error: `${source} client not configured` };
    }

    try {
      const response = await client.get<Task>(`/tasks/uuid/${uuid}`);
      return response;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get project by UUID
   */
  async getProjectByUUID(uuid: string, source: 'local' | 'remote' = 'local'): Promise<ApiResponse<Project>> {
    const client = source === 'local' ? this.localClient : this.remoteClient;
    if (!client) {
      return { success: false, error: `${source} client not configured` };
    }

    try {
      const response = await client.get<Project>(`/projects/uuid/${uuid}`);
      return response;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get document by UUID
   */
  async getDocumentByUUID(uuid: string, source: 'local' | 'remote' = 'local'): Promise<ApiResponse<Document>> {
    const client = source === 'local' ? this.localClient : this.remoteClient;
    if (!client) {
      return { success: false, error: `${source} client not configured` };
    }

    try {
      const response = await client.get<Document>(`/documents/uuid/${uuid}`);
      return response;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get entity by UUID (generic)
   */
  async getEntityByUUID(request: GetByUUIDRequest): Promise<ApiResponse<any>> {
    const client = request.source === 'remote' ? this.remoteClient : this.localClient;
    if (!client) {
      return { success: false, error: `${request.source || 'local'} client not configured` };
    }

    try {
      const endpoint = `/${request.entity_type}s/uuid/${request.uuid}`;
      return await client.get(endpoint);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync a single task to remote
   */
  async syncTaskToRemote(
    taskId: number,
    options: { includeDocument?: boolean; includeChildren?: boolean } = {}
  ): Promise<SyncEntityResponse> {
    if (!this.remoteClient) {
      return {
        success: false,
        entity_type: 'task',
        uuid: '',
        local_id: taskId,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: 'Remote client not configured',
      };
    }

    try {
      // 1. Get local task
      const localTask = await this.localClient.get<Task>(`/tasks/${taskId}`);
      if (!localTask.success || !localTask.data) {
        return {
          success: false,
          entity_type: 'task',
          uuid: '',
          local_id: taskId,
          action: 'failed',
          sync_version: 0,
          synced_at: new Date().toISOString(),
          error: 'Local task not found',
        };
      }

      const task = localTask.data;
      const uuid = task.uuid;

      if (!uuid) {
        return {
          success: false,
          entity_type: 'task',
          uuid: '',
          local_id: taskId,
          action: 'failed',
          sync_version: 0,
          synced_at: new Date().toISOString(),
          error: 'Task does not have UUID',
        };
      }

      // 2. Check if task exists on remote
      const remoteCheck = await this.remoteClient.get<Task>(`/tasks/uuid/${uuid}`);
      const action = remoteCheck.success && remoteCheck.data ? 'updated' : 'created';

      // 3. Sync task to remote
      const syncResult = await this.remoteClient.post<any>('/sync/task', {
        uuid,
        task: task,
        include_document: options.includeDocument,
        include_children: options.includeChildren,
      });

      if (!syncResult.success) {
        return {
          success: false,
          entity_type: 'task',
          uuid,
          local_id: taskId,
          action: 'failed',
          sync_version: task.sync_version || 0,
          synced_at: new Date().toISOString(),
          error: syncResult.error?.toString(),
        };
      }

      // 4. Update local task with sync metadata
      const now = new Date().toISOString();
      await this.localClient.patch(`/tasks/${taskId}`, {
        synced_at: now,
        sync_source: 'local',
        sync_remote_id: syncResult.data?.remote_id,
        sync_version: (task.sync_version || 0) + 1,
      });

      return {
        success: true,
        entity_type: 'task',
        uuid,
        local_id: taskId,
        remote_id: syncResult.data?.remote_id,
        action,
        sync_version: (task.sync_version || 0) + 1,
        synced_at: now,
        message: `Task ${action} on remote`,
      };
    } catch (error) {
      return {
        success: false,
        entity_type: 'task',
        uuid: '',
        local_id: taskId,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: String(error),
      };
    }
  }

  /**
   * Sync a single task from remote
   */
  async syncTaskFromRemote(
    remoteTaskId: number,
    options: { includeDocument?: boolean; includeChildren?: boolean } = {}
  ): Promise<SyncEntityResponse> {
    if (!this.remoteClient) {
      return {
        success: false,
        entity_type: 'task',
        uuid: '',
        local_id: 0,
        remote_id: remoteTaskId,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: 'Remote client not configured',
      };
    }

    try {
      // 1. Get remote task
      const remoteTask = await this.remoteClient.get<Task>(`/tasks/${remoteTaskId}`);
      if (!remoteTask.success || !remoteTask.data) {
        return {
          success: false,
          entity_type: 'task',
          uuid: '',
          local_id: 0,
          remote_id: remoteTaskId,
          action: 'failed',
          sync_version: 0,
          synced_at: new Date().toISOString(),
          error: 'Remote task not found',
        };
      }

      const task = remoteTask.data;
      const uuid = task.uuid;

      if (!uuid) {
        return {
          success: false,
          entity_type: 'task',
          uuid: '',
          local_id: 0,
          remote_id: remoteTaskId,
          action: 'failed',
          sync_version: 0,
          synced_at: new Date().toISOString(),
          error: 'Remote task does not have UUID',
        };
      }

      // 2. Check if task exists locally
      const localCheck = await this.localClient.get<Task>(`/tasks/uuid/${uuid}`);
      const action = localCheck.success && localCheck.data ? 'updated' : 'created';

      // 3. Sync task to local
      const syncResult = await this.localClient.post<any>('/sync/task', {
        uuid,
        task: task,
        include_document: options.includeDocument,
        include_children: options.includeChildren,
      });

      if (!syncResult.success) {
        return {
          success: false,
          entity_type: 'task',
          uuid,
          local_id: 0,
          remote_id: remoteTaskId,
          action: 'failed',
          sync_version: task.sync_version || 0,
          synced_at: new Date().toISOString(),
          error: syncResult.error?.toString(),
        };
      }

      const now = new Date().toISOString();

      return {
        success: true,
        entity_type: 'task',
        uuid,
        local_id: syncResult.data?.local_id || 0,
        remote_id: remoteTaskId,
        action,
        sync_version: task.sync_version || 1,
        synced_at: now,
        message: `Task ${action} locally`,
      };
    } catch (error) {
      return {
        success: false,
        entity_type: 'task',
        uuid: '',
        local_id: 0,
        remote_id: remoteTaskId,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: String(error),
      };
    }
  }

  /**
   * Sync a single entity
   */
  async syncEntity(request: SyncEntityRequest): Promise<SyncEntityResponse> {
    if (request.entity_type === 'task') {
      if (request.direction === 'to_remote') {
        return this.syncTaskToRemote(request.entity_id, {
          includeDocument: request.include_related,
          includeChildren: request.include_related,
        });
      } else {
        return this.syncTaskFromRemote(request.entity_id, {
          includeDocument: request.include_related,
          includeChildren: request.include_related,
        });
      }
    }

    // For other entity types, use generic sync endpoint
    const sourceClient = request.direction === 'to_remote' ? this.localClient : this.remoteClient;
    const targetClient = request.direction === 'to_remote' ? this.remoteClient : this.localClient;

    if (!sourceClient || !targetClient) {
      return {
        success: false,
        entity_type: request.entity_type,
        uuid: '',
        local_id: request.entity_id,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: 'Client not configured',
      };
    }

    try {
      // Get entity from source
      const endpoint = `/${request.entity_type}s/${request.entity_id}`;
      const sourceEntity = await sourceClient.get<any>(endpoint);

      if (!sourceEntity.success || !sourceEntity.data) {
        return {
          success: false,
          entity_type: request.entity_type,
          uuid: '',
          local_id: request.entity_id,
          action: 'failed',
          sync_version: 0,
          synced_at: new Date().toISOString(),
          error: 'Entity not found',
        };
      }

      const entity = sourceEntity.data;
      const uuid = entity.uuid;

      // Sync to target
      const syncResult = await targetClient.post<any>(`/sync/${request.entity_type}`, {
        uuid,
        data: entity,
        force_update: request.force_update,
      });

      const now = new Date().toISOString();

      return {
        success: syncResult.success,
        entity_type: request.entity_type,
        uuid: uuid || '',
        local_id: request.direction === 'to_remote' ? request.entity_id : syncResult.data?.local_id || 0,
        remote_id: request.direction === 'to_remote' ? syncResult.data?.remote_id : request.entity_id,
        action: syncResult.success ? (syncResult.data?.action || 'updated') : 'failed',
        sync_version: entity.sync_version || 1,
        synced_at: now,
        message: syncResult.message,
        error: syncResult.error?.toString(),
      };
    } catch (error) {
      return {
        success: false,
        entity_type: request.entity_type,
        uuid: '',
        local_id: request.entity_id,
        action: 'failed',
        sync_version: 0,
        synced_at: new Date().toISOString(),
        error: String(error),
      };
    }
  }

  /**
   * Batch sync entities
   */
  async batchSync(request: BatchSyncRequest): Promise<BatchSyncResponse> {
    const results: SyncEntityResponse[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const entityRequest of request.entities) {
      const result = await this.syncEntity(entityRequest);
      results.push(result);

      switch (result.action) {
        case 'created':
          created++;
          break;
        case 'updated':
          updated++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'failed':
        case 'conflict':
          failed++;
          break;
      }
    }

    return {
      success: failed === 0,
      total: request.entities.length,
      created,
      updated,
      skipped,
      failed,
      results,
    };
  }

  /**
   * Get sync status for a task
   */
  async getTaskSyncStatus(taskId: number): Promise<ApiResponse<SyncStatus>> {
    try {
      const localTask = await this.localClient.get<Task>(`/tasks/${taskId}`);
      if (!localTask.success || !localTask.data) {
        return { success: false, error: 'Task not found' };
      }

      const task = localTask.data;
      const uuid = task.uuid;

      if (!uuid) {
        return {
          success: true,
          data: {
            uuid: '',
            local_id: taskId,
            sync_version: 0,
            is_synced: false,
            has_local_changes: true,
            has_remote_changes: false,
          },
        };
      }

      let remoteTask: Task | null = null;
      if (this.remoteClient) {
        const remoteResult = await this.remoteClient.get<Task>(`/tasks/uuid/${uuid}`);
        if (remoteResult.success && remoteResult.data) {
          remoteTask = remoteResult.data;
        }
      }

      const isSynced = remoteTask !== null && task.sync_version === remoteTask.sync_version;
      const hasLocalChanges = !remoteTask || task.sync_version > (remoteTask.sync_version || 0);
      const hasRemoteChanges = remoteTask !== null && (remoteTask.sync_version || 0) > task.sync_version;

      return {
        success: true,
        data: {
          uuid,
          local_id: taskId,
          remote_id: remoteTask?.id,
          sync_source: task.sync_source,
          sync_version: task.sync_version || 0,
          synced_at: task.synced_at,
          is_synced: isSynced,
          has_local_changes: hasLocalChanges,
          has_remote_changes: hasRemoteChanges,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export default SyncService;
