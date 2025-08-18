// 统一的环境检测工具
// 解决Docker环境与本地开发环境的标识混乱问题

export interface EnvironmentInfo {
  text: string;
  color: string;
  port: string;
  detail: string;
  actualEnv: 'local-dev' | 'docker-test' | 'production';
}

/**
 * 获取当前访问端口
 */
export const getCurrentPort = (): string => {
  return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
};

/**
 * 检测当前运行环境
 * 优先级：端口判断 > 环境变量
 */
export const detectEnvironment = (): EnvironmentInfo => {
  const currentPort = getCurrentPort();
  const isLocalDev = process.env.REACT_APP_LOCAL_DEV === 'true';
  const envVariable = process.env.REACT_APP_ENV || 'production';
  
  // 调试信息（开发时使用）
  if (process.env.REACT_APP_DEBUG === 'true') {
    console.log('Environment Detection Debug:', {
      currentPort,
      isLocalDev,
      envVariable,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    });
  }
  
  // 端口3001 = 本地开发环境（本机PostgreSQL + Go后端8081端口）
  if (currentPort === '3001') {
    return {
      text: '本地开发环境',
      color: '#52c41a',
      port: '3001',
      detail: '本机PostgreSQL端口5433',
      actualEnv: 'local-dev'
    };
  }
  
  // 端口80或3000 = Docker测试环境（Docker Compose架构）
  if (currentPort === '80' || currentPort === '3000') {
    return {
      text: '测试环境',
      color: '#1890ff', 
      port: 'nginx端口80',
      detail: 'Docker Compose架构',
      actualEnv: 'docker-test'
    };
  }
  
  // 端口443或其他HTTPS端口 = 生产环境
  if (currentPort === '443' || window.location.protocol === 'https:') {
    return {
      text: '生产环境',
      color: '#fa541c',
      port: currentPort,
      detail: '生产服务器',
      actualEnv: 'production'
    };
  }
  
  // 其他端口根据环境变量判断
  if (envVariable === 'development' && isLocalDev) {
    return {
      text: '本地开发环境',
      color: '#52c41a',
      port: currentPort,
      detail: '自定义端口开发环境',
      actualEnv: 'local-dev'
    };
  }
  
  // 支持test和staging都识别为测试环境
  if (envVariable === 'test' || envVariable === 'staging') {
    return {
      text: '测试环境',
      color: '#1890ff',
      port: currentPort,
      detail: envVariable === 'staging' ? 'Docker测试环境' : '测试服务器',
      actualEnv: 'docker-test'
    };
  }
  
  // 默认识别为生产环境
  return {
    text: '生产环境',
    color: '#fa541c',
    port: currentPort,
    detail: '未知环境，默认生产',
    actualEnv: 'production'
  };
};

/**
 * 获取环境配置信息
 */
export const getEnvironmentConfig = () => {
  const env = detectEnvironment();
  
  // 前端JavaScript运行在浏览器中，不是Docker容器内
  // 根据访问端口和环境变量确定API地址
  let apiBaseURL: string;
  
  if (env.actualEnv === 'local-dev' || env.actualEnv === 'docker-test') {
    // 开发和测试环境，使用localhost:8081访问后端
    apiBaseURL = 'http://localhost:8081/api/v1';
  } else {
    // 生产环境，使用相对路径通过反向代理
    apiBaseURL = '/api/v1';
  }
  
  return {
    ...env,
    isLocal: env.actualEnv === 'local-dev',
    isDocker: env.actualEnv === 'docker-test', 
    isProduction: env.actualEnv === 'production',
    apiBaseURL
  };
};

/**
 * 创建环境标识组件的属性
 */
export const createEnvironmentTagProps = (size: 'small' | 'normal' | 'large' = 'normal') => {
  const env = detectEnvironment();
  
  const sizeConfig = {
    small: { fontSize: '12px', padding: '4px 8px' },
    normal: { fontSize: '16px', padding: '10px 20px' },
    large: { fontSize: '18px', padding: '12px 24px' }
  };
  
  return {
    color: env.color,
    style: {
      ...sizeConfig[size],
      fontWeight: 'bold' as const,
      borderRadius: '8px',
      border: 'none',
      marginBottom: '8px'
    },
    title: `当前环境: ${env.text} (${env.port}) - ${env.detail}`
  };
};