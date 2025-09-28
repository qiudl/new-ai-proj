import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Select,
  InputNumber,
  Divider,
  message
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { CreateObjectiveRequest } from '../types/okr';
import okrService from '../services/okrService';
import dayjs from 'dayjs';
import { useUnifiedModal } from '../hooks/useUnifiedModal';

const { TextArea } = Input;
const { Option } = Select;

interface CreateOKRModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  quarter: string;
  editData?: any;
  isEdit?: boolean;
}

const CreateOKRModal: React.FC<CreateOKRModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  quarter,
  editData,
  isEdit = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // 使用统一Modal配置，启用高度管理
  const modalConfig = useUnifiedModal({ 
    width: 600,
    centered: true,
    enableHeightManagement: true,
    heightConfig: {
      maxHeightRatio: 0.85, // OKR表单可能比较长，使用更多屏幕空间
      topMargin: 30,
      bottomMargin: 30
    }
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('🐛 [CreateOKRModal] Form values:', values);
      console.log('🐛 [CreateOKRModal] isEdit:', isEdit, 'editData:', editData);
      setLoading(true);

      if (isEdit && editData) {
        // 编辑模式 - 分别更新目标和关键结果
        const objectiveUpdateData = {
          title: values.title,
          description: values.description || '',
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate: values.dateRange[1].format('YYYY-MM-DD')
        };

        console.log('🐛 [CreateOKRModal] Updating objective:', objectiveUpdateData);
        
        // 1. 更新目标基本信息
        await okrService.updateObjective(editData.id, objectiveUpdateData);

        // 2. 处理关键结果的更新、新增和删除
        const formKeyResults = values.keyResults || [];
        const originalKeyResults = editData.keyResults || [];
        
        console.log('🐛 [CreateOKRModal] Form key results:', formKeyResults);
        console.log('🐛 [CreateOKRModal] Original key results:', originalKeyResults);

        // 处理表单中的每个关键结果
        for (let i = 0; i < formKeyResults.length; i++) {
          const formKR = formKeyResults[i];
          const originalKR = originalKeyResults[i];
          
          if (originalKR && originalKR.id) {
            // 更新现有关键结果
            const hasChanges = 
              formKR.title !== originalKR.title ||
              formKR.description !== (originalKR.description || '') ||
              formKR.type !== originalKR.type ||
              formKR.targetValue !== originalKR.targetValue ||
              formKR.unit !== (originalKR.unit || '');
            
            if (hasChanges) {
              const krUpdateData = {
                title: formKR.title,
                description: formKR.description || '',
                currentValue: formKR.currentValue || originalKR.currentValue || 0,
                // 注意：不更新 type 和 targetValue，因为这些通常在创建后不应该改变
              };
              
              console.log(`🐛 [CreateOKRModal] Updating key result ${originalKR.id}:`, krUpdateData);
              await okrService.updateKeyResult(originalKR.id, krUpdateData);
            }
          } else {
            // 创建新的关键结果
            const newKRData = {
              title: formKR.title,
              description: formKR.description || '',
              type: formKR.type,
              targetValue: formKR.targetValue,
              currentValue: 0,
              unit: formKR.unit || '',
              progress: 0,
              status: 'not_started' as const
            };
            
            console.log(`🐛 [CreateOKRModal] Creating new key result:`, newKRData);
            await okrService.createKeyResult(editData.id, newKRData);
          }
        }

        message.success('OKR目标更新成功');
      } else {
        // 创建模式  
        const processedKeyResults = (values.keyResults || []).map((kr: any) => ({
          title: kr.title,
          description: kr.description || '',
          type: kr.type,
          targetValue: kr.targetValue,
          currentValue: 0, // 新创建时默认为0
          unit: kr.unit || '',
          progress: 0, // 新创建时默认为0
          status: 'not_started' // 新创建时默认未开始
        }));

        const requestData: CreateObjectiveRequest = {
          title: values.title,
          description: values.description || '',
          quarter: quarter,
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate: values.dateRange[1].format('YYYY-MM-DD'),
          keyResults: processedKeyResults
        };

        console.log('🐛 [CreateOKRModal] Create data with processed keyResults:', requestData);
        await okrService.createObjective(requestData);
        message.success('OKR目标创建成功');
      }
      
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Failed to save OKR objective:', error);
      message.error(isEdit ? '更新OKR目标失败' : '创建OKR目标失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // 获取当月的默认日期范围 (当月1号到月末)
  const getCurrentMonthDateRange = () => {
    const now = dayjs();
    const startDate = now.startOf('month'); // 当月1号
    const endDate = now.endOf('month'); // 当月最后一天
    return [startDate, endDate];
  };

  // 获取编辑时的初始值
  const getInitialValues = () => {
    if (isEdit && editData) {
      return {
        title: editData.title,
        description: editData.description || '',
        dateRange: [
          editData.startDate ? dayjs(editData.startDate) : getCurrentMonthDateRange()[0],
          editData.endDate ? dayjs(editData.endDate) : getCurrentMonthDateRange()[1]
        ],
        keyResults: editData.keyResults && editData.keyResults.length > 0 
          ? editData.keyResults.map((kr: any) => ({
              title: kr.title || '',
              description: kr.description || '',
              type: kr.type || 'percentage',
              targetValue: kr.targetValue || 100,
              unit: kr.unit || '%'
            }))
          : [{ title: '', type: 'percentage', targetValue: 100, unit: '%' }]
      };
    }
    return {
      dateRange: getCurrentMonthDateRange(),
      keyResults: [{ title: '', type: 'percentage', targetValue: 100, unit: '%' }]
    };
  };

  return (
    <Modal
      title={isEdit ? "编辑OKR目标" : "创建OKR目标"}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {isEdit ? "保存修改" : "创建目标"}
        </Button>
      ]}
      width={modalConfig.width}
      className={modalConfig.className}
      styles={modalConfig.styles}
      centered={modalConfig.centered}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={getInitialValues()}
        key={editData?.id || 'create'} // 强制重新渲染以更新表单值
      >
        <Form.Item
          name="title"
          label="目标标题"
          rules={[{ required: true, message: '请输入目标标题' }]}
        >
          <Input placeholder="输入具体、可衡量的目标" />
        </Form.Item>

        <Form.Item
          name="description"
          label="目标描述"
        >
          <TextArea rows={3} placeholder="详细描述目标的背景和意义" />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="时间范围"
          rules={[{ required: true, message: '请选择时间范围' }]}
        >
          <DatePicker.RangePicker 
            style={{ width: '100%' }} 
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            styles={{ popup: { root: { zIndex: 9999 } } }}
          />
        </Form.Item>

        <div>
          <Divider orientation="left">关键结果 (Key Results)</Divider>

            <Form.List name="keyResults">
              {(fields, { add, remove }) => (
                <div>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} style={{ 
                      padding: '16px', 
                      border: '1px solid #f0f0f0', 
                      borderRadius: '6px',
                      marginBottom: '16px',
                      background: '#fafafa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>关键结果 {name + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(name)}
                            danger
                          />
                        )}
                      </div>

                      <Form.Item
                        {...restField}
                        name={[name, 'title']}
                        rules={[{ required: true, message: '请输入关键结果标题' }]}
                        style={{ marginBottom: '12px' }}
                      >
                        <Input placeholder="输入可量化的关键结果" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        style={{ marginBottom: '12px' }}
                      >
                        <TextArea rows={2} placeholder="描述如何衡量这个关键结果" />
                      </Form.Item>

                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'type']}
                          rules={[{ required: true, message: '请选择类型' }]}
                          style={{ width: '30%', marginBottom: 0 }}
                        >
                          <Select placeholder="类型">
                            <Option value="percentage">百分比</Option>
                            <Option value="number">数值</Option>
                            <Option value="boolean">是/否</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'targetValue']}
                          rules={[{ required: true, message: '请输入目标值' }]}
                          style={{ width: '40%', marginBottom: 0 }}
                        >
                          <InputNumber 
                            placeholder="目标值" 
                            style={{ width: '100%' }}
                            min={0}
                          />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'unit']}
                          style={{ width: '30%', marginBottom: 0 }}
                        >
                          <Input placeholder="单位 (如: %, 个, 分)" />
                        </Form.Item>
                      </Space.Compact>
                    </div>
                  ))}

                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({ title: '', type: 'percentage', targetValue: 100, unit: '%' })}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加关键结果
                    </Button>
                  </Form.Item>
                </div>
              )}
            </Form.List>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateOKRModal;