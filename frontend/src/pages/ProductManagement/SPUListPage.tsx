import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Image,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SPUListItem, SPUFilter } from '../../types/product';
import {
  listSPUsWithStats,
  deleteSPU,
  getSPUStatusText,
  getSPUStatusColor,
  formatStock,
} from '../../services/productService';
import styles from './SPUListPage.module.css';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface SPUListPageProps {}

const SPUListPage: React.FC<SPUListPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [spuList, setSPUList] = useState<SPUListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [brandFilter, setBrandFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载数据
  const fetchSPUList = async () => {
    setLoading(true);
    try {
      const filter: SPUFilter = {
        page: currentPage,
        page_size: pageSize,
        search: searchText || undefined,
        status: statusFilter,
        brand: brandFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await listSPUsWithStats(filter);
      setSPUList(response.data);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.response?.data?.error || '加载SPU列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和条件变化时重新加载
  useEffect(() => {
    fetchSPUList();
  }, [currentPage, pageSize, statusFilter, brandFilter, sortBy, sortOrder]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 执行搜索
  const executeSearch = () => {
    fetchSPUList();
  };

  // 重置筛选
  const handleReset = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setBrandFilter(undefined);
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // 删除SPU
  const handleDelete = async (id: number) => {
    try {
      await deleteSPU(id);
      message.success('删除成功');
      fetchSPUList();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  // 表格分页配置
  const pagination: TablePaginationConfig = {
    current: currentPage,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange: (page, size) => {
      setCurrentPage(page);
      setPageSize(size || 10);
    },
  };

  // 表格列定义
  const columns: ColumnsType<SPUListItem> = [
    {
      title: '商品图片',
      dataIndex: 'main_image',
      key: 'main_image',
      width: 100,
      render: (image: string) =>
        image ? (
          <Image
            src={image}
            alt="SPU"
            width={60}
            height={60}
            style={{ objectFit: 'cover' }}
            preview={true}
          />
        ) : (
          <div className={styles.noImage}>暂无图片</div>
        ),
    },
    {
      title: 'SPU编码',
      dataIndex: 'spu_code',
      key: 'spu_code',
      width: 150,
      sorter: true,
      render: (code: string) => <span className={styles.spuCode}>{code}</span>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: true,
      render: (name: string) => <span className={styles.spuName}>{name}</span>,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
      render: (brand: string) => brand || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getSPUStatusColor(status)}>{getSPUStatusText(status)}</Tag>
      ),
    },
    {
      title: 'SKU数量',
      dataIndex: 'sku_count',
      key: 'sku_count',
      width: 100,
      align: 'right',
      sorter: true,
      render: (count: number) => <span className={styles.skuCount}>{count}</span>,
    },
    {
      title: '总库存',
      dataIndex: 'total_stock',
      key: 'total_stock',
      width: 100,
      align: 'right',
      sorter: true,
      render: (stock: number) => (
        <span className={styles.totalStock}>{formatStock(stock)}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后将无法恢复，确定要删除这个SPU吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 查看详情
  const handleView = (id: number) => {
    // TODO: 导航到详情页
    message.info(`查看SPU详情: ${id}`);
  };

  // 编辑SPU
  const handleEdit = (id: number) => {
    // TODO: 导航到编辑页
    message.info(`编辑SPU: ${id}`);
  };

  // 新建SPU
  const handleCreate = () => {
    // TODO: 导航到创建页
    message.info('创建新SPU');
  };

  // 表格排序变化
  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: any,
    sorter: any
  ) => {
    if (sorter.field) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <Title level={4}>SPU商品管理</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建SPU
          </Button>
        </div>

        {/* 筛选区域 */}
        <div className={styles.filterSection}>
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="搜索SPU编码、商品名称"
                allowClear
                enterButton={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={executeSearch}
                onPressEnter={executeSearch}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="draft">草稿</Option>
                <Option value="active">上架</Option>
                <Option value="inactive">下架</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Input
                placeholder="品牌筛选"
                allowClear
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value || undefined)}
              />
            </Col>
            <Col span={8}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button type="primary" onClick={executeSearch}>
                  查询
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={spuList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          className={styles.table}
        />
      </Card>
    </div>
  );
};

export default SPUListPage;
