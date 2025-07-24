import React, { useState, useEffect } from 'react';
import { message, Card, Space, Button } from 'antd';
import { FlexibleDataTable, FlexibleTableConfig } from '../components/FlexibleDataTable';
import type { FlexibleColumnConfig, ActionButton } from '../components/FlexibleDataTable';
import { DocumentService, DocumentListItem } from '../services/documentService';
import { EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';

const FlexibleTableTestPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 定义测试用的列配置
  const columns: FlexibleColumnConfig[] = [
    // 固定左侧核心字段
    FlexibleTableConfig.columnPresets.id({
      width: 80,
      render: (id: number) => (
        <span style={{ color: '#666', fontSize: '12px' }}>#{id}</span>
      ),
    }),

    FlexibleTableConfig.createLeftFixedColumn({
      key: 'title',
      title: '文档标题',
      dataIndex: 'title',
      width: 300,
      sortable: true,
      ellipsis: true,
      required: true,
      render: (title: string) => (
        <div style={{ fontWeight: 500, color: '#262626' }}>
          {title}
        </div>
      ),
    }),

    // 中间可移动字段
    FlexibleTableConfig.createColumn({
      key: 'project_name',
      title: '所属项目',
      dataIndex: 'project_name',
      width: 150,
      render: (projectName: string) => (
        <span style={{ color: '#1890ff' }}>{projectName}</span>
      ),
    }),

    FlexibleTableConfig.createColumn({
      key: 'creator_name',
      title: '创建者',
      dataIndex: 'creator_name',
      width: 120,
      sortable: true,
    }),

    FlexibleTableConfig.createColumn({
      key: 'content_size',
      title: '文件大小',
      dataIndex: 'content_size',
      width: 100,
      align: 'right',
      sortable: true,
      render: (size: number) => {
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
      },
    }),

    FlexibleTableConfig.createColumn({
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      sortable: true,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    }),

    FlexibleTableConfig.createColumn({
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 160,
      sortable: true,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    }),
  ];

  // 定义操作按钮
  const actions: ActionButton[] = [
    FlexibleTableConfig.createActionButton({
      key: 'view',
      title: '查看',
      icon: <EyeOutlined />,
      onClick: (record: DocumentListItem) => {
        message.info(`查看文档: ${record.title}`);
      },
    }),

    FlexibleTableConfig.createActionButton({
      key: 'edit',
      title: '编辑',
      icon: <EditOutlined />,
      onClick: (record: DocumentListItem) => {
        message.info(`编辑文档: ${record.title}`);
      },
    }),

    FlexibleTableConfig.createActionButton({
      key: 'delete',
      title: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (record: DocumentListItem) => {
        message.warning(`删除文档: ${record.title}`);
      },
    }),
  ];

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await DocumentService.getAllDocuments({
        page: 1,
        limit: 20,
        sort_by: 'updated_at',
        order: 'desc',
      });
      
      setDocuments(response.documents);
      setTotal(response.total);
    } catch (error) {
      message.error('加载数据失败');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title="FlexibleDataTable 测试页面" 
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadData}
            loading={loading}
          >
            刷新数据
          </Button>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h3>功能特性展示：</h3>
            <ul>
              <li>✅ 固定左侧核心字段（ID、标题）</li>
              <li>✅ 固定右侧操作区（查看、编辑、删除）</li>
              <li>✅ 中间字段支持拖拽排序</li>
              <li>✅ 表头排序功能</li>
              <li>✅ 列显示/隐藏控制</li>
              <li>✅ 列宽调整</li>
              <li>✅ 个性化配置存储</li>
              <li>✅ 搜索和筛选</li>
              <li>✅ 分页功能</li>
            </ul>
          </div>

          <FlexibleDataTable
            // 数据相关
            dataSource={documents}
            loading={loading}
            rowKey="id"
            
            // 列配置
            columns={columns}
            
            // 操作相关
            actions={actions}
            
            // 搜索配置
            searchConfig={FlexibleTableConfig.createSearchConfig({
              placeholder: '搜索文档标题...',
              searchFields: ['title', 'project_name'],
              onSearch: (value: string) => {
                console.log('搜索:', value);
                message.info(`搜索关键词: ${value}`);
              },
            })}
            
            // 分页配置
            paginationConfig={FlexibleTableConfig.createPaginationConfig({
              current: 1,
              pageSize: 20,
              total,
              onChange: (page: number, pageSize: number) => {
                console.log('分页变化:', page, pageSize);
                message.info(`切换到第 ${page} 页，每页 ${pageSize} 条`);
              },
            })}
            
            // 个性化配置存储
            configStorage={{
              key: 'flexible_table_test',
              saveColumns: true,
              savePagination: true,
              saveSort: true,
            }}
            
            // 导出配置
            exportConfig={{
              enable: true,
              formats: ['csv'],
              fileName: '文档列表',
              onExport: (format: string) => {
                message.success(`导出 ${format.toUpperCase()} 格式文件`);
              },
            }}
            
            // 样式配置
            size="middle"
            bordered
            scroll={{ x: 1200 }}
            
            // 表格标题
            title={() => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 500 }}>
                  FlexibleDataTable 功能演示
                </span>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  共 {total} 条记录
                </span>
              </div>
            )}
          />
        </Space>
      </Card>
    </div>
  );
};

export default FlexibleTableTestPage;