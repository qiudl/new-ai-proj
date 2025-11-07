import React, { useState } from 'react';
import { Card, Form, Button, Space, Divider, Typography, Alert, Row, Col } from 'antd';
import { EnhancedTaskForm } from './EnhancedTaskForm';
import { UserFeedbackCard, ValidationErrorDisplay, OperationProgress } from './UserFeedback';
import { useErrorHandler, useFormErrorHandler } from '../utils/errorHandler';
import { useFormValidation } from '../utils/enhancedValidation';
import ErrorBoundary, { withErrorBoundary } from './ErrorBoundary';

const { Title, Text } = Typography;

// 测试组件：故意抛出错误来测试错误边界
const ErrorTestComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('这是一个测试错误，用于验证错误边界功能');
  }
  
  return (
    <div style={{ padding: '16px', background: '#f0f9ff', border: '1px solid #bae7ff', borderRadius: '6px' }}>
      <Text>组件正常工作中...</Text>
    </div>
  );
};

// 带错误边界的测试组件
const SafeErrorTestComponent = withErrorBoundary(ErrorTestComponent, {
  level: 'widget',
  showDetails: false,
});

interface ValidationTestPageProps {}

const ValidationTestPage: React.FC<ValidationTestPageProps> = () => {
  const [form] = Form.useForm();
  const { handleError, handleAsyncOperation } = useErrorHandler();
  const { handleFormSubmitError } = useFormErrorHandler();
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shouldError, setShouldError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<{
    success: number;
    errors: number;
    tests: Array<{ name: string; status: 'success' | 'error'; message: string }>;
  }>({ success: 0, errors: 0, tests: [] });

  // 模拟API调用测试
  const simulateApiCall = async (type: 'success' | 'validation' | 'network' | 'server') => {
    setLoading(true);
    setProgress(0);
    
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearInterval(progressInterval);
    setProgress(100);
    setLoading(false);

    // 模拟不同类型的错误
    switch (type) {
      case 'success':
        return { message: '操作成功完成' };
      case 'validation':
        throw {
          response: {
            status: 422,
            data: {
              message: '输入数据验证失败',
              code: 'VALIDATION_ERROR',
              validation_errors: {
                title: ['标题不能为空', '标题长度必须在2-100个字符之间'],
                email: ['邮箱格式不正确'],
                phone: ['手机号码格式不正确'],
              }
            }
          }
        };
      case 'network':
        throw {
          code: 'ERR_NETWORK',
          message: 'Network Error'
        };
      case 'server':
        throw {
          response: {
            status: 500,
            data: {
              message: '服务器内部错误',
              code: 'INTERNAL_SERVER_ERROR'
            }
          }
        };
      default:
        throw new Error('Unknown error type');
    }
  };

  // 测试各种验证功能
  const runValidationTests = async () => {
    const tests = [
      {
        name: '成功请求测试',
        test: () => simulateApiCall('success'),
      },
      {
        name: '验证错误测试',
        test: () => simulateApiCall('validation'),
      },
      {
        name: '网络错误测试',
        test: () => simulateApiCall('network'),
      },
      {
        name: '服务器错误测试',
        test: () => simulateApiCall('server'),
      },
    ];

    const results: typeof testResults.tests = [];
    let successCount = 0;
    let errorCount = 0;

    for (const { name, test } of tests) {
      try {
        const result = await handleAsyncOperation(test, {
          showError: false, // 不显示错误，我们手动处理
        });
        
        if (result) {
          results.push({ name, status: 'success', message: '测试通过' });
          successCount++;
        } else {
          results.push({ name, status: 'error', message: '测试失败：返回结果为空' });
          errorCount++;
        }
      } catch (error) {
        results.push({ 
          name, 
          status: 'error', 
          message: `测试失败：${error instanceof Error ? error.message : '未知错误'}` 
        });
        errorCount++;
      }
    }

    setTestResults({ success: successCount, errors: errorCount, tests: results });
  };

  // 表单提交处理
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('表单数据：', values);
      
      // 模拟提交到服务器
      await handleAsyncOperation(
        () => simulateApiCall('success'),
        {
          customMessage: '任务创建成功',
          onSuccess: () => {
            form.resetFields();
            setValidationErrors({});
          }
        }
      );
    } catch (error) {
      handleFormSubmitError(error, form);
    }
  };

  // 手动触发验证错误
  const triggerValidationError = () => {
    // ✅ FIXED - Change string[] to string to match Record<string, string> type (TS2345)
    const mockErrors = {
      title: '标题不能为空',
      priority: '优先级必须选择',
      assignee_id: '必须指定负责人',
    };
    setValidationErrors(mockErrors);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>数据验证增强功能测试页面</Title>
      <Text type="secondary">
        此页面用于测试新增强的数据验证功能，包括前端表单验证、错误处理、用户反馈等。
      </Text>

      <Divider />

      <Row gutter={24}>
        <Col span={12}>
          <Card title="增强表单验证测试" style={{ marginBottom: 24 }}>
            <EnhancedTaskForm
              form={form}
              projectId={1}
              onValidationChange={(isValid, errors) => {
                if (!isValid) {
                  setValidationErrors(errors);
                } else {
                  setValidationErrors({});
                }
              }}
              showAdvanced={true}
            />
            
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleFormSubmit} loading={loading}>
                提交表单
              </Button>
              <Button onClick={triggerValidationError}>
                触发验证错误
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置表单
              </Button>
            </Space>

            {Object.keys(validationErrors).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <ValidationErrorDisplay 
                  errors={validationErrors}
                  onDismiss={() => setValidationErrors({})}
                />
              </div>
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card title="错误处理测试" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                onClick={() => handleAsyncOperation(() => simulateApiCall('success'))}
                loading={loading}
              >
                测试成功请求
              </Button>
              <Button 
                onClick={() => handleAsyncOperation(() => simulateApiCall('validation'))}
                loading={loading}
              >
                测试验证错误
              </Button>
              <Button 
                onClick={() => handleAsyncOperation(() => simulateApiCall('network'))}
                loading={loading}
              >
                测试网络错误
              </Button>
              <Button 
                onClick={() => handleAsyncOperation(() => simulateApiCall('server'))}
                loading={loading}
              >
                测试服务器错误
              </Button>
              <Button 
                type="primary" 
                onClick={runValidationTests}
                loading={loading}
              >
                运行所有测试
              </Button>
            </Space>

            {loading && (
              <div style={{ marginTop: 16 }}>
                <OperationProgress
                  title="正在执行测试..."
                  progress={progress}
                  status={progress === 100 ? 'success' : 'active'}
                  description="请等待测试完成"
                />
              </div>
            )}

            {testResults.tests.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  type={testResults.errors === 0 ? 'success' : 'warning'}
                  message={`测试结果：${testResults.success} 成功，${testResults.errors} 失败`}
                  description={
                    <ul>
                      {testResults.tests.map((test, index) => (
                        <li key={index}>
                          <Text type={test.status === 'success' ? 'success' : 'danger'}>
                            {test.name}: {test.message}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  }
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="错误边界测试" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Button 
              danger={shouldError}
              onClick={() => setShouldError(!shouldError)}
            >
              {shouldError ? '停止错误' : '触发组件错误'}
            </Button>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              点击按钮来测试错误边界功能
            </Text>
          </div>
          
          <div style={{ border: '1px dashed #d9d9d9', padding: '16px', borderRadius: '6px' }}>
            <Text strong>受保护的组件区域：</Text>
            <div style={{ marginTop: 8 }}>
              <ErrorBoundary level="widget">
                <SafeErrorTestComponent shouldError={shouldError} />
              </ErrorBoundary>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="用户反馈组件测试">
        <Row gutter={16}>
          <Col span={8}>
            <UserFeedbackCard
              success
              title="操作成功"
              onDismiss={() => console.log('成功消息已关闭')}
            >
              <Text>这是成功状态的用户反馈卡片。</Text>
            </UserFeedbackCard>
          </Col>
          <Col span={8}>
            <UserFeedbackCard
              error={{
                type: 'VALIDATION' as any,
                level: 'WARNING' as any,
                message: '表单验证失败',
                details: '请检查输入的数据格式',
                field: 'email',
                timestamp: new Date(),
                context: {
                  validationErrors: {
                    email: ['邮箱格式不正确'],
                    phone: ['手机号码必填'],
                  }
                }
              }}
              onDismiss={() => console.log('错误消息已关闭')}
              showDetails={true}
            />
          </Col>
          <Col span={8}>
            <UserFeedbackCard
              loading
              title="正在处理您的请求"
            >
              <Text>这是加载状态的用户反馈卡片。</Text>
            </UserFeedbackCard>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ValidationTestPage;