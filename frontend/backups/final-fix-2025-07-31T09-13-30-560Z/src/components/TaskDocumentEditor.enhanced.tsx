// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Select, Modal, message, Spin, Tabs, Avatar, Badge } from 'antd';
import { 
  SaveOutlined, 
  HistoryOutlined, 
  TeamOutlined, 
  CommentOutlined,
  FileTextOutlined,
  SettingOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { taskDocumentService } from '../services/taskDocumentService';
import { smartTemplateService } from '../services/smartTemplateService';
import { collaborationService } from '../services/collaborationService';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  initialContent?: string;
  permissions?: {
    canEdit: boolean;
    canComment: boolean;
    canManageCollaborators: boolean;
  };
  onSave?: (content: string) => void;
  useAdvancedAPI?: boolean;
}

interface TemplateRecommendation {
  template: {
    id: number;
    name: string;
    description: string;
    type: string;
    category: string;
    content: string;
    variables: any[];
    usage_count: number;
  };
  score: number;
  reason: string;
  variables?: Record<string, any>;
}

interface Comment {
  id: number;
  document_id: number;
  parent_comment_id?: number;
  user_id: number;
  content: string;
  comment_type: 'general' | 'suggestion' | 'approval' | 'question';
  position_info?: string;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  resolved_by_name?: string;
}

interface Collaborator {
  id: number;
  document_id: number;
  user_id: number;
  permission_level: 'read' | 'comment' | 'edit' | 'admin';
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  last_accessed_at?: string;
  user_name?: string;
  granted_by_name?: string;
}

