import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Breadcrumb,
  Button,
  message,
  Alert,
  Statistic,
  Affix
} from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import EnhancedSearchInterface from '../components/EnhancedSearchInterface';
import { searchService, SearchResult, SearchStats } from '../services/searchService';

const { Title, Text } = Typography;

interface SearchResultsPageProps {
  // 可选的项目ID，用于项目内搜索
  projectId?: number;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ projectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 状态管理
  const [initialQuery, setInitialQuery] = useState('');
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);

  // 从URL参数获取初始搜索查询
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q') || '';
    setInitialQuery(query);
    
    // 如果有查询参数，加载搜索统计
    if (query) {
      loadSearchStats();
    }
  }, [location.search]);

  // 加载搜索统计
  const loadSearchStats = async () => {
    try {
      const stats = await searchService.getSearchStats();
      setSearchStats(stats);
    } catch (error) {
      console.error('加载搜索统计失败:', error);
    }
  };

  // 处理搜索结果选择
  const handleResultSelect = (result: SearchResult) => {
    // 根据结果类型导航到相应页面
    switch (result.type) {
      case 'document':
        navigate(`/documents/${result.id}`);
        break;
      case 'task':
        if (result.project_id) {
          navigate(`/projects/${result.project_id}/tasks/${result.id}`);
        } else {
          navigate(`/tasks/${result.id}`);
        }
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'user':
        navigate(`/users/${result.id}`);
        break;
      default:
        // 如果有URL，直接打开
        if (result.url) {
          if (result.url.startsWith('http')) {
            window.open(result.url, '_blank');
          } else {
            navigate(result.url);
          }
        }
    }
  };

  // 导出搜索结果
  const handleExportResults = async () => {
    if (!initialQuery) {
      message.warning('请先进行搜索');
      return;
    }

    setLoading(true);
    try {
      const blob = await searchService.exportSearchResults(
        { query: initialQuery },
        'csv'
      );
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search-results-${initialQuery}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('搜索结果导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 面包屑导航
  const breadcrumbItems = [
    {
      title: (
        <Space>
          <HomeOutlined />
          <span>首页</span>
        </Space>
      ),
      href: '/'
    },
    ...(projectId ? [
      {
        title: (
          <Space>
            <BookOutlined />
            <span>项目</span>
          </Space>
        ),
        href: `/projects/${projectId}`
      }
    ] : []),
    {
      title: (
        <Space>
          <SearchOutlined />
          <span>搜索结果</span>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* 面包屑导航 */}
      <Card  style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Breadcrumb items={breadcrumbItems} />
          </Col>
          <Col>
            <Space>
              {initialQuery && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportResults}
                  loading={loading}
                  
                >
                  导出结果
                </Button>
              )}
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate('/search/settings')}
                
              >
                搜索设置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 页面标题 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" >
              <Title level={2} style={{ margin: 0 }}>
                <SearchOutlined style={{ marginRight: 8 }} />
                {projectId ? '项目内搜索' : '全局搜索'}
              </Title>
              {initialQuery && (
                <Text type="secondary">
                  搜索关键词: <Text code>{initialQuery}</Text>
                </Text>
              )}
            </Space>
          </Col>
          
          {/* 搜索统计 */}
          {searchStats && (
            <Col>
              <Row gutter={16}>
                <Col>
                  <Statistic
                    title="总搜索次数"
                    value={searchStats.total_searches}
                    prefix={<SearchOutlined />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col>
                  <Statistic
                    title="平均结果数"
                    value={searchStats.avg_results}
                    precision={1}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </Col>
          )}
        </Row>

        {/* 热门搜索提示 */}
        {searchStats && searchStats.most_searched.length > 0 && (
          <Alert
            message="热门搜索"
            description={
              <Space wrap>
                <Text type="secondary">热门关键词:</Text>
                {searchStats.most_searched.map(keyword => (
                  <Button
                    key={keyword}
                    type="link"
                    
                    onClick={() => {
                      const newUrl = `${location.pathname}?q=${encodeURIComponent(keyword)}`;
                      navigate(newUrl);
                    }}
                  >
                    {keyword}
                  </Button>
                ))}
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ marginTop: 16 }}
            closable
          />
        )}
      </Card>

      {/* 搜索界面 */}
      <EnhancedSearchInterface
        mode="standalone"
        projectId={projectId}
        onResultSelect={handleResultSelect}
        initialQuery={initialQuery}
      />

      {/* 搜索帮助 */}
      <Affix offsetBottom={24}>
        <Card
          
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 300,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
          title="搜索帮助"
          extra={
            <Button
              type="text"
              
              onClick={() => {
                const card = document.querySelector('.search-help-card') as HTMLElement;
                if (card) {
                  card.style.display = card.style.display === 'none' ? 'block' : 'none';
                }
              }}
            >
              ×
            </Button>
          }
          className="search-help-card"
        >
          <Space direction="vertical"  style={{ width: '100%' }}>
            <div>
              <Text strong>搜索技巧:</Text>
            </div>
            
            <div>
              <Text code>type:document</Text>
              <Text type="secondary"> - 仅搜索文档</Text>
            </div>
            
            <div>
              <Text code>status:published</Text>
              <Text type="secondary"> - 已发布内容</Text>
            </div>
            
            <div>
              <Text code>"完整短语"</Text>
              <Text type="secondary"> - 精确匹配</Text>
            </div>
            
            <div>
              <Text code>title:关键词</Text>
              <Text type="secondary"> - 仅搜索标题</Text>
            </div>
            
            <div>
              <Text code>created:today</Text>
              <Text type="secondary"> - 今天创建</Text>
            </div>
            
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                按 <Text keyboard>Ctrl+K</Text> 快速搜索
              </Text>
            </div>
          </Space>
        </Card>
      </Affix>
    </div>
  );
};

export default SearchResultsPage;