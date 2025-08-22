import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Form, Input, InputNumber, message, Select, Space } from 'antd';
import { TaskService } from '../services/taskService';

const { TextArea } = Input;

const BatchCascadePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = parseInt(projectId || '0');
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: any) => {
    if (!projectIdNum) return message.error('缺少项目ID');
    const ids = String(values.task_ids || '')
      .split(',')
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => Number.isFinite(n));
    if (!ids.length) return message.warning('请输入有效的任务ID');

    setSubmitting(true);
    try {
      const updates: any = {};
      if (values.parent_id !== undefined) updates.parent_id = values.parent_id === '' ? null : values.parent_id;
      if (values.status) updates.status = values.status;
      const res = await TaskService.batchUpdateTasks(projectIdNum, ids, updates);
      message.success(res.message || `批量更新成功（${res.updated_count}）`);
    } catch (e: any) {
      message.error(e?.message || '批量更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="批量级联（MVP）" style={{ maxWidth: 720 }}>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ parent_id: '', status: undefined }}>
        <Form.Item label="任务ID（逗号分隔）" name="task_ids" rules={[{ required: true, message: '请输入任务ID' }]}> 
          <TextArea placeholder="例如：101,102,103" rows={3} />
        </Form.Item>
        <Space size="large">
          <Form.Item label="新父任务ID（留空=不变，填0或空字符串表示置为根）" name="parent_id">
            <InputNumber style={{ width: 240 }} min={0} placeholder="可选" />
          </Form.Item>
          <Form.Item label="状态（可选）" name="status">
            <Select allowClear placeholder="不修改">
              {['todo','in_progress','completed','cancelled','on_hold','blocked','planning'].map(s => (
                <Select.Option key={s} value={s}>{s}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Space>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>执行批量更新</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default BatchCascadePage;