const TaskDocumentEditorEnhanced: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  projectId,
  initialContent = '',
  permissions = { canEdit: true, canComment: true, canManageCollaborators: false },
  onSave,
  useAdvancedAPI = true
}) => {
  // 基础状态
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 智能模板状态
  const [templates, setTemplates] = useState<TemplateRecommendation[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecommendation | null>(null);
  
  // 协作状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  
  // 实时协作状态
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [documentStats, setDocumentStats] = useState({
    document_id: 0,
    collaborator_count: 0,
    comment_count: 0,
    unresolved_comments: 0,
    change_count: 0
  });

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    if (!taskId || !projectId) return;
    
    setLoading(true);
    try {
      const response = useAdvancedAPI 
        ? await taskDocumentService.getAdvanced(projectId, taskId)
        : await taskDocumentService.get(projectId, taskId);
      
      if (response.content) {
        setContent(response.content);
      }
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId, useAdvancedAPI]);

  // 获取智能模板推荐
  const loadTemplateRecommendations = useCallback(async () => {
    if (!taskId || !projectId) return;
    
    try {
      const recommendations = await smartTemplateService.getRecommendations(
        projectId, 
        taskId
      );
      setTemplates(recommendations);
    } catch (error) {
      console.error('获取模板推荐失败:', error);
    }
  }, [taskId, projectId]);

  // 加载协作数据
  const loadCollaborationData = useCallback(async () => {
    if (!taskId || !projectId) return;
    
    try {
      const [commentsData, collaboratorsData, statsData] = await Promise.all([
        collaborationService.getComments(projectId, taskId),
        collaborationService.getCollaborators(projectId, taskId),
        collaborationService.getStats(projectId, taskId)
      ]);
      
      setComments(commentsData.comments || []);
      setCollaborators(collaboratorsData.collaborators || []);
      setDocumentStats(statsData);
    } catch (error) {
      console.error('加载协作数据失败:', error);
    }
  }, [taskId, projectId]);

  // 保存文档
  const handleSave = async () => {
    if (!permissions.canEdit) {
      message.warning('没有编辑权限');
      return;
    }

    setSaving(true);
    try {
      const response = useAdvancedAPI
        ? await taskDocumentService.updateAdvanced(projectId, taskId, { content })
        : await taskDocumentService.save(projectId, taskId, content);
      
      message.success('保存成功');
      onSave?.(content);
      
      // 刷新协作数据以显示最新变更
      loadCollaborationData();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 应用模板
  const handleApplyTemplate = async (templateRec: TemplateRecommendation) => {
    try {
      const generatedContent = await smartTemplateService.generateFromTemplate(
        templateRec.template.id,
        {
          task_title: `任务 ${taskId}`,
          current_date: new Date().toISOString().split('T')[0],
          project_id: projectId
        }
      );
      
      setContent(generatedContent.content);
      setTemplateModalVisible(false);
      message.success(`已应用模板: ${templateRec.template.name}`);
    } catch (error) {
      console.error('应用模板失败:', error);
      message.error('应用模板失败');
    }
  };

  // 添加评论
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await collaborationService.addComment(projectId, taskId, {
        content: newComment,
        comment_type: 'general'
      });
      
      setNewComment('');
      message.success('评论已添加');
      loadCollaborationData();
    } catch (error) {
      console.error('添加评论失败:', error);
      message.error('添加评论失败');
    }
  };

  // 初始化
  useEffect(() => {
    loadDocument();
    loadTemplateRecommendations();
    loadCollaborationData();
  }, [loadDocument, loadTemplateRecommendations, loadCollaborationData]);

  // 实时更新活跃用户
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const activeData = await collaborationService.getActiveCollaborators(projectId, taskId);
        setActiveUsers(activeData.active_collaborators.map((u: any) => u.username));
      } catch (error) {
        // 静默处理实时更新错误
      }
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, [projectId, taskId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载文档中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>任务文档编辑器 (增强版)</span>
            <div>
              {/* 活跃用户指示器 */}
              {activeUsers.length > 0 && (
                <Badge count={activeUsers.length} style={{ marginRight: 16 }}>
                  <Avatar.Group size="small">
                    {activeUsers.slice(0, 3).map((user, index) => (
                      <Avatar key={index} style={{ backgroundColor: '#87d068' }}>
                        {user.charAt(0).toUpperCase()}
                      </Avatar>
                    ))}
                  </Avatar.Group>
                </Badge>
              )}
              
              {/* 操作按钮 */}
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => setTemplateModalVisible(true)}
                style={{ marginRight: 8 }}
                disabled={!permissions.canEdit}
              >
                智能模板 ({templates.length})
              </Button>
              
              <Button
                icon={<CommentOutlined />}
                onClick={() => setCommentModalVisible(true)}
                style={{ marginRight: 8 }}
              >
                评论 ({documentStats.comment_count})
              </Button>
              
              <Button
                icon={<TeamOutlined />}
                style={{ marginRight: 8 }}
              >
                协作者 ({documentStats.collaborator_count})
              </Button>
              
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
                disabled={!permissions.canEdit}
              >
                保存
              </Button>
            </div>
          </div>
        }
      >
        <Tabs defaultActiveKey="editor">
          <TabPane tab="编辑器" key="editor">
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始编写任务文档..."
              rows={20}
              disabled={!permissions.canEdit}
              style={{ fontFamily: 'monospace' }}
            />
            
            {!permissions.canEdit && (
              <div style={{ marginTop: 16, color: '#999' }}>
                <EyeOutlined /> 您处于只读模式
              </div>
            )}
          </TabPane>
          
          <TabPane tab="协作" key="collaboration">
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h4>最近评论</h4>
                {comments.slice(0, 5).map((comment) => (
                  <Card key={comment.id} size="small" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{comment.user_name || '未知用户'}</strong>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0 0' }}>{comment.content}</p>
                  </Card>
                ))}
              </div>
              
              <div style={{ flex: 1 }}>
                <h4>协作者</h4>
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div>
                      <strong>{collaborator.user_name || '未知用户'}</strong>
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        {collaborator.permission_level}
                      </div>
                    </div>
                    {collaborator.last_accessed_at && (
                      <span style={{ color: '#52c41a', fontSize: '12px' }}>
                        最近活跃
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 智能模板选择弹窗 */}
      <Modal
        title="选择智能模板"
        visible={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          {templates.map((templateRec) => (
            <Card
              key={templateRec.template.id}
              size="small"
              hoverable
              onClick={() => setSelectedTemplate(templateRec)}
              style={{ 
                cursor: 'pointer',
                border: selectedTemplate?.template.id === templateRec.template.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0' }}>{templateRec.template.name}</h4>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                    {templateRec.template.description}
                  </p>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    推荐理由: {templateRec.reason}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    匹配度: {Math.round(templateRec.score * 100)}%
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyTemplate(templateRec);
                    }}
                    style={{ marginTop: 8 }}
                  >
                    应用模板
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* 评论弹窗 */}
      <Modal
        title="文档评论"
        visible={commentModalVisible}
        onCancel={() => setCommentModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <TextArea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="添加评论..."
            rows={3}
          />
          <Button
            type="primary"
            onClick={handleAddComment}
            style={{ marginTop: 8 }}
            disabled={!permissions.canComment}
          >
            添加评论
          </Button>
        </div>
        
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {comments.map((comment) => (
            <Card key={comment.id} size="small" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{comment.user_name || '未知用户'}</strong>
                <span style={{ color: '#999', fontSize: '12px' }}>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0' }}>{comment.content}</p>
              {comment.is_resolved && (
                <div style={{ color: '#52c41a', fontSize: '12px', marginTop: 4 }}>
                  ✓ 已解决
                </div>
              )}
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default TaskDocumentEditorEnhanced;