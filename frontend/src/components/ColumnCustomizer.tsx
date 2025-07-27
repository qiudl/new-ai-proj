import React, { useState, useEffect } from 'react';
import { Drawer, Checkbox, Button, Space, Typography, Divider, List, Tooltip, Switch } from 'antd';
import { SettingOutlined, DragOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

// Dynamic import for react-beautiful-dnd
let DragDropContext: any = null;
let Droppable: any = null;
let Draggable: any = null;
try {
  const dnd = require('react-beautiful-dnd');
  DragDropContext = dnd.DragDropContext;
  Droppable = dnd.Droppable;
  Draggable = dnd.Draggable;
} catch (error) {
  console.warn('react-beautiful-dnd not available, drag and drop will be disabled');
}

// Define types locally to avoid import errors
interface DropResult {
  destination?: {
    index: number;
    droppableId: string;
  } | null;
  source: {
    index: number;
    droppableId: string;
  };
}

interface DroppableProvided {
  innerRef: React.Ref<any>;
  droppableProps: any;
  placeholder?: React.ReactElement;
}

interface DraggableProvided {
  innerRef: React.Ref<any>;
  draggableProps: any;
  dragHandleProps: any;
}

interface DraggableStateSnapshot {
  isDragging: boolean;
}

const { Title, Text } = Typography;

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  required?: boolean; // 必需列，不能隐藏
  description?: string;
  width?: string | number;
  minWidth?: number; // 最小宽度
  maxWidth?: number; // 最大宽度
  resizable?: boolean; // 是否可调整大小
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string; // localStorage存储键
}

const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({
  columns,
  onChange,
  storageKey = 'task-list-columns'
}) => {
  const [visible, setVisible] = useState(false);
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  // 从localStorage加载配置
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedColumns = JSON.parse(saved);
        // 合并保存的配置和默认配置，确保新增的列能显示
        const mergedColumns = columns.map(col => {
          const savedCol = savedColumns.find((s: ColumnConfig) => s.key === col.key);
          return savedCol ? { 
            ...col, 
            visible: savedCol.visible,
            width: savedCol.width !== undefined ? savedCol.width : col.width
          } : col;
        });
        setLocalColumns(mergedColumns);
        onChange(mergedColumns);
      } catch (error) {
        console.warn('Failed to load column configuration:', error);
      }
    }
  }, [columns, onChange, storageKey]);

  // 保存配置到localStorage
  const saveConfiguration = (newColumns: ColumnConfig[]) => {
    localStorage.setItem(storageKey, JSON.stringify(newColumns));
    setLocalColumns(newColumns);
    onChange(newColumns);
  };

  // 处理列可见性切换
  const handleColumnToggle = (key: string, visible: boolean) => {
    const newColumns = localColumns.map(col =>
      col.key === key ? { ...col, visible } : col
    );
    saveConfiguration(newColumns);
  };

  // 处理拖拽排序
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    saveConfiguration(items);
  };

  // 重置为默认配置
  const handleReset = () => {
    const defaultColumns = columns.map(col => ({ ...col, visible: true }));
    saveConfiguration(defaultColumns);
  };

  // 全部显示/隐藏
  const handleToggleAll = (showAll: boolean) => {
    const newColumns = localColumns.map(col => 
      col.required ? col : { ...col, visible: showAll }
    );
    saveConfiguration(newColumns);
  };

  const visibleCount = localColumns.filter(col => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <>
      <Tooltip title="自定义列显示">
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setVisible(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          列设置 ({visibleCount}/{totalCount})
        </Button>
      </Tooltip>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingOutlined />
            <span>自定义列显示</span>
          </div>
        }
        placement="right"
        onClose={() => setVisible(false)}
        open={visible}
        width={380}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <Text type="secondary">
            拖拽调整列顺序，点击眼睛图标控制显示/隐藏。设置会自动保存。
          </Text>
        </div>

        {/* 快捷操作 */}
        <div style={{ marginBottom: '20px' }}>
          <Space>
            <Button 
              size="small" 
              onClick={() => handleToggleAll(true)}
            >
              全部显示
            </Button>
            <Button 
              size="small" 
              onClick={() => handleToggleAll(false)}
            >
              全部隐藏
            </Button>
            <Button 
              size="small" 
              onClick={handleReset}
            >
              重置默认
            </Button>
          </Space>
        </div>

        <Divider />

        {/* 列配置列表 */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided: DroppableProvided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {localColumns.map((column, index) => (
                  <Draggable
                    key={column.key}
                    draggableId={column.key}
                    index={index}
                    isDragDisabled={column.required}
                  >
                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          marginBottom: '8px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: snapshot.isDragging ? '#f0f9ff' : '#fafafa',
                            border: `1px solid ${snapshot.isDragging ? '#91d5ff' : '#e8e8e8'}`,
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            cursor: column.required ? 'default' : 'grab'
                          }}
                        >
                          {/* 拖拽手柄 */}
                          <div
                            {...provided.dragHandleProps}
                            style={{
                              marginRight: '12px',
                              color: column.required ? '#d9d9d9' : '#8c8c8c',
                              cursor: column.required ? 'not-allowed' : 'grab'
                            }}
                          >
                            <DragOutlined />
                          </div>

                          {/* 列信息 */}
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#262626',
                              marginBottom: column.description ? '2px' : 0
                            }}>
                              {column.title}
                              {column.required && (
                                <span style={{ 
                                  color: '#ff4d4f', 
                                  marginLeft: '4px',
                                  fontSize: '12px'
                                }}>
                                  *必需
                                </span>
                              )}
                            </div>
                            {column.description && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#8c8c8c',
                                lineHeight: '1.4'
                              }}>
                                {column.description}
                              </div>
                            )}
                          </div>

                          {/* 可见性切换 */}
                          <div style={{ marginLeft: '12px' }}>
                            {column.required ? (
                              <Tooltip title="必需列，不可隐藏">
                                <EyeOutlined style={{ color: '#52c41a' }} />
                              </Tooltip>
                            ) : (
                              <Button
                                type="text"
                                size="small"
                                icon={column.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                onClick={() => handleColumnToggle(column.key, !column.visible)}
                                style={{
                                  color: column.visible ? '#52c41a' : '#d9d9d9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px'
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Divider />

        {/* 统计信息 */}
        <div style={{
          padding: '12px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Text style={{ color: '#52c41a' }}>
            当前显示 <strong>{visibleCount}</strong> 列，共 <strong>{totalCount}</strong> 列可用
          </Text>
        </div>
      </Drawer>
    </>
  );
};

export default ColumnCustomizer;