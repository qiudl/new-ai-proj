// @ts-nocheck
import React from 'react';
import { notification} from 'antd';
import { TaskDocumentMVP2Service } from '../services/taskDocumentMVP2Service';

export interface TaskCreationResult {
  task: any;
  documentCreated: boolean;
  documentId?: number;
  documentPath?: string;
}

export class TaskCreationNotification {
  /**
   * 显示任务创建成功的通知，包含文档创建状态
   */
  static showTaskCreated(result: TaskCreationResult, projectId: number) {
    const { task, documentCreated, documentId, documentPath } = result;
    
    if (documentCreated && documentId) {
      // 任务和文档都创建成功
      notification.success({
        message: '任务创建成功！',
        description: (
          <div>
            <div style={{ marginBottom: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              任务 "{task.title}" 已成功创建
            </div>
            <div style={{ marginBottom: 12 }}>
              <FileTextOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              任务文档已自动创建
            </div>
            <Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => this.openTaskDocument(projectId, task.id)}
              >
                查看文档
              </Button>
              <Button 
                size="small"
                onClick={() => this.openDocumentVersions(projectId, task.id)}
              >
                版本管理
              </Button>
            </Space>
          </div>
        ),
        duration: 8,
        placement: 'topRight'});
    } else if (documentCreated === false) {
      // 任务创建成功，但文档创建失败或被禁用
      notification.success({
        message: '任务创建成功',
        description: (
          <div>
            <div style={{ marginBottom: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              任务 "{task.title}" 已成功创建
            </div>
            <div style={{ marginBottom: 12, color: '#8c8c8c' }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              未自动创建文档（可能已禁用或配置问题）
            </div>
            <Space>
              <Button 
                size="small" 
                type="dashed"
                onClick={() => this.manualCreateDocument(projectId, task.id)}
              >
                手动创建文档
              </Button>
              <Button 
                size="small"
                icon={<SettingOutlined />}
                onClick={() => this.openProjectSettings(projectId)}
              >
                项目设置
              </Button>
            </Space>
          </div>
        ),
        duration: 6,
        placement: 'topRight'});
    } else {
      // 标准任务创建成功通知
      notification.success({
        message: '任务创建成功',
        description: `任务 "${task.title}" 已成功创建`,
        duration: 4,
        placement: 'topRight'});
    }
  }

  /**
   * 显示任务创建失败的通知
   */
  static showTaskCreationError(error: string) {
    notification.error({
      message: '任务创建失败',
      description: error,
      duration: 6,
      placement: 'topRight'});
  }

  /**
   * 显示文档相关操作的通知
   */
  static showDocumentNotification(type: 'success' | 'error' | 'info', message: string, description?: string) {
    notification[type]({
      message,
      description,
      duration: 4,
      placement: 'topRight'});
  }

  // 私有方法 - 处理各种操作
  private static openTaskDocument(projectId: number, taskId: number) {
    // 跳转到任务文档编辑页面
    // 这里可以使用 react-router 的导航
    const url = `/projects/${projectId}/tasks/${taskId}/document`;
    if (window.location.pathname !== url) {
      window.open(url, '_blank');
    }
  }

  private static openDocumentVersions(projectId: number, taskId: number) {
    // 打开文档版本管理页面
    const url = `/projects/${projectId}/tasks/${taskId}/document/versions`;
    window.open(url, '_blank');
  }

  private static async manualCreateDocument(projectId: number, taskId: number) {
    try {
      const result = await TaskDocumentMVP2Service.autoCreateTaskDocument(projectId, taskId);
      
      if (result.document_created) {
        this.showDocumentNotification(
          'success',
          '文档创建成功',
          '任务文档已手动创建，您现在可以开始编辑了。'
        );
        
        // 延迟打开文档
        setTimeout(() => {
          this.openTaskDocument(projectId, taskId);
        }, 1000);
      } else {
        this.showDocumentNotification(
          'error',
          '文档创建失败',
          '无法创建文档，请检查项目配置或联系管理员。'
        );
      }
    } catch (error: any) {
      this.showDocumentNotification(
        'error',
        '文档创建失败',
        error.message || '创建文档时发生未知错误'
      );
    }
  }

  private static openProjectSettings(projectId: number) {
    // 打开项目设置页面的文档配置部分
    const url = `/projects/${projectId}/settings?tab=documents`;
    window.open(url, '_blank');
  }

  /**
   * 显示版本管理相关的通知
   */
  static showVersionNotification(action: 'rollback' | 'create', version?: number) {
    const messages = {
      rollback: {
        success: `文档已成功回滚到版本 ${version}`,
        error: '文档回滚失败'},
      create: {
        success: '新版本已创建',
        error: '版本创建失败'}};

    return {
      success: () => this.showDocumentNotification('success', messages[action].success),
      error: (error: string) => this.showDocumentNotification('error', messages[action].error, error)};
  }

  /**
   * 显示文档配置更新通知
   */
  static showConfigUpdateNotification(success: boolean, message?: string) {
    if (success) {
      this.showDocumentNotification(
        'success',
        '配置已更新',
        '项目文档配置已成功更新，新设置将应用于后续创建的任务。'
      );
    } else {
      this.showDocumentNotification(
        'error',
        '配置更新失败',
        message || '更新项目文档配置时发生错误'
      );
    }
  }
}