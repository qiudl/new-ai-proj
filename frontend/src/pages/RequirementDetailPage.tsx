/**
 * 需求详情页面 - 重构版本
 * Requirement Detail Page - Refactored Version
 *
 * 使用组件化架构，与任务详情页保持一致的设计风格
 */

import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Modal, Input } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { requirementApi, RequirementTaskLink, getRequirementTasks } from '../services/requirementService';
import { Requirement } from '../types/requirement';
import { useResponsive } from '../hooks/useResponsive';
import RequirementReviewModal from '../components/RequirementReviewModal';
import ConvertToTaskModal from '../components/ConvertToTaskModal';
import LinkTaskModal from '../components/LinkTaskModal';
import {
  RequirementDetailLayout,
  RequirementDetailHeader,
  RequirementDetailContent,
  RequirementDetailSidebar,
} from './RequirementDetail';

/**
 * 需求详情页面组件
 */
const RequirementDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const responsive = useResponsive();

  // 基础状态
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [linkedTasks, setLinkedTasks] = useState<RequirementTaskLink[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modal 状态
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf'>('image');

  // 标签编辑状态
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const requirementId = id ? parseInt(id) : 0;

  /**
   * 加载需求详情
   */
  useEffect(() => {
    if (requirementId) {
      loadRequirement();
    }
  }, [requirementId]);

  const loadRequirement = async () => {
    try {
      setLoading(true);
      const data = await requirementApi.getRequirement(requirementId);
      setRequirement(data);
    } catch (error: any) {
      console.error('Error loading requirement:', error);
      message.error(error?.message || '加载需求详情失败');
      navigate('/requirements');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载关联任务
   */
  useEffect(() => {
    if (requirementId && activeTab === 'tasks') {
      loadLinkedTasks();
    }
  }, [requirementId, activeTab]);

  const loadLinkedTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await getRequirementTasks(requirementId, { page: 1, page_size: 100 });
      setLinkedTasks(response.data || []);
    } catch (error: any) {
      console.error('Error loading linked tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  /**
   * 处理返回
   */
  const handleBack = () => {
    navigate('/requirements');
  };

  /**
   * 处理编辑
   */
  const handleEdit = () => {
    navigate(`/requirements/${requirementId}/edit`);
  };

  /**
   * 处理删除
   */
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除需求 "${requirement?.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementApi.deleteRequirement(requirementId);
          message.success('需求已删除');
          navigate('/requirements');
        } catch (error: any) {
          console.error('Error deleting requirement:', error);
          message.error(error?.message || '删除需求失败');
        }
      },
    });
  };

  /**
   * 处理提交评审
   */
  const handleSubmit = async () => {
    try {
      await requirementApi.submitRequirement(requirementId);
      message.success('需求已提交评审');
      // 使用setTimeout避免与message的flushSync冲突
      setTimeout(() => {
        loadRequirement();
      }, 0);
    } catch (error: any) {
      console.error('Error submitting requirement:', error);
      message.error(error?.message || '提交需求失败');
    }
  };

  /**
   * 处理归档
   */
  const handleArchive = async () => {
    Modal.confirm({
      title: '确认归档',
      content: `确定要归档需求 "${requirement?.title}" 吗？`,
      okText: '归档',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementApi.archiveRequirement(requirementId);
          message.success('需求已归档');
          // 使用setTimeout避免与message的flushSync冲突
          setTimeout(() => {
            loadRequirement();
          }, 0);
        } catch (error: any) {
          console.error('Error archiving requirement:', error);
          message.error(error?.message || '归档需求失败');
        }
      },
    });
  };

  /**
   * 处理评审
   */
  const handleOpenReview = () => {
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async (reviewData: any) => {
    try {
      setReviewLoading(true);
      await requirementApi.reviewRequirement(requirementId, reviewData);
      setReviewModalVisible(false);
      loadRequirement();
    } catch (error: any) {
      console.error('Error reviewing requirement:', error);
      throw error;
    } finally {
      setReviewLoading(false);
    }
  };

  /**
   * 处理转换为任务
   */
  const handleOpenConvert = () => {
    setConvertModalVisible(true);
  };

  const handleConvertSubmit = async (convertData: any) => {
    try {
      setConvertLoading(true);
      const result = await requirementApi.convertToTask(requirementId, convertData);
      setConvertModalVisible(false);
      loadRequirement();
      loadLinkedTasks();
      return result;
    } catch (error: any) {
      console.error('Error converting to task:', error);
      throw error;
    } finally {
      setConvertLoading(false);
    }
  };

  const handleConvertSuccess = (taskId: number) => {
    setConvertModalVisible(false);
    if (requirement?.project_id && taskId) {
      navigate(`/projects/${requirement.project_id}/tasks/${taskId}`);
    }
  };

  /**
   * 处理关联已有任务
   */
  const handleOpenLink = () => {
    setLinkModalVisible(true);
  };

  const handleLinkSubmit = async (taskId: number, linkType: any, linkComment?: string) => {
    try {
      setLinkLoading(true);
      const { linkTaskToRequirement } = await import('../services/requirementService');
      await linkTaskToRequirement(requirementId, taskId, linkType, linkComment);
      setLinkModalVisible(false);
      loadLinkedTasks();
    } catch (error: any) {
      console.error('Error linking task:', error);
      throw error;
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkSuccess = () => {
    setLinkModalVisible(false);
    message.success('任务关联成功');
    // 使用setTimeout避免与message的flushSync冲突
    setTimeout(() => {
      loadLinkedTasks();
    }, 0);
  };

  /**
   * 快速操作
   */
  const handleCopyLink = () => {
    const url = `${window.location.origin}/requirements/${requirementId}`;
    navigator.clipboard.writeText(url);
    message.success('链接已复制到剪贴板');
  };

  const handleExportPDF = () => {
    window.print();
    message.info('请使用浏览器打印功能保存为PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  /**
   * 标签编辑
   */
  const handleOpenTagsModal = () => {
    setEditingTags(requirement?.tags || []);
    setTagInput('');
    setTagsModalVisible(true);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) {
      message.warning('标签不能为空');
      return;
    }
    if (editingTags.includes(trimmedTag)) {
      message.warning('标签已存在');
      return;
    }
    setEditingTags([...editingTags, trimmedTag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveTags = async () => {
    try {
      await requirementApi.updateRequirement(requirementId, {
        tags: editingTags
      });
      message.success('标签更新成功');
      setTagsModalVisible(false);
      loadRequirement();
    } catch (error: any) {
      console.error('Error updating tags:', error);
      message.error(error?.message || '更新标签失败');
    }
  };

  /**
   * 附件预览
   */
  const handlePreviewAttachment = (url: string, fileName: string) => {
    const getFileType = (name: string): 'image' | 'pdf' | 'other' => {
      const ext = name.split('.').pop()?.toLowerCase();
      if (!ext) return 'other';
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const pdfExts = ['pdf'];
      if (imageExts.includes(ext)) return 'image';
      if (pdfExts.includes(ext)) return 'pdf';
      return 'other';
    };

    const type = getFileType(fileName);
    if (type === 'image' || type === 'pdf') {
      setPreviewUrl(url);
      setPreviewType(type);
      setPreviewVisible(true);
    } else {
      window.open(url, '_blank');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', fontSize: '16px', color: '#1890ff' }}>
          正在加载需求详情...
        </div>
      </div>
    );
  }

  // Not found state
  if (!requirement) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '16px', color: '#faad14', marginBottom: '16px' }}>
          需求不存在
        </div>
        <div style={{ color: '#8c8c8c' }}>找不到请求的需求。</div>
        <Button type="primary" onClick={handleBack} style={{ marginTop: '16px' }}>
          返回需求列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: responsive.isMobile ? '12px' : '24px' }}>
      {/* 返回按钮 */}
      <div style={{ marginBottom: '16px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="large">
          返回需求列表
        </Button>
      </div>

      {/* 顶部标题栏 */}
      <RequirementDetailHeader
        requirement={requirement}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onReview={handleOpenReview}
        onConvert={handleOpenConvert}
        onLink={handleOpenLink}
        onArchive={handleArchive}
      />

      {/* 主内容区域 */}
      <RequirementDetailLayout
        content={
          <RequirementDetailContent
            requirement={requirement}
            linkedTasks={linkedTasks}
            loadingTasks={loadingTasks}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requirementId={requirementId}
          />
        }
        sidebar={
          <RequirementDetailSidebar
            requirement={requirement}
            linkedTasksCount={linkedTasks.length}
            onConvert={handleOpenConvert}
            onCopyLink={handleCopyLink}
            onExportPDF={handleExportPDF}
            onPrint={handlePrint}
            onEditTags={handleOpenTagsModal}
            onPreviewAttachment={handlePreviewAttachment}
          />
        }
      />

      {/* 评审对话框 */}
      <RequirementReviewModal
        visible={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        onSuccess={() => {
          setReviewModalVisible(false);
          loadRequirement();
        }}
        requirement={requirement}
        loading={reviewLoading}
        onSubmit={handleReviewSubmit}
      />

      {/* 转换为任务对话框 */}
      <ConvertToTaskModal
        visible={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        onSuccess={handleConvertSuccess}
        requirement={requirement}
        loading={convertLoading}
        onSubmit={handleConvertSubmit}
      />

      {/* 关联已有任务对话框 */}
      <LinkTaskModal
        visible={linkModalVisible}
        onCancel={() => setLinkModalVisible(false)}
        onSuccess={handleLinkSuccess}
        requirement={requirement}
        loading={linkLoading}
        onSubmit={handleLinkSubmit}
      />

      {/* 附件预览对话框 */}
      <Modal
        title={previewType === 'image' ? '图片预览' : 'PDF预览'}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={previewType === 'image' ? 800 : 1000}
        centered
        destroyOnClose
      >
        {previewType === 'image' ? (
          <div style={{ textAlign: 'center' }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          </div>
        ) : (
          <iframe
            src={previewUrl}
            title="PDF Preview"
            style={{
              width: '100%',
              height: '70vh',
              border: 'none'
            }}
          />
        )}
      </Modal>

      {/* 标签编辑对话框 */}
      <Modal
        title="编辑标签"
        open={tagsModalVisible}
        onCancel={() => setTagsModalVisible(false)}
        onOk={handleSaveTags}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', color: '#8c8c8c' }}>添加标签</div>
          <Input.Group compact style={{ display: 'flex' }}>
            <Input
              placeholder="输入标签名称"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onPressEnter={handleAddTag}
              style={{ flex: 1 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTag}>
              添加
            </Button>
          </Input.Group>
        </div>

        <div>
          <div style={{ marginBottom: '8px', color: '#8c8c8c' }}>当前标签</div>
          <div style={{ minHeight: '60px', padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
            {editingTags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {editingTags.map((tag, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      background: '#1890ff',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <span>{tag}</span>
                    <CloseOutlined
                      style={{ marginLeft: '8px', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#bfbfbf' }}>
                暂无标签，请添加
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RequirementDetailPage;
