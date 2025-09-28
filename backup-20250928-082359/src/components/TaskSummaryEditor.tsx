import React, { useState, useEffect } from 'react';
import {
  Typography,
  Input,
  Button,
  Space,
  message,
  Tooltip,
  Spin
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  RobotOutlined,
  BulbOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TaskSummaryEditorProps {
  summary?: string;
  description?: string;
  onUpdate: (summary: string) => Promise<void>;
  loading?: boolean;
  style?: React.CSSProperties;
}

const TaskSummaryEditor: React.FC<TaskSummaryEditorProps> = ({
  summary = '',
  description = '',
  onUpdate,
  loading = false,
  style
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    setCurrentSummary(summary);
  }, [summary]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentSummary(summary);
  };

  const handleSave = async () => {
    try {
      await onUpdate(currentSummary);
      setIsEditing(false);
      message.success('任务摘要更新成功');
    } catch (error) {
      console.error('Save failed:', error);
      message.error('保存失败');
    }
  };

  // AI生成摘要功能
  const generateAISummary = async () => {
    if (!description || description.trim().length === 0) {
      message.warning('任务描述为空，无法生成摘要');
      return;
    }

    try {
      setAiGenerating(true);
      
      // 模拟AI生成摘要（实际应用中应该调用真实的AI API）
      const aiSummary = await mockAIGeneration(description);
      
      setCurrentSummary(aiSummary);
      message.success('AI摘要生成成功');
    } catch (error) {
      console.error('AI generation failed:', error);
      message.error('AI生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  // 模拟AI摘要生成（实际应用中替换为真实的AI API调用）
  const mockAIGeneration = async (desc: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 简单的文本处理逻辑，提取关键信息
        const lines = desc.split('\n').filter(line => line.trim());
        const keyPoints: string[] = [];
        
        // 提取标题
        lines.forEach(line => {
          if (line.startsWith('#')) {
            keyPoints.push(line.replace(/^#+\s*/, '').trim());
          } else if (line.includes('**') || line.includes('*')) {
            // 提取加粗或斜体内容
            const matches = line.match(/\*\*(.*?)\*\*/g) || line.match(/\*(.*?)\*/g);
            if (matches) {
              matches.forEach(match => {
                const text = match.replace(/\*+/g, '').trim();
                if (text.length > 0 && text.length < 50) {
                  keyPoints.push(text);
                }
              });
            }
          }
        });

        // 提取列表项
        lines.forEach(line => {
          if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
            const item = line.replace(/^[-*+\d.]\s+/, '').trim();
            if (item.length > 0 && item.length < 100) {
              keyPoints.push(item);
            }
          }
        });

        // 构建摘要
        let summary = '';
        if (keyPoints.length > 0) {
          summary = keyPoints.slice(0, 3).join('；');
          if (summary.length > 200) {
            summary = summary.substring(0, 197) + '...';
          }
        } else {
          // 如果没有结构化内容，取前200字符
          const plainText = desc.replace(/[#*`\[\]()]/g, '').trim();
          summary = plainText.length > 200 ? plainText.substring(0, 197) + '...' : plainText;
        }

        resolve(summary || '此任务包含详细的技术实现内容，需要进一步分析和执行。');
      }, 1500); // 模拟AI处理时间
    });
  };

  if (isEditing) {
    return (
      <div style={style}>
        <div style={{ marginBottom: '12px' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            任务摘要（AI提炼）- 最多200字
          </Text>
        </div>
        
        <TextArea
          value={currentSummary}
          onChange={(e) => setCurrentSummary(e.target.value)}
          placeholder="AI将根据任务描述自动提炼摘要，您也可以手动编辑..."
          rows={3}
          maxLength={200}
          showCount
          style={{ marginBottom: '12px' }}
        />
        
        <Space>
          <Button 
             
            icon={<RobotOutlined />} 
            onClick={generateAISummary}
            loading={aiGenerating}
            type="dashed"
          >
            AI生成
          </Button>
          <Button 
             
            icon={<SaveOutlined />} 
            type="primary" 
            onClick={handleSave}
            loading={loading}
          >
            保存
          </Button>
          <Button 
             
            icon={<CloseOutlined />} 
            onClick={handleCancel}
          >
            取消
          </Button>
        </Space>
      </div>
    );
  }

  // 展示模式
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          {currentSummary ? (
            <Paragraph 
              style={{ 
                margin: 0, 
                color: '#595959',
                fontSize: '14px',
                lineHeight: '1.6',
                cursor: 'pointer'
              }}
              onClick={handleEdit}
            >
              {currentSummary}
            </Paragraph>
          ) : (
            <div 
              onClick={handleEdit}
              style={{
                padding: '8px 12px',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                color: '#8c8c8c',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#fafafa'
              }}
            >
              <BulbOutlined style={{ marginRight: '6px' }} />
              点击添加任务摘要
            </div>
          )}
        </div>
        
        {currentSummary && (
          <Tooltip title="编辑摘要">
            <Button 
              type="text" 
               
              icon={<EditOutlined />} 
              onClick={handleEdit}
              style={{ 
                color: '#8c8c8c',
                opacity: 0.6
              }}
            />
          </Tooltip>
        )}
      </div>
      
      {currentSummary && (
        <div style={{ marginTop: '4px', fontSize: '12px', color: '#bfbfbf' }}>
          <RobotOutlined style={{ marginRight: '4px' }} />
          AI提炼摘要
        </div>
      )}
    </div>
  );
};

export default TaskSummaryEditor;