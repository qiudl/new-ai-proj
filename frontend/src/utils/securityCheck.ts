/**
 * 安全检查工具
 * 检测和强制安全策略
 */

/**
 * 检查并确保HTTPS连接
 * 在生产环境下，如果检测到HTTP连接，将自动重定向到HTTPS
 */
export const ensureHTTPS = (): void => {
  // 仅在生产环境检查
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // 检查当前协议
  if (window.location.protocol !== 'https:') {
    console.warn('[Security] Insecure connection detected, redirecting to HTTPS...');

    // 自动重定向到HTTPS
    const httpsUrl = window.location.href.replace('http:', 'https:');
    window.location.href = httpsUrl;
  }
};

/**
 * 检查API请求是否使用HTTPS
 * @param url 请求URL
 * @returns 是否为安全连接
 */
export const isSecureRequest = (url: string): boolean => {
  // 相对路径认为是安全的(继承页面协议)
  if (!url.startsWith('http')) {
    return window.location.protocol === 'https:';
  }

  // 绝对路径检查协议
  return url.startsWith('https://');
};

/**
 * 验证敏感API请求的安全性
 * @param url 请求URL
 * @throws Error 如果在生产环境使用不安全连接
 */
export const validateSecureRequest = (url: string): void => {
  if (process.env.NODE_ENV === 'production' && !isSecureRequest(url)) {
    throw new Error('Insecure connection: HTTPS is required for API requests in production');
  }
};

/**
 * 敏感API端点列表
 */
const SENSITIVE_ENDPOINTS = [
  '/api/v1/system/ai-configs',
  '/api/v1/system/api-keys',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
];

/**
 * 检查是否为敏感API端点
 * @param url 请求URL
 * @returns 是否为敏感端点
 */
export const isSensitiveEndpoint = (url: string): boolean => {
  return SENSITIVE_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

/**
 * 为敏感API请求添加安全检查
 * @param url 请求URL
 * @throws Error 如果敏感端点使用不安全连接
 */
export const checkSensitiveRequest = (url: string): void => {
  if (isSensitiveEndpoint(url)) {
    validateSecureRequest(url);
  }
};

/**
 * 显示安全警告
 * @param message 警告消息
 */
export const showSecurityWarning = (message: string): void => {
  console.warn(`[Security Warning] ${message}`);

  // 可以集成到UI通知系统
  if (typeof window !== 'undefined' && (window as any).showNotification) {
    (window as any).showNotification({
      type: 'warning',
      message: `安全警告: ${message}`,
      duration: 5000,
    });
  }
};

/**
 * 初始化安全检查
 * 应在应用启动时调用
 */
export const initSecurityCheck = (): void => {
  // 确保HTTPS
  ensureHTTPS();

  // 监听协议变化(如果浏览器降级到HTTP)
  if (typeof window !== 'undefined') {
    const checkInterval = setInterval(() => {
      if (window.location.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        showSecurityWarning('检测到不安全的连接，正在重定向到HTTPS...');
        ensureHTTPS();
        clearInterval(checkInterval);
      }
    }, 5000);

    // 5分钟后停止检查
    setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
  }

  console.log('[Security] Security check initialized');
};

/**
 * 获取安全配置信息
 */
export const getSecurityInfo = () => {
  return {
    protocol: window.location.protocol,
    isSecure: window.location.protocol === 'https:',
    hostname: window.location.hostname,
    environment: process.env.NODE_ENV,
    securityCheckEnabled: process.env.NODE_ENV === 'production',
  };
};
