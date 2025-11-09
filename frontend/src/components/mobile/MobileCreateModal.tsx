import React, { useState } from 'react';
import { Modal, Form, Input, Button, Radio, Select, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface MobileCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  mode: 'quick' | 'full';
}

const MobileCreateModal: React.FC<MobileCreateModalProps> = ({ 
  visible, 
  onClose, 
  onSave, 
  mode 
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  
  const handleSave = async (status: 'draft' | 'published') => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      await onSave({ ...values, status });
      onClose();
      form.resetFields();
      message.success(`笔记${status === 'draft' ? '保存' : '发布'}成功`);
    } catch (error) {
      console.error('Save failed:', error);
      if (error instanceof Error) {
        message.error(`${status === 'draft' ? '保存' : '发布'}失败: ${error.message}`);
      } else {
        message.error(`${status === 'draft' ? '保存' : '发布'}失败`);
      }
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{
        top: 0,
        paddingBottom: 0,
        maxWidth: '100vw',
        margin: 0,
      }}
      styles={{
        body: {
          height: '100vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }
      }}
      destroyOnClose
      maskClosable={false}
    >
      {/* 顶部导航栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onClose}
          size="large"
          style={{ padding: '4px 8px' }}
        >
          返回
        </Button>
        <span style={{ fontSize: '16px', fontWeight: 500 }}>
          {mode === 'quick' ? '快速创建' : '详细创建'}
        </span>
        <Button
          type="primary"
          onClick={() => handleSave('published')}
          loading={saving}
          size="large"
        >
          发布
        </Button>
      </div>
      
      {/* 表单内容 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
      }}>
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          onFinish={(values) => handleSave(values.status || 'published')}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入笔记标题' }]}
          >
            <Input
              placeholder="输入笔记标题..."
              size="large"
              autoFocus
              style={{
                fontSize: '16px',
                border: 'none',
                borderBottom: '2px solid #f0f0f0',
                borderRadius: 0,
                padding: '8px 0',
                boxShadow: 'none',
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入笔记内容' }]}
          >
            <TextArea
              placeholder="记录你的想法..."
              rows={mode === 'quick' ? 8 : 12}
              size="large"
              style={{
                fontSize: '16px',
                resize: 'none',
              }}
            />
          </Form.Item>
          
          {mode === 'full' && (
            <>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  size="large"
                  style={{ width: '100%' }}
                  tokenSeparators={[',', ' ']}
                />
              </Form.Item>
              
              <Form.Item
                name="visibility"
                label="可见性"
                initialValue="private"
              >
                <Radio.Group size="large">
                  <Radio value="private">私有</Radio>
                  <Radio value="team">团队</Radio>
                  <Radio value="public">公开</Radio>
                </Radio.Group>
              </Form.Item>
            </>
          )}
        </Form>
      </div>
      
      {/* 底部操作栏 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        display: 'flex',
        gap: '12px',
        position: 'sticky',
        bottom: 0,
      }}>
        <Button
          size="large"
          onClick={() => handleSave('draft')}
          loading={saving}
          style={{ flex: 1 }}
        >
          保存草稿
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={() => handleSave('published')}
          loading={saving}
          style={{ flex: 1 }}
        >
          立即发布
        </Button>
      </div>
    </Modal>
  );
};

export default MobileCreateModal;