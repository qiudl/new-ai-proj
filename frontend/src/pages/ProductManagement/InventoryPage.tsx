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
  Row,
  Col,
  Typography,
  Tabs,
  DatePicker,
  Divider,
  Statistic,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
// ✅ FIXED - Import TablePaginationConfig from antd, not antd/es/table (TS2305)
import type { TablePaginationConfig } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import {
  InventoryRecordResponse,
  InventoryTransactionResponse,
  InventoryFilter,
  TransactionFilter,
  InventoryInRequest,
  InventoryOutRequest,
  InventoryAdjustRequest,
  InventoryLockRequest,
  InventoryUnlockRequest,
} from '../../types/product';
import {
  listInventoryRecords,
  getTransactionHistory,
  inventoryIn,
  inventoryOut,
  adjustInventory,
  lockInventory,
  unlockInventory,
  formatStock,
  getTransactionTypeText,
  getTransactionTypeColor,
} from '../../services/productService';
import styles from './InventoryPage.module.css';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface InventoryPageProps {}

const InventoryPage: React.FC<InventoryPageProps> = () => {
  // 库存记录
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryList, setInventoryList] = useState<InventoryRecordResponse[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(10);
  const [inventorySkuId, setInventorySkuId] = useState<number | undefined>(undefined);
  const [inventoryWarehouseId, setInventoryWarehouseId] = useState<number | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // 交易历史
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionList, setTransactionList] = useState<InventoryTransactionResponse[]>([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(10);
  const [transactionSkuId, setTransactionSkuId] = useState<number | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // 操作弹窗
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationType, setOperationType] = useState<'in' | 'out' | 'adjust' | 'lock' | 'unlock'>('in');
  const [operationForm] = Form.useForm();

  // 加载库存记录
  const fetchInventoryRecords = async () => {
    setInventoryLoading(true);
    try {
      const filter: InventoryFilter = {
        page: inventoryPage,
        page_size: inventoryPageSize,
        sku_id: inventorySkuId,
        warehouse_id: inventoryWarehouseId,
        low_stock: lowStockOnly || undefined,
      };

      const response = await listInventoryRecords(filter);
      setInventoryList(response.data);
      setInventoryTotal(response.total);
    } catch (error: any) {
      message.error(error.response?.data?.error || '加载库存记录失败');
    } finally {
      setInventoryLoading(false);
    }
  };

  // 加载交易历史
  const fetchTransactionHistory = async () => {
    setTransactionLoading(true);
    try {
      const filter: TransactionFilter = {
        page: transactionPage,
        page_size: transactionPageSize,
        sku_id: transactionSkuId,
        transaction_type: transactionType,
        start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const response = await getTransactionHistory(filter);
      setTransactionList(response.data);
      setTransactionTotal(response.total);
    } catch (error: any) {
      message.error(error.response?.data?.error || '加载交易历史失败');
    } finally {
      setTransactionLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryRecords();
  }, [inventoryPage, inventoryPageSize, inventorySkuId, inventoryWarehouseId, lowStockOnly]);

  useEffect(() => {
    fetchTransactionHistory();
  }, [transactionPage, transactionPageSize, transactionSkuId, transactionType, dateRange]);

  // 库存记录列定义
  const inventoryColumns: ColumnsType<InventoryRecordResponse> = [
    {
      title: 'SKU编码',
      dataIndex: 'sku_code',
      key: 'sku_code',
      width: 150,
      render: (code: string) => <span className={styles.skuCode}>{code}</span>,
    },
    {
      title: 'SKU名称',
      dataIndex: 'sku_name',
      key: 'sku_name',
      width: 200,
    },
    {
      title: '可用库存',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      width: 120,
      align: 'right',
      render: (qty: number) => (
        <span className={styles.availableQty}>{formatStock(qty)}</span>
      ),
    },
    {
      title: '锁定库存',
      dataIndex: 'locked_quantity',
      key: 'locked_quantity',
      width: 120,
      align: 'right',
      render: (qty: number) => (
        <span className={styles.lockedQty}>{formatStock(qty)}</span>
      ),
    },
    {
      title: '总库存',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 120,
      align: 'right',
      render: (qty: number) => (
        <span className={styles.totalQty}>{formatStock(qty)}</span>
      ),
    },
    {
      title: '最后入库',
      dataIndex: 'last_in_date',
      key: 'last_in_date',
      width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最后出库',
      dataIndex: 'last_out_date',
      key: 'last_out_date',
      width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最后盘点',
      dataIndex: 'last_check_date',
      key: 'last_check_date',
      width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => handleOpenOperation('in', record.sku_id)}
          >
            入库
          </Button>
          <Button
            type="link"
            size="small"
            icon={<MinusCircleOutlined />}
            onClick={() => handleOpenOperation('out', record.sku_id)}
          >
            出库
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenOperation('adjust', record.sku_id)}
          >
            盘点
          </Button>
          <Button
            type="link"
            size="small"
            icon={<LockOutlined />}
            onClick={() => handleOpenOperation('lock', record.sku_id)}
          >
            锁定
          </Button>
          <Button
            type="link"
            size="small"
            icon={<UnlockOutlined />}
            onClick={() => handleOpenOperation('unlock', record.sku_id)}
          >
            解锁
          </Button>
        </Space>
      ),
    },
  ];

  // 交易历史列定义
  const transactionColumns: ColumnsType<InventoryTransactionResponse> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: 'SKU编码',
      dataIndex: 'sku_code',
      key: 'sku_code',
      width: 150,
      render: (code: string) => <span className={styles.skuCode}>{code}</span>,
    },
    {
      title: 'SKU名称',
      dataIndex: 'sku_name',
      key: 'sku_name',
      width: 200,
    },
    {
      title: '操作类型',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTransactionTypeColor(type)}>
          {getTransactionTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '变动数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number, record) => {
        const isPositive = ['in', 'unlock', 'return'].includes(record.transaction_type);
        return (
          <span className={isPositive ? styles.positiveQty : styles.negativeQty}>
            {isPositive ? '+' : '-'}{formatStock(Math.abs(qty))}
          </span>
        );
      },
    },
    {
      title: '变动前',
      dataIndex: 'before_quantity',
      key: 'before_quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => formatStock(qty),
    },
    {
      title: '变动后',
      dataIndex: 'after_quantity',
      key: 'after_quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => formatStock(qty),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '原因/备注',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (reason: string) => reason || '-',
    },
  ];

  // 打开操作弹窗
  const handleOpenOperation = (type: typeof operationType, skuId: number) => {
    setOperationType(type);
    operationForm.setFieldsValue({ sku_id: skuId });
    setOperationModalVisible(true);
  };

  // 提交操作
  const handleOperationSubmit = async () => {
    try {
      const values = await operationForm.validateFields();

      switch (operationType) {
        case 'in':
          await inventoryIn(values as InventoryInRequest);
          message.success('入库成功');
          break;
        case 'out':
          await inventoryOut(values as InventoryOutRequest);
          message.success('出库成功');
          break;
        case 'adjust':
          await adjustInventory(values as InventoryAdjustRequest);
          message.success('盘点调整成功');
          break;
        case 'lock':
          await lockInventory(values as InventoryLockRequest);
          message.success('库存锁定成功');
          break;
        case 'unlock':
          await unlockInventory(values as InventoryUnlockRequest);
          message.success('库存解锁成功');
          break;
      }

      setOperationModalVisible(false);
      operationForm.resetFields();
      fetchInventoryRecords();
      fetchTransactionHistory();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  // 操作弹窗标题
  const getOperationTitle = () => {
    const titles = {
      in: '入库',
      out: '出库',
      adjust: '盘点调整',
      lock: '锁定库存',
      unlock: '解锁库存',
    };
    return titles[operationType];
  };

  return (
    <div className={styles.container}>
      <Card>
        <Title level={4}>库存管理</Title>

        <Tabs defaultActiveKey="records">
          <TabPane tab="库存记录" key="records">
            <div className={styles.filterSection}>
              <Row gutter={16}>
                <Col span={6}>
                  <InputNumber
                    placeholder="SKU ID"
                    style={{ width: '100%' }}
                    value={inventorySkuId}
                    onChange={(val) => setInventorySkuId(val || undefined)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="仅显示低库存"
                    allowClear
                    style={{ width: '100%' }}
                    value={lowStockOnly ? 'true' : undefined}
                    onChange={(val) => setLowStockOnly(val === 'true')}
                  >
                    <Option value="true">仅低库存</Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setInventorySkuId(undefined);
                        setInventoryWarehouseId(undefined);
                        setLowStockOnly(false);
                      }}
                    >
                      重置
                    </Button>
                    <Button type="primary" onClick={fetchInventoryRecords}>
                      查询
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <Table
              columns={inventoryColumns}
              dataSource={inventoryList}
              rowKey={(record) => `${record.sku_id}-${record.warehouse_id || 0}`}
              loading={inventoryLoading}
              pagination={{
                current: inventoryPage,
                pageSize: inventoryPageSize,
                total: inventoryTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, size) => {
                  setInventoryPage(page);
                  setInventoryPageSize(size || 10);
                },
              }}
              scroll={{ x: 1600 }}
            />
          </TabPane>

          <TabPane tab={<span><HistoryOutlined /> 交易历史</span>} key="transactions">
            <div className={styles.filterSection}>
              <Row gutter={16}>
                <Col span={6}>
                  <InputNumber
                    placeholder="SKU ID"
                    style={{ width: '100%' }}
                    value={transactionSkuId}
                    onChange={(val) => setTransactionSkuId(val || undefined)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="操作类型"
                    allowClear
                    style={{ width: '100%' }}
                    value={transactionType}
                    onChange={setTransactionType}
                  >
                    <Option value="in">入库</Option>
                    <Option value="out">出库</Option>
                    <Option value="adjust">调整</Option>
                    <Option value="lock">锁定</Option>
                    <Option value="unlock">解锁</Option>
                    <Option value="return">退货</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder={['开始日期', '结束日期']}
                  />
                </Col>
                <Col span={4}>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setTransactionSkuId(undefined);
                        setTransactionType(undefined);
                        setDateRange(null);
                      }}
                    >
                      重置
                    </Button>
                    <Button type="primary" onClick={fetchTransactionHistory}>
                      查询
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <Table
              columns={transactionColumns}
              dataSource={transactionList}
              rowKey="id"
              loading={transactionLoading}
              pagination={{
                current: transactionPage,
                pageSize: transactionPageSize,
                total: transactionTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, size) => {
                  setTransactionPage(page);
                  setTransactionPageSize(size || 10);
                },
              }}
              scroll={{ x: 1400 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 操作弹窗 */}
      <Modal
        title={getOperationTitle()}
        open={operationModalVisible}
        onOk={handleOperationSubmit}
        onCancel={() => {
          setOperationModalVisible(false);
          operationForm.resetFields();
        }}
        width={500}
      >
        <Form form={operationForm} layout="vertical">
          <Form.Item
            label="SKU ID"
            name="sku_id"
            rules={[{ required: true, message: '请输入SKU ID' }]}
          >
            <InputNumber style={{ width: '100%' }} disabled />
          </Form.Item>

          {operationType === 'adjust' ? (
            <Form.Item
              label="调整后数量"
              name="new_quantity"
              rules={[{ required: true, message: '请输入调整后的数量' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          ) : (
            <Form.Item
              label="数量"
              name="quantity"
              rules={[{ required: true, message: '请输入数量' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          )}

          <Form.Item label="原因/备注" name="reason">
            <TextArea rows={3} placeholder="请输入原因或备注" />
          </Form.Item>

          <Form.Item label="仓库ID" name="warehouse_id">
            <InputNumber style={{ width: '100%' }} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
