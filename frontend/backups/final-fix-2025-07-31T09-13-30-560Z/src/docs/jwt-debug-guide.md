# JWT调试指南

## 概述

这个JWT调试系统提供了全面的工具来排查前端各模块JWT的正常与否。它包含了多个层次的调试工具和方法。

## 组件说明

### 1. JWT调试器 (`jwtDebugger`)

核心调试工具，提供以下功能：
- JWT token解析和验证
- 过期时间检查
- 用户信息提取
- 模块调用记录
- API测试功能

### 2. JWT调试面板 (`JWTDebugPanel`)

可视化调试界面，包含：
- JWT状态概览
- 用户信息显示
- API测试工具
- Token详情查看
- 调试历史记录

### 3. JWT调试按钮 (`JWTDebugButton`)

浮动调试按钮：
- 仅在开发环境显示
- 有问题时显示红色徽章
- 点击打开调试面板

### 4. JWT状态Hook (`useJWTStatus`)

React Hook，提供：
- 实时JWT状态监控
- 自动刷新功能
- Storage变化监听
- 页面焦点变化检查

### 5. 增强请求工具 (`enhancedRequest`)

带调试功能的请求库：
- 自动记录模块调用
- 请求/响应日志
- JWT认证失败处理

## 使用方法

### 基本使用

#### 1. 控制台调试

```typescript
// 检查特定模块的JWT状态
checkJWT('DocumentList');

// 测试JWT有效性
await testJWT('/api/v1/users/profile');

// 生成调试报告
console.log(getJWTReport());
```

#### 2. 在组件中使用Hook

```typescript
import { useJWTStatus } from '../hooks/useJWTStatus';

const MyComponent = () => {
  const {
    hasToken,
    isValid,
    isExpired,
    hasErrors,
    userInfo,
    refresh,
    testJWT
  } = useJWTStatus({
    moduleName: 'MyComponent',
    checkInterval: 30000,
    autoRefresh: true
  });

  if (hasErrors) {
    console.warn('JWT有问题，需要检查');
  }

  return (
    <div>
      <p>Token状态: {isValid ? '有效' : '无效'}</p>
      <p>用户: {userInfo?.username}</p>
      <button onClick={refresh}>刷新状态</button>
    </div>
  );
};
```

#### 3. 在服务中使用增强请求

```typescript
import { createModuleRequest } from '../utils/enhancedRequest';

// 创建特定模块的请求实例
const documentRequest = createModuleRequest('DocumentService');

// 使用时会自动记录JWT调试信息
const fetchDocuments = async () => {
  const response = await documentRequest.get('/api/v1/documents');
  return response.data;
};
```

#### 4. 手动记录调试信息

```typescript
import { jwtDebugger } from '../utils/jwtDebugger';

const MyService = {
  async getData() {
    // 记录模块调用
    jwtDebugger.logModuleJWTStatus('MyService.getData');
    
    // 执行业务逻辑
    const response = await fetch('/api/data');
    
    // 在开发环境下打印详细信息
    if (process.env.NODE_ENV === 'development') {
      jwtDebugger.printJWTStatus('MyService.getData');
    }
    
    return response.data;
  }
};
```

### 高级用法

#### 1. 检查特定模块的认证问题

```typescript
// 在组件加载时检查
useEffect(() => {
  const status = jwtDebugger.checkJWTStatus();
  if (!status.isValid) {
    console.error('认证失败，原因:', status.errors);
    // 处理认证失败
  }
}, []);
```

#### 2. 批量测试多个API端点

```typescript
const testAllEndpoints = async () => {
  const endpoints = [
    '/api/v1/users/profile',
    '/api/v1/documents',
    '/api/v1/projects'
  ];
  
  for (const endpoint of endpoints) {
    const result = await jwtDebugger.testJWTWithAPI(endpoint);
    console.log(`${endpoint}: ${result.success ? '成功' : '失败'}`);
  }
};
```

#### 3. 监听认证状态变化

```typescript
const useAuthStateMonitor = () => {
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const status = jwtDebugger.checkJWTStatus();
      if (status.isExpired) {
        // 处理token过期
        alert('登录已过期，请重新登录');
        window.location.href = '/login';
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(checkInterval);
  }, []);
};
```

## 排查步骤

### 1. 检查基本状态

1. 打开浏览器开发者工具
2. 查看浮动调试按钮是否显示红色徽章
3. 点击调试按钮打开面板
4. 查看JWT状态概览

### 2. 分析具体问题

根据面板显示的信息：

- **无Token**: localStorage中没有token，需要登录
- **Token无效**: token格式错误，可能被篡改
- **Token过期**: 需要刷新token或重新登录
- **认证失败**: 检查后端认证逻辑

### 3. 测试API连通性

1. 在调试面板中输入API端点
2. 点击测试按钮
3. 查看返回结果和状态码

### 4. 查看调试历史

在面板的调试历史部分可以看到：
- 哪些模块调用了JWT
- 调用时间
- 当时的状态

### 5. 控制台排查

```typescript
// 快速检查
console.log('JWT状态:', jwtDebugger.checkJWTStatus());

// 详细调试
jwtDebugger.printJWTStatus('手动检查');

// 生成完整报告
console.log(jwtDebugger.generateDebugReport());
```

## 常见问题和解决方法

### 1. Token突然无效

**可能原因**:
- Token被清除
- Token格式损坏
- 服务器时间不同步

**排查方法**:
```typescript
const status = jwtDebugger.checkJWTStatus();
console.log('Token错误:', status.errors);
```

### 2. 认证间歇性失败

**可能原因**:
- 网络问题
- 服务器负载
- Token即将过期

**排查方法**:
```typescript
// 连续测试多次
for (let i = 0; i < 5; i++) {
  const result = await jwtDebugger.testJWTWithAPI();
  console.log(`测试${i+1}:`, result.success);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 3. 某个模块认证失败

**排查方法**:
1. 检查该模块是否正确发送Authorization头
2. 查看网络请求中的Authorization头部
3. 使用模块特定的调试：

```typescript
// 针对特定模块调试
jwtDebugger.printJWTStatus('有问题的模块名');
```

## 开发环境配置

确保在开发环境中启用调试功能：

```typescript
// 在开发环境中全局暴露调试工具
if (process.env.NODE_ENV === 'development') {
  window.jwtDebugger = jwtDebugger;
  window.checkJWT = checkJWT;
  window.testJWT = testJWT;
}
```

## 生产环境注意事项

- JWT调试按钮不会在生产环境显示
- 控制台日志在生产环境会被最小化
- 敏感信息不会被记录到调试历史中

## 总结

这个JWT调试系统提供了全面的工具来排查认证问题：

1. **可视化面板** - 快速查看状态
2. **实时监控** - Hook自动检查
3. **详细日志** - 控制台调试信息
4. **API测试** - 验证连通性
5. **历史记录** - 追踪问题出现时间

通过这些工具，可以快速定位和解决JWT相关的认证问题。