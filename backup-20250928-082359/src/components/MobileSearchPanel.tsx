import React, { useState } from 'react';
import {
  Input,
  Button,
  Space,
  Row,
  Col,
  Tag
} from 'antd';
import {
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Search } = Input;

interface MobileSearchPanelProps {
  onSearch?: (searchTerm: string) => void;
  onAdvancedSearch?: (filters: unknown) => void;
}

const MobileSearchPanel: React.FC<MobileSearchPanelProps> = ({
  onSearch,
  onAdvancedSearch
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [recentSearches] = useState(['API文档', '需求分析', '设计规范']);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleQuickSearch = (term: string) => {
    setSearchValue(term);
    onSearch?.(term);
  };

  return (
    <div>
      <Row gutter={[8, 8]}>
        <Col span={20}>
          <Search
            placeholder="搜索文档标题、内容、标签..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            enterButton
            size="large"
          />
        </Col>
        <Col span={4}>
          <Button
            block
            icon={<CloseOutlined />}
            onClick={() => {
              setSearchValue('');
              onSearch?.('');
            }}
          />
        </Col>
      </Row>
      
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, fontSize: '12px', color: '#999' }}>
            最近搜索
          </div>
          <Space wrap>
            {recentSearches.map((term, index) => (
              <Tag
                key={index}
                style={{ cursor: 'pointer' }}
                onClick={() => handleQuickSearch(term)}
              >
                {term}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default MobileSearchPanel;