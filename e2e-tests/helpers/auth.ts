import { Page, APIRequestContext } from '@playwright/test';

/**
 * 测试辅助函数 - 认证相关
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: any;
}

/**
 * 通过UI登录
 */
export async function loginViaUI(page: Page, credentials: LoginCredentials): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 填写登录表单
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);

  // 提交登录
  await page.click('button[type="submit"]');

  // 等待登录成功
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * 通过API登录
 */
export async function loginViaAPI(
  request: APIRequestContext,
  credentials: LoginCredentials,
  baseURL: string = 'http://localhost:8080'
): Promise<AuthToken> {
  const response = await request.post(`${baseURL}/api/v1/auth/login`, {
    data: credentials
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
  }

  const data = await response.json();

  if (!data.data?.token) {
    throw new Error('No token in login response');
  }

  return {
    token: data.data.token,
    user: data.data.user
  };
}

/**
 * 系统管理员默认凭证
 */
export const ADMIN_CREDENTIALS: LoginCredentials = {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

/**
 * 检查是否为系统管理员
 */
export function isSystemAdmin(user: any): boolean {
  return user?.role === 'admin' && user?.user_type === 'system';
}
