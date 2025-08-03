/**
 * JWT调试工具 - 用于排查前端各模块JWT的正常与否
 */

interface JWTPayload {
  user_id: number;
  username: string;
  role: string;
  user_type: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
}

interface JWTStatus {
  hasToken: boolean;
  token?: string;
  isValid: boolean;
  isExpired: boolean;
  payload?: JWTPayload;
  expiresIn?: number;
  errors: string[];
}

interface ModuleJWTStatus {
  moduleName: string;
  status: JWTStatus;
  timestamp: string;
}

class JWTDebugger {
  private static instance: JWTDebugger;
  private debugHistory: ModuleJWTStatus[] = [];

  static getInstance(): JWTDebugger {
    if (!JWTDebugger.instance) {
      JWTDebugger.instance = new JWTDebugger();
    }
    return JWTDebugger.instance;
  }

  /**
   * 检查JWT token的状态
   */
  checkJWTStatus(): JWTStatus {
    const token = localStorage.getItem('token');
    const status: JWTStatus = {
      hasToken: !!token,
      token: token || undefined,
      isValid: false,
      isExpired: false,
      errors: []
    };

    if (!token) {
      status.errors.push('未找到token');
      return status;
    }

    try {
      // 解析JWT payload
      const payload = this.parseJWT(token);
      status.payload = payload;
      status.isValid = true;

      // 检查是否过期
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        status.isExpired = true;
        status.errors.push('Token已过期');
      } else if (payload.exp) {
        status.expiresIn = payload.exp - currentTime;
      }

      // 检查not before
      if (payload.nbf && payload.nbf > currentTime) {
        status.errors.push('Token尚未生效');
      }

    } catch (error) {
      status.isValid = false;
      status.errors.push(`Token解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return status;
  }

  /**
   * 为特定模块记录JWT状态
   */
  logModuleJWTStatus(moduleName: string): ModuleJWTStatus {
    const status = this.checkJWTStatus();
    const moduleStatus: ModuleJWTStatus = {
      moduleName,
      status,
      timestamp: new Date().toISOString()
    };

    this.debugHistory.push(moduleStatus);
    
    // 保持历史记录不超过100条
    if (this.debugHistory.length > 100) {
      this.debugHistory = this.debugHistory.slice(-100);
    }

    return moduleStatus;
  }

  /**
   * 解析JWT token
   */
  private parseJWT(token: string): JWTPayload {
    try {
      // JWT格式: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT格式不正确');
      }

      // 解码payload (base64url)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error(`JWT解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取调试历史
   */
  getDebugHistory(): ModuleJWTStatus[] {
    return [...this.debugHistory];
  }

  /**
   * 清除调试历史
   */
  clearDebugHistory(): void {
    this.debugHistory = [];
  }

  /**
   * 打印JWT状态到控制台（带格式化）
   */
  printJWTStatus(moduleName: string): void {
    const moduleStatus = this.logModuleJWTStatus(moduleName);
    const { status } = moduleStatus;

    console.group(`🔍 JWT调试 - ${moduleName} (${moduleStatus.timestamp})`);
    
    if (status.payload) {
      .toLocaleString()}`);
      .toLocaleString()}`);
      if (status.expiresIn) {
        const hours = Math.floor(status.expiresIn / 3600);
        const minutes = Math.floor((status.expiresIn % 3600) / 60);
        }
    }

    if (status.errors.length > 0) {
      status.errors.forEach(error => );
    }

    if (status.token) {
      }...`);
    }

    console.groupEnd();
  }

  /**
   * 检查API请求头中是否包含正确的Authorization
   */
  checkAuthorizationHeader(): { hasHeader: boolean; headerValue?: string; isValid: boolean } {
    const token = localStorage.getItem('token');
    const expectedHeader = token ? `Bearer ${token}` : undefined;
    
    return {
      hasHeader: !!token,
      headerValue: expectedHeader,
      isValid: !!token && token.length > 0
    };
  }

  /**
   * 模拟API请求测试JWT
   */
  async testJWTWithAPI(endpoint: string = '/api/v1/users/profile'): Promise<{
    success: boolean;
    status: number;
    message: string;
    responseData?: any;
  }> {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return {
        success: false,
        status: 0,
        message: 'No token found'
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'JWT验证成功' : responseData.message || `HTTP ${response.status}`,
        responseData
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 生成JWT调试报告
   */
  generateDebugReport(): string {
    const status = this.checkJWTStatus();
    const authHeader = this.checkAuthorizationHeader();
    
    let report = '=== JWT调试报告 ===\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;
    
    report += '1. JWT基本状态:\n';
    report += `   - 是否有Token: ${status.hasToken}\n`;
    report += `   - Token有效性: ${status.isValid}\n`;
    report += `   - 是否过期: ${status.isExpired}\n`;
    
    if (status.payload) {
      report += '\n2. 用户信息:\n';
      report += `   - 用户ID: ${status.payload.user_id}\n`;
      report += `   - 用户名: ${status.payload.username}\n`;
      report += `   - 角色: ${status.payload.role}\n`;
      report += `   - 用户类型: ${status.payload.user_type}\n`;
    }
    
    report += '\n3. 请求头状态:\n';
    report += `   - 是否有Authorization头: ${authHeader.hasHeader}\n`;
    report += `   - 头部值有效性: ${authHeader.isValid}\n`;
    
    if (status.errors.length > 0) {
      report += '\n4. 错误信息:\n';
      status.errors.forEach(error => {
        report += `   - ${error}\n`;
      });
    }
    
    if (this.debugHistory.length > 0) {
      report += '\n5. 最近模块调用:\n';
      this.debugHistory.slice(-5).forEach(history => {
        report += `   - ${history.moduleName}: ${history.status.isValid ? '有效' : '无效'} (${history.timestamp})\n`;
      });
    }
    
    return report;
  }
}

// 导出单例实例
export const jwtDebugger = JWTDebugger.getInstance();

// 导出便捷函数
export const checkJWT = (moduleName: string) => jwtDebugger.printJWTStatus(moduleName);
export const testJWT = (endpoint?: string) => jwtDebugger.testJWTWithAPI(endpoint);
export const getJWTReport = () => jwtDebugger.generateDebugReport();

// 在开发环境下将调试器挂载到window对象
if (process.env.NODE_ENV === 'development') {
  (window as unknown).jwtDebugger = jwtDebugger;
  (window as unknown).checkJWT = checkJWT;
  (window as unknown).testJWT = testJWT;
  (window as unknown).getJWTReport = getJWTReport;
}

export default jwtDebugger;