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
  Form,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
  Checkbox,
  Drawer,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SaveOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
// ✅ FIXED - Import TablePaginationConfig from antd, not antd/es/table (TS2305)
import type { TablePaginationConfig } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SKUWithDetails, SKUFilter, SKUBatchUpdateRequest } from '../../types/product';
import {
  listSKUsWithDetails,
  deleteSKU,
  batchUpdateSKUs,
  formatPrice,
  formatStock,
  isLowStock,
} from '../../services/productService';
import styles from './SKUListPage.module.css';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface SKUListPageProps {}

const SKUListPage: React.FC<SKUListPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [skuList, setSKUList] = useState<SKUWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [spuIdFilter, setSpuIdFilter] = useState<number | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // 批量编辑
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchEditDrawerVisible, setBatchEditDrawerVisible] = useState(false);
  const [batchEditForm] = Form.useForm();

  // 加载数据
  const fetchSKUList = async () => {
    setLoading(true);
    try {
      const filter: SKUFilter = {
        page: currentPage,
        page_size: pageSize,
        search: searchText || undefined,
        status: statusFilter,
        spu_id: spuIdFilter,
        min_price: minPrice,
        max_price: maxPrice,
        low_stock: lowStockOnly || undefined,
      };

      const response = await listSKUsWithDetails(filter);
      setSKUList(response.data);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.response?.data?.error || '加载SKU列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSKUList();
  }, [currentPage, pageSize, statusFilter, spuIdFilter, lowStockOnly]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const executeSearch = () => {
    fetchSKUList();
  };

  // 重置筛选
  const handleReset = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setSpuIdFilter(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setLowStockOnly(false);
    setCurrentPage(1);
  };

  // 删除SKU
  const handleDelete = async (id: number) => {
    try {
      await deleteSKU(id);
      message.success('删除成功');
      fetchSKUList();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  // 批量编辑
  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的SKU');
      return;
    }
    setBatchEditDrawerVisible(true);
  };

  // 提交批量编辑
  const handleBatchEditSubmit = async () => {
    try {
      const values = await batchEditForm.validateFields();

      const updateData: SKUBatchUpdateRequest = {
        skus: selectedRowKeys.map((id) => ({
          id: Number(id),
          ...values,
        })),
      };

      await batchUpdateSKUs(updateData);
      message.success(`成功更新 ${selectedRowKeys.length} 个SKU`);
      setBatchEditDrawerVisible(false);
      batchEditForm.resetFields();
      setSelectedRowKeys([]);
      fetchSKUList();
    } catch (error: any) {
      message.error(error.response?.data?.error || '批量更新失败');
    }
  };

  // 取消批量编辑
  const handleBatchEditCancel = () => {
    setBatchEditDrawerVisible(false);
    batchEditForm.resetFields();
  };

  // 表格选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
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
  const columns: ColumnsType<SKUWithDetails> = [
    {
      title: 'SKU编码',
      dataIndex: 'sku_code',
      key: 'sku_code',
      width: 150,
      fixed: 'left',
      render: (code: string) => <span className={styles.skuCode}>{code}</span>,
    },
    {
      title: 'SKU名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <span className={styles.skuName}>{name}</span>,
    },
    {
      title: '所属SPU',
      dataIndex: ['spu', 'name'],
      key: 'spu_name',
      width: 180,
      render: (spuName: string) => spuName || '-',
    },
    {
      title: '销售价',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'right',
      render: (price: number) => (
        <span className={styles.price}>{formatPrice(price)}</span>
      ),
    },
    {
      title: '成本价',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      align: 'right',
      render: (cost: number) => (cost ? formatPrice(cost) : '-'),
    },
    {
      title: '市场价',
      dataIndex: 'market_price',
      key: 'market_price',
      width: 120,
      align: 'right',
      render: (market: number) => (market ? formatPrice(market) : '-'),
    },
    {
      title: '可用库存',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      width: 100,
      align: 'right',
      render: (qty: number, record) => {
        const isLow = isLowStock(qty, record.stock_alert_threshold);
        return (
          <span className={isLow ? styles.lowStock : styles.normalStock}>
            {formatStock(qty || 0)}
            {isLow && <Tag color="error" style={{ marginLeft: 4 }}>低库存</Tag>}
          </span>
        );
      },
    },
    {
      title: '锁定库存',
      dataIndex: 'locked_quantity',
      key: 'locked_quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => formatStock(qty || 0),
    },
    {
      title: '总库存',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => (
        <span className={styles.totalQty}>{formatStock(qty || 0)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          draft: 'default',
          active: 'success',
          inactive: 'error',
        };
        const textMap: Record<string, string> = {
          draft: '草稿',
          active: '上架',
          inactive: '下架',
        };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
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
            description="确定要删除这个SKU吗？"
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

  const handleView = (id: number) => {
    message.info(`查看SKU详情: ${id}`);
  };

  const handleEdit = (id: number) => {
    message.info(`编辑SKU: ${id}`);
  };

  const handleCreate = () => {
    message.info('创建新SKU');
  };

  const handleBatchCreate = () => {
    message.info('批量创建SKU');
  };

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <Title level={4}>SKU库存管理</Title>
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleCreate}>
              新建SKU
            </Button>
            <Button
              type="primary"
              icon={<AppstoreAddOutlined />}
              onClick={handleBatchCreate}
            >
              批量创建
            </Button>
          </Space>
        </div>

        {/* 筛选区域 */}
        <div className={styles.filterSection}>
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="搜索SKU编码、名称、条形码"
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
              <InputNumber
                placeholder="最低价格"
                style={{ width: '100%' }}
                value={minPrice}
                onChange={(val) => setMinPrice(val || undefined)}
                min={0}
                precision={2}
              />
            </Col>
            <Col span={4}>
              <InputNumber
                placeholder="最高价格"
                style={{ width: '100%' }}
                value={maxPrice}
                onChange={(val) => setMaxPrice(val || undefined)}
                min={0}
                precision={2}
              />
            </Col>
            <Col span={4}>
              <Space>
                <Checkbox
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                >
                  仅低库存
                </Checkbox>
              </Space>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={24}>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button type="primary" onClick={executeSearch}>
                  查询
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={handleBatchEdit}
                  >
                    批量编辑 ({selectedRowKeys.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={skuList}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          rowSelection={rowSelection}
          scroll={{ x: 1800 }}
          className={styles.table}
        />
      </Card>

      {/* 批量编辑抽屉 */}
      <Drawer
        title={`批量编辑 (已选择 ${selectedRowKeys.length} 个SKU)`}
        width={500}
        open={batchEditDrawerVisible}
        onClose={handleBatchEditCancel}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={handleBatchEditCancel}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleBatchEditSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={batchEditForm} layout="vertical">
          <Form.Item
            label="销售价格"
            name="price"
            help="留空表示不修改"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="销售价格"
              prefix="¥"
            />
          </Form.Item>

          <Form.Item
            label="成本价格"
            name="cost_price"
            help="留空表示不修改"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="成本价格"
              prefix="¥"
            />
          </Form.Item>

          <Form.Item
            label="市场价格"
            name="market_price"
            help="留空表示不修改"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="市场价格"
              prefix="¥"
            />
          </Form.Item>

          <Divider />

          <Form.Item
            label="库存预警阈值"
            name="stock_alert_threshold"
            help="留空表示不修改"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="库存预警阈值"
            />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            help="留空表示不修改"
          >
            <Select placeholder="选择状态" allowClear>
              <Option value="draft">草稿</Option>
              <Option value="active">上架</Option>
              <Option value="inactive">下架</Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default SKUListPage;
