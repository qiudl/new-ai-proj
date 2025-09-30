import React, { useState, useCallback, useRef } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';

export interface DocumentSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  onSearch,
  placeholder = "搜索文档...",
  className = '',
  debounceMs = 300
}) => {
  const [searchValue, setSearchValue] = useState('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    
    // 防抖处理
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  const handleClear = useCallback(() => {
    setSearchValue('');
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    onSearch('');
  }, [onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value);
  }, [handleSearch]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`document-search ${className}`}>
      <Input
        prefix={<SearchOutlined className="search-icon" />}
        suffix={
          searchValue ? (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleClear}
              className="clear-button"
            />
          ) : null
        }
        placeholder={placeholder}
        value={searchValue}
        onChange={handleInputChange}
        allowClear={false} // 使用自定义清除按钮
        className="search-input"
      />
    </div>
  );
};

export default DocumentSearch;