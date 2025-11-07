/**
 * 关联已有任务对话框组件
 * Link Existing Task Modal Component
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Select,
  Alert,
  Table,
  Space,
  Tag,
  Radio,
  Divider,
  Empty,
  Spin,
} from 'antd';
import {
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Requirement } from '../types/requirement';
import { RequirementTaskLinkType } from '../services/requirementService';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import debounce from 'lodash/debounce';
import { useResponsive, getResponsiveModalWidth } from '../hooks/useResponsive';

const { TextArea } = Input;

/**
 * 关联类型配置
 */
const LINK_TYPE_CONFIG = {
  manual: {
    label: '手动关联',
    color: 'blue',
    description: '手动建立需求与任务的关联关系',
  },
  related: {
    label: '相关任务',
    color: 'cyan',
    description: '标记为相关任务，但不是直接转换关系',
  },
};

export interface LinkTaskModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  requirement: Requirement | null;
  loading?: boolean;
  onSubmit: (taskId: number, linkType: RequirementTaskLinkType, linkComment?: string) => Promise<void>;
}

/**
 * 关联已有任务对话框组件
 */
const LinkTaskModal: React.FC<LinkTaskModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  requirement,
  loading = false,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const responsive = useResponsive();
  const [linkType, setLinkType] = useState<RequirementTaskLinkType>(RequirementTaskLinkType.Manual);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  /**
   * 搜索任务（防抖）
   */
  const searchTasks = useCallback(
    debounce(async (keyword: string) => {
      if (!keyword || !requirement?.project_id) {
        setTasks([]);
        return;
      }

      try {
        setLoadingTasks(true);
        const response = await TaskService.getTasks(requirement.project_id, {
          search: keyword,
          page: 1,
          // ✅ FIXED - Use page_size instead of pageSize (TS2561)
          page_size: 10,
        });
        setTasks(response.data || []);
      } catch (error) {
        console.error('Error searching tasks:', error);
        message.error('搜索任务失败');
        setTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    }, 500),
    [requirement]
  );

  /**
   * 处理搜索关键词变化
   */
  useEffect(() => {
    searchTasks(searchKeyword);
  }, [searchKeyword, searchTasks]);

  /**
   * 初始化表单
   */
  useEffect(() => {
    if (visible && requirement) {
      form.resetFields();
      setLinkType(RequirementTaskLinkType.Manual);
      setSearchKeyword('');
      setTasks([]);
      setSelectedTaskId(null);
    }
  }, [visible, requirement, form]);

  /**
   * 处理提交
   */
  const handleSubmit = async () => {
    if (!selectedTaskId) {
      message.warning('请选择要关联的任务');
      return;
    }

    try {
      const values = await form.validateFields();

      await onSubmit(selectedTaskId, linkType, values.link_comment);

      message.success('任务关联成功！');
      onSuccess();
    } catch (error: any) {
      if (error instanceof Error && !error.message.includes('async-validator')) {
        message.error(error.message || '关联任务失败，请重试');
      }
    }
  };

  /**
   * 任务表格列配置
   */
  const taskColumns: ColumnsType<Task> = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : 'processing'}>
          {status === 'completed' ? '已完成' : status === 'in_progress' ? '进行中' : '待办'}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1890ff' }} />
          <span>关联已有任务</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={getResponsiveModalWidth(750, responsive)}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<LinkOutlined />}
          disabled={!selectedTaskId}
        >
          关联
        </Button>,
      ]}
      destroyOnHidden
    >
      {requirement && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message={
              <div>
                <strong>需求编号:</strong> {requirement.display_id}
              </div>
            }
            description={
              <div>
                <strong>需求标题:</strong> {requirement.title}
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      <Form form={form} layout="vertical" requiredMark={false}>
        {/* 搜索任务 */}
        <Divider orientation="left" style={{ fontSize: '14px', margin: '8px 0' }}>
          搜索任务
        </Divider>

        <Input
          placeholder="输入任务标题搜索..."
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          allowClear
          style={{ marginBottom: '16px' }}
        />

        <Spin spinning={loadingTasks}>
          <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '16px' }}>
            {tasks.length === 0 ? (
              <Empty
                description={searchKeyword ? '未找到匹配的任务' : '请输入关键词搜索任务'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={tasks}
                columns={taskColumns}
                rowKey="id"
                pagination={false}
                size="small"
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedTaskId ? [selectedTaskId] : [],
                  onChange: (selectedRowKeys) => {
                    setSelectedTaskId(selectedRowKeys[0] as number);
                  },
                }}
                onRow={(record) => ({
                  onClick: () => {
                    setSelectedTaskId(record.id);
                  },
                })}
              />
            )}
          </div>
        </Spin>

        {/* 关联类型 */}
        <Divider orientation="left" style={{ fontSize: '14px', margin: '8px 0' }}>
          关联类型
        </Divider>

        <Radio.Group
          value={linkType}
          onChange={(e) => setLinkType(e.target.value)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value={RequirementTaskLinkType.Manual}>
              <Space>
                <Tag color={LINK_TYPE_CONFIG.manual.color}>
                  {LINK_TYPE_CONFIG.manual.label}
                </Tag>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {LINK_TYPE_CONFIG.manual.description}
                </span>
              </Space>
            </Radio>
            <Radio value={RequirementTaskLinkType.Related}>
              <Space>
                <Tag color={LINK_TYPE_CONFIG.related.color}>
                  {LINK_TYPE_CONFIG.related.label}
                </Tag>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {LINK_TYPE_CONFIG.related.description}
                </span>
              </Space>
            </Radio>
          </Space>
        </Radio.Group>

        {/* 关联备注 */}
        <Form.Item
          name="link_comment"
          label="关联备注"
          tooltip="说明为什么要关联这个任务"
        >
          <TextArea
            rows={3}
            placeholder="请输入关联备注（可选）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 提示信息 */}
        <Alert
          message={
            <div>
              <strong>提示：</strong>
              关联后，可以在需求详情的"关联任务"标签页查看
            </div>
          }
          type="info"
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default LinkTaskModal;
