import React, { useState } from 'react';
import {
  Modal,
  Card,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
  Alert,
  Progress,
  Spin,
  List,
  Badge,
  Tooltip,
  Collapse
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SelectOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AICompanyInfo, AISearchResult } from '../services/aiCompanyService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AICompanySearchProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (companyInfo: AICompanyInfo) => void;
  searchResult: AISearchResult | null;
  loading: boolean;
  companyName: string;
  onRetry: () => void;
}

const AICompanySearch: React.FC<AICompanySearchProps> = ({
  visible,
  onCancel,
  onConfirm,
  searchResult,
  loading,
  companyName,
  onRetry
}) => {
  const [selectedResult, setSelectedResult] = useState<AICompanyInfo | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['main']);

  const handleConfirm = () => {
    if (selectedResult || searchResult?.data) {
      onConfirm(selectedResult || searchResult!.data!);
    }
  };

  const renderConfidenceTag = (confidence: number) => {
    let color = 'default';
    let text = '低';
    
    if (confidence >= 0.8) {
      color = 'success';
      text = '高';
    } else if (confidence >= 0.6) {
      color = 'processing';
      text = '中';
    } else {
      color = 'warning';
      text = '低';
    }

    return (
      <Tag color={color}>
        <ThunderboltOutlined /> 可信度: {(confidence * 100).toFixed(0)}% ({text})
      </Tag>
    );
  };

  const renderCompanyCard = (company: AICompanyInfo, isMain = false, isSelected = false) => {
    return (
      <Card
        size="small"
        style={{
          marginBottom: 12,
          border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          backgroundColor: isSelected ? '#f6ffed' : 'white'
        }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {isMain && <Badge status="processing" text="主要结果" />}
              <Text strong>{company.companyName}</Text>
            </Space>
            <Space>
              {renderConfidenceTag(company.confidence)}
              <Button
                size="small"
                type={isSelected ? "primary" : "default"}
                icon={isSelected ? <CheckCircleOutlined /> : <SelectOutlined />}
                onClick={() => setSelectedResult(isSelected ? null : company)}
              >
                {isSelected ? '已选择' : '选择此结果'}
              </Button>
            </Space>
          </div>
        }
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12}>
            <Text type="secondary">企业类型：</Text>
            <Text>{company.companyType === 'limited_company' ? '有限责任公司' : 
                   company.companyType === 'joint_stock' ? '股份有限公司' : 
                   company.companyType === 'individual' ? '个体工商户' : '合伙企业'}</Text>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">所属行业：</Text>
            <Text>{company.industry || '未知'}</Text>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">法定代表人：</Text>
            <Text>{company.legalRepresentative || '未知'}</Text>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">企业规模：</Text>
            <Text>{company.companySize === 'startup' ? '初创公司' :
                   company.companySize === 'small' ? '小型企业' :
                   company.companySize === 'medium' ? '中型企业' :
                   company.companySize === 'large' ? '大型企业' : '超大型企业'}</Text>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">员工人数：</Text>
            <Text>{company.employeeCount ? `约${company.employeeCount}人` : '未知'}</Text>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary">成立年份：</Text>
            <Text>{company.establishedYear ? `${company.establishedYear}年` : '未知'}</Text>
          </Col>
          <Col xs={24}>
            <Text type="secondary">联系信息：</Text>
            <div style={{ marginTop: 4 }}>
              {company.mainPhone && <Tag>{company.mainPhone}</Tag>}
              {company.mainEmail && <Tag>{company.mainEmail}</Tag>}
              {company.website && <Tag color="blue">{company.website}</Tag>}
            </div>
          </Col>
          <Col xs={24}>
            <Text type="secondary">地址：</Text>
            <Text>{company.address ? `${company.province} ${company.city} ${company.address}` : '未知'}</Text>
          </Col>
          {company.description && (
            <Col xs={24}>
              <Text type="secondary">企业描述：</Text>
              <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                {company.description}
              </Paragraph>
            </Col>
          )}
          {company.reasoning && (
            <Col xs={24}>
              <Text type="secondary">AI推理过程：</Text>
              <Paragraph style={{ marginTop: 4, marginBottom: 0, fontSize: '12px', color: '#8c8c8c' }}>
                {company.reasoning}
              </Paragraph>
            </Col>
          )}
        </Row>
        
        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <Space>
              <InfoCircleOutlined /> 数据来源: {company.source}
              {company.usedProvider && (
                <Tag color="blue">{company.usedProvider.toUpperCase()}</Tag>
              )}
            </Space>
          </Text>
          <Progress 
            percent={company.confidence * 100} 
            size="small" 
            style={{ width: 100 }}
            strokeColor={company.confidence >= 0.8 ? '#52c41a' : company.confidence >= 0.6 ? '#1890ff' : '#faad14'}
          />
        </div>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          AI智能企业信息搜索
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      style={{ top: 20 }}
      footer={[
        <Button key="retry" icon={<ReloadOutlined />} onClick={onRetry} disabled={loading}>
          重新搜索
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          disabled={!searchResult?.data && !selectedResult}
          icon={<CheckCircleOutlined />}
        >
          确认使用选中结果
        </Button>
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 搜索状态 */}
        <Alert
          message={`正在为企业"${companyName}"搜索相关信息...`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Space>
              {loading ? (
                <Spin size="small" />
              ) : searchResult?.success ? (
                <Tag color="success">搜索完成</Tag>
              ) : (
                <Tag color="error">搜索失败</Tag>
              )}
              {searchResult?.usedProvider && (
                <Tag color="blue">{searchResult.usedProvider.toUpperCase()}</Tag>
              )}
            </Space>
          }
        />

        {/* AI使用信息 */}
        {!loading && searchResult?.success && (searchResult.tokenUsage || searchResult.cost) && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
            <Row gutter={16}>
              {searchResult.tokenUsage && (
                <Col span={12}>
                  <Text type="secondary">Token使用:</Text>
                  <div style={{ fontSize: '12px' }}>
                    输入: {searchResult.tokenUsage.prompt} | 
                    输出: {searchResult.tokenUsage.completion} | 
                    总计: {searchResult.tokenUsage.total}
                  </div>
                </Col>
              )}
              {searchResult.cost && (
                <Col span={12}>
                  <Text type="secondary">预估成本:</Text>
                  <div style={{ fontSize: '12px', color: '#52c41a' }}>
                    ≈ {searchResult.cost < 0.01 ? '<0.01' : searchResult.cost.toFixed(4)} 元
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="AI正在分析企业信息，请稍候...">
              <div style={{ marginTop: 16, color: '#8c8c8c' }}>
                <Text type="secondary">
                  正在从多个数据源获取企业信息...
                </Text>
              </div>
            </Spin>
          </div>
        )}

        {!loading && searchResult && (
          <>
            {searchResult.success && searchResult.data ? (
              <Collapse 
                activeKey={expandedPanels}
                onChange={setExpandedPanels}
                style={{ marginBottom: 16 }}
              >
                <Panel 
                  header={
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      主要搜索结果
                      {renderConfidenceTag(searchResult.data.confidence)}
                    </Space>
                  }
                  key="main"
                >
                  {renderCompanyCard(searchResult.data, true, selectedResult === searchResult.data)}
                </Panel>
                
                {searchResult.alternatives && searchResult.alternatives.length > 0 && (
                  <Panel 
                    header={
                      <Space>
                        <EyeOutlined style={{ color: '#1890ff' }} />
                        备选结果 ({searchResult.alternatives.length}个)
                      </Space>
                    }
                    key="alternatives"
                  >
                    {searchResult.alternatives.map((alt, index) => (
                      <div key={index}>
                        {renderCompanyCard(alt, false, selectedResult === alt)}
                      </div>
                    ))}
                  </Panel>
                )}
              </Collapse>
            ) : (
              <Alert
                message="搜索失败"
                description={searchResult.message || 'AI搜索服务暂时不可用，请手动填写企业信息'}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button size="small" onClick={onRetry}>
                    重试
                  </Button>
                }
              />
            )}
          </>
        )}

        {/* 使用说明 */}
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
          <Title level={5}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} /> 使用说明
          </Title>
          <List
            size="small"
            dataSource={[
              '1. AI会从多个公开数据源搜索企业信息',
              '2. 可信度越高的结果越准确，建议优先选择',
              '3. 您可以在多个搜索结果中选择最合适的一个',
              '4. 确认后AI信息将自动填入表单，您可以进一步编辑',
              '5. 如果搜索结果不准确，可以手动修改或重新搜索'
            ]}
            renderItem={item => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Text type="secondary">{item}</Text>
              </List.Item>
            )}
          />
          
          <Divider style={{ margin: '12px 0' }} />
          
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Tag color="success">高可信度</Tag>
                <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  80%以上，推荐使用
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Tag color="processing">中可信度</Tag>
                <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  60-80%，谨慎使用
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Tag color="warning">低可信度</Tag>
                <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                  60%以下，仅供参考
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </Modal>
  );
};

export default AICompanySearch;