import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Spin, Alert, Layout, Typography, Space, Tag, Tooltip, message } from 'antd';
import {
  CloseOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  ShareAltOutlined,
  PrinterOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import MarkdownRenderer from '../components/MarkdownRenderer';
import WorkNoteTableOfContents from '../components/WorkNoteTableOfContents';
import { workNotesService, WorkNote } from '../services/workNotesService';
import '../styles/WorkNoteViewPage.css';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

/**
 * 工作笔记全屏查看页面
 *
 * 路由: /work-note/:noteId
 *
 * 功能:
 * - 全屏显示笔记内容
 * - Markdown 渲染和代码高亮
 * - 目录导航
 * - 编辑、分享、打印等操作
 * - 键盘快捷键支持
 */
const WorkNoteViewPage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [note, setNote] = useState<WorkNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 从URL参数获取返回地址
  const returnUrl = searchParams.get('return') || '/work-note';

  // 加载笔记数据
  useEffect(() => {
    const loadNote = async () => {
      if (!noteId) {
        setError('缺少笔记ID参数');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const noteData = await workNotesService.getWorkNote(parseInt(noteId));
        setNote(noteData);

        // 设置页面标题
        document.title = `${noteData.title} - 工作笔记`;
      } catch (err: any) {
        console.error('加载笔记失败:', err);
        setError(`加载笔记失败: ${err.message || '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [noteId]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC: 关闭
      if (event.key === 'Escape') {
        handleClose();
      }
      // Ctrl/Cmd + P: 打印
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 关闭页面
  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate(returnUrl);
    }
  };

  // 返回列表
  const handleGoBack = () => {
    navigate(returnUrl);
  };

  // 编辑笔记
  const handleEdit = () => {
    // 返回列表页并打开编辑对话框
    navigate(returnUrl, { state: { editNoteId: noteId } });
  };

  // 分享链接
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      message.success('链接已复制到剪贴板');
    } catch (error) {
      message.error('复制链接失败');
    }
  };

  // 打印
  const handlePrint = () => {
    window.print();
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 获取状态标签配置
  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'success', text: '已发布' },
      archived: { color: 'warning', text: '已归档' }
    };
    return configs[status] || { color: 'default', text: status };
  };

  // 获取可见性标签配置
  const getVisibilityTag = (visibility: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      private: { color: 'blue', text: '私有' },
      team: { color: 'green', text: '团队' },
      public: { color: 'orange', text: '公开' }
    };
    return configs[visibility] || { color: 'default', text: visibility };
  };

  // 错误页面
  if (error) {
    return (
      <div className="work-note-view-error">
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={() => window.location.reload()}>
                重试
              </Button>
              <Button size="small" type="primary" onClick={handleGoBack}>
                返回
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  // 加载中页面
  if (loading || !note) {
    return (
      <div className="work-note-view-loading">
        <Spin size="large" tip="正在加载笔记..." />
      </div>
    );
  }

  const statusTag = getStatusTag(note.status);
  const visibilityTag = getVisibilityTag(note.visibility);

  return (
    <Layout className="work-note-view-page">
      {/* 顶部工具栏 */}
      <div className="work-note-toolbar">
        <div className="toolbar-left">
          <Tooltip title="返回 (ESC)">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleGoBack}
            />
          </Tooltip>
          <div className="toolbar-title">
            <Title level={4} style={{ margin: 0 }}>
              {note.title}
            </Title>
            <Space size={8} style={{ marginLeft: 12 }}>
              <Tag color={statusTag.color}>{statusTag.text}</Tag>
              <Tag color={visibilityTag.color}>{visibilityTag.text}</Tag>
              {note.tags && note.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>
        </div>

        <div className="toolbar-right">
          <Space>
            <Tooltip title="折叠/展开目录">
              <Button
                type="text"
                icon={tocCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setTocCollapsed(!tocCollapsed)}
              />
            </Tooltip>
            <Tooltip title="全屏 (F11)">
              <Button
                type="text"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>
            <Tooltip title="编辑笔记">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={handleEdit}
              />
            </Tooltip>
            <Tooltip title="分享链接">
              <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
              />
            </Tooltip>
            <Tooltip title="打印 (Ctrl+P)">
              <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
              />
            </Tooltip>
            <Tooltip title="关闭 (ESC)">
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleClose}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        {/* 主内容区 */}
        <Content className="work-note-content">
          <div className="work-note-markdown-container">
            {/* 笔记元信息 */}
            <div className="work-note-meta">
              <Space split="|" size="large">
                <Text type="secondary">
                  ID: #{note.id}
                </Text>
                <Text type="secondary">
                  创建于: {new Date(note.created_at).toLocaleString('zh-CN')}
                </Text>
                <Text type="secondary">
                  更新于: {new Date(note.updated_at).toLocaleString('zh-CN')}
                </Text>
                {note.description && (
                  <Text type="secondary">
                    {note.description}
                  </Text>
                )}
              </Space>
            </div>

            {/* Markdown 内容 */}
            <MarkdownRenderer
              content={note.content}
              className="work-note-markdown"
            />
          </div>
        </Content>

        {/* 右侧目录 */}
        {!tocCollapsed && (
          <Sider
            width={280}
            className="work-note-toc-sider"
            theme="light"
          >
            <WorkNoteTableOfContents
              content={note.content}
              style={{ height: '100%' }}
            />
          </Sider>
        )}
      </Layout>
    </Layout>
  );
};

export default WorkNoteViewPage;
