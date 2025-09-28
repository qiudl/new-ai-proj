import React from 'react';
import { Table } from 'antd';
import type { FlexibleDataTableProps } from './types';

export const FlexibleDataTable: React.FC<FlexibleDataTableProps> = ({
  dataSource,
  loading = false,
  rowKey = 'id',
  columns,
  actions = [],
  size = 'middle',
  bordered = true,
  title,
  searchConfig,
  paginationConfig,
  configStorage,
  exportConfig,
  scroll = { x: 'max-content' },
}) => {
  // 过滤可见列
  const tableColumns = columns
    .filter(col => col.visible)
    .map(col => ({
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex,
      width: col.width,
      fixed: col.fixed,
      render: col.render,
      sorter: col.sortable,
      ellipsis: col.ellipsis,
      align: col.align,
    }));

  // 添加操作列
  if (actions.length > 0) {
    tableColumns.push({
      key: 'actions',
      title: '操作',
      dataIndex: 'actions',
      width: Math.max(actions.length * 40 + 20, 120),
      fixed: 'right' as const,
      sorter: false,
      ellipsis: false,
      align: 'center' as const,
      render: (_: unknown, record: unknown, index: number) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {actions.map(action => (
            <button
              key={action.key}
              style={{
                border: '1px solid #d9d9d9',
                background: action.danger ? '#ff4d4f' : '#fff',
                color: action.danger ? '#fff' : '#666',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onClick={() => action.onClick(record, index)}
              title={action.title}
            >
              {action.icon}
            </button>
          ))}
        </div>
      ),
    });
  }

  // 构建分页配置
  const tablePagination = paginationConfig === false ? false : {
    current: paginationConfig?.current || 1,
    pageSize: paginationConfig?.pageSize || 20,
    total: paginationConfig?.total || 0,
    showSizeChanger: paginationConfig?.showSizeChanger !== false,
    showQuickJumper: paginationConfig?.showQuickJumper !== false,
    showTotal: paginationConfig?.showTotal || ((total, range) => `共 ${total} 条记录，显示 ${range[0]}-${range[1]} 条`),
    pageSizeOptions: paginationConfig?.pageSizeOptions || ['10', '20', '50', '100'],
    onChange: paginationConfig?.onChange,
    onShowSizeChange: paginationConfig?.onShowSizeChange,
  };

  return (
    <div style={{ background: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
      {/* 简化的工具栏 */}
      {(searchConfig || exportConfig) && (
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {searchConfig && (
                <input
                  type="text"
                  placeholder={searchConfig.placeholder || '搜索...'}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    width: '240px',
                  }}
                  onChange={(e) => searchConfig.onSearch?.(e.target.value, searchConfig.searchFields || [])}
                />
              )}
            </div>
            <div>
              {exportConfig && (
                <button
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                  onClick={() => exportConfig.onExport?.('csv', dataSource)}
                >
                  导出
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 表格 */}
      <Table
        dataSource={dataSource}
        columns={tableColumns}
        loading={loading}
        rowKey={rowKey}
        size={size}
        bordered={bordered}
        title={title}
        scroll={scroll}
        pagination={tablePagination}
      />
    </div>
  );
};