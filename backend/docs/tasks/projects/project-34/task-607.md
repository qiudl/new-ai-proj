# 任务607：端到端测试自动化框架搭建

## 1. 框架概述

### 1.1 项目背景
基于李宁团购管理平台的技术栈特点和业务复杂性，设计并搭建一套完整的端到端测试自动化框架，支持前台用户端、后台管理端和系统集成的全方位自动化测试，确保系统质量和持续交付能力。

### 1.2 技术栈特点
- **前端技术**: Vue 3 + TypeScript + Ant Design Vue + Vite
- **后端技术**: Go + Gin + GORM + MySQL + Redis
- **业务特点**: B2B团购平台，多角色权限，复杂审批流程
- **集成复杂度**: 李宁OMS集成、供应链集成、第三方服务集成

### 1.3 框架目标
- **全覆盖**: 支持UI、API、集成等多层次测试
- **高稳定**: 减少测试脆弱性，提高维护性
- **易扩展**: 支持新功能快速添加测试用例
- **CI/CD友好**: 无缝集成到持续集成流水线

## 2. E2E测试框架架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Testing Framework                    │
├─────────────────────────────────────────────────────────────┤
│  Test Layer                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ UI Tests    │ │ API Tests   │ │ Integration Tests       ││
│  │ - Frontend  │ │ - Backend   │ │ - OMS Integration       ││
│  │ - Admin     │ │ - Database  │ │ - Payment Integration   ││
│  │ - Mobile    │ │ - Cache     │ │ - SMS Integration       ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Page Object Model (POM) Layer                             │
│  ┌──────────────────────────────────────────────────────────│
│  │ Page Objects │ API Clients │ Test Data Models          ││
│  │ - LoginPage  │ - UserAPI   │ - UserModel               ││
│  │ - DashPage   │ - OrderAPI  │ - OrderModel              ││
│  │ - OrderPage  │ - ProductAPI│ - ProductModel            ││
│  └──────────────────────────────────────────────────────────│
├─────────────────────────────────────────────────────────────┤
│  Utilities & Support Layer                                 │
│  ┌──────────────────────────────────────────────────────────│
│  │ Test Utils   │ Data Factory│ Config Manager           ││
│  │ - DBUtils    │ - UserFactory│ - EnvConfig              ││
│  │ - APIUtils   │ - OrderFactory│ - TestConfig            ││
│  │ - FileUtils  │ - DataCleanup│ - ReportConfig          ││
│  └──────────────────────────────────────────────────────────│
├─────────────────────────────────────────────────────────────┤
│  Test Framework Core                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Playwright  │ │ Postman/    │ │ Custom Fixtures         ││
│  │ - Browser   │ │ Newman      │ │ - Auth Fixtures         ││
│  │ - Mobile    │ │ - API Tests │ │ - Data Fixtures         ││
│  │ - Multi-OS  │ │ - Collections│ │ - Environment Setup     ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  CI/CD Integration Layer                                   │
│  ┌──────────────────────────────────────────────────────────│
│  │ GitHub Actions│ Docker     │ Report Generation        ││
│  │ - Workflow   │ - Test Env │ - Allure Reports         ││
│  │ - Triggers   │ - Data Setup│ - HTML/JSON Reports      ││
│  │ - Artifacts  │ - Cleanup   │ - Slack Notifications    ││
│  └──────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

#### 2.2.1 UI自动化测试工具
**主选：Playwright**
- **优势**：
  - 现代化的自动化框架，支持Chromium、Firefox、Safari
  - 原生支持TypeScript，与项目技术栈一致
  - 强大的等待机制，减少flaky tests
  - 内置截图、视频录制、网络拦截功能
  - 支持移动端测试和跨浏览器测试

**配置示例**：
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['allure-playwright'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

#### 2.2.2 API测试工具
**主选：Postman + Newman**
- **优势**：
  - 团队熟悉度高，学习成本低
  - 支持复杂的API测试场景
  - 环境变量管理完善
  - 支持数据驱动测试
  - Newman支持命令行执行

**备选：Playwright API Testing**
```typescript
// api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User API Tests', () => {
  test('should create user successfully', async ({ request }) => {
    const response = await request.post('/api/v1/users', {
      data: {
        username: 'testuser',
        email: 'test@example.com'
      },
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`
      }
    });
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.code).toBe(0);
  });
});
```

### 2.3 Page Object Model (POM) 设计

#### 2.3.1 基础Page类设计
```typescript
// base/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  protected page: Page;
  protected url: string;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
  }

  async goto() {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `screenshots/${name}.png`,
      fullPage: true 
    });
  }

  // 通用等待方法
  async waitForSelector(selector: string, options?: any) {
    return await this.page.waitForSelector(selector, options);
  }

  // 通用点击方法
  async click(selector: string) {
    await this.page.click(selector);
  }

  // 通用输入方法
  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }
}
```

#### 2.3.2 登录页面Page Object
```typescript
// pages/LoginPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  // 页面元素定位器
  private readonly usernameInput = this.page.locator('input[name="username"]');
  private readonly passwordInput = this.page.locator('input[name="password"]');
  private readonly captchaInput = this.page.locator('input[name="code"]');
  private readonly captchaImage = this.page.locator('.captchaBase');
  private readonly loginButton = this.page.locator('button[type="submit"]');
  private readonly errorMessage = this.page.locator('.ant-alert-error');

  constructor(page: Page) {
    super(page, '/login');
  }

  // 页面交互方法
  async login(username: string, password: string, captcha: string = '1234') {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.captchaInput.fill(captcha);
    await this.loginButton.click();
  }

  async refreshCaptcha() {
    await this.captchaImage.click();
    await this.page.waitForTimeout(1000); // 等待验证码刷新
  }

  // 验证方法
  async verifyLoginSuccess() {
    await expect(this.page).toHaveURL(/dashboard/);
    await expect(this.page.locator('.user-info')).toBeVisible();
  }

  async verifyLoginError(expectedError: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedError);
  }

  async verifyPageElements() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.captchaInput).toBeVisible();
    await expect(this.captchaImage).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
```

#### 2.3.3 用户管理页面Page Object
```typescript
// pages/UserManagePage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class UserManagePage extends BasePage {
  // 页面元素
  private readonly addButton = this.page.locator('button:has-text("新增用户")');
  private readonly searchInput = this.page.locator('input[placeholder*="搜索"]');
  private readonly searchButton = this.page.locator('button:has-text("搜索")');
  private readonly userTable = this.page.locator('.ant-table-tbody');
  private readonly paginationInfo = this.page.locator('.ant-pagination-total-text');

  // 用户表单对话框元素
  private readonly userDialog = this.page.locator('.ant-modal');
  private readonly usernameInput = this.userDialog.locator('input[name="username"]');
  private readonly nameInput = this.userDialog.locator('input[name="name"]');
  private readonly phoneInput = this.userDialog.locator('input[name="phone"]');
  private readonly emailInput = this.userDialog.locator('input[name="email"]');
  private readonly saveButton = this.userDialog.locator('button:has-text("保存")');
  private readonly cancelButton = this.userDialog.locator('button:has-text("取消")');

  constructor(page: Page) {
    super(page, '/system/user');
  }

  async clickAddUser() {
    await this.addButton.click();
    await expect(this.userDialog).toBeVisible();
  }

  async fillUserForm(userData: {
    username: string;
    name: string;
    phone: string;
    email: string;
  }) {
    await this.usernameInput.fill(userData.username);
    await this.nameInput.fill(userData.name);
    await this.phoneInput.fill(userData.phone);
    await this.emailInput.fill(userData.email);
  }

  async saveUser() {
    await this.saveButton.click();
    await expect(this.userDialog).toBeHidden();
  }

  async searchUser(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.page.waitForResponse(response => 
      response.url().includes('/api/v1/users') && response.status() === 200
    );
  }

  async verifyUserInTable(username: string) {
    const userRow = this.userTable.locator(`tr:has-text("${username}")`);
    await expect(userRow).toBeVisible();
  }

  async deleteUser(username: string) {
    const userRow = this.userTable.locator(`tr:has-text("${username}")`);
    const deleteButton = userRow.locator('button:has-text("删除")');
    await deleteButton.click();
    
    // 确认删除对话框
    const confirmButton = this.page.locator('.ant-popconfirm button:has-text("确定")');
    await confirmButton.click();
  }
}
```

## 3. 测试数据管理策略

### 3.1 测试数据工厂模式

```typescript
// factories/UserFactory.ts
import { faker } from '@faker-js/faker/locale/zh_CN';

export interface UserData {
  username: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  department?: string;
  role?: string;
}

export class UserFactory {
  static create(overrides: Partial<UserData> = {}): UserData {
    return {
      username: faker.internet.userName(),
      name: faker.person.fullName(),
      phone: faker.phone.number('138########'),
      email: faker.internet.email(),
      password: 'Test123456',
      department: '销售部',
      role: '销售员',
      ...overrides
    };
  }

  static createBatch(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createAdmin(): UserData {
    return this.create({
      username: 'admin_' + faker.string.numeric(4),
      role: '系统管理员',
      department: '技术部'
    });
  }

  static createSalesManager(): UserData {
    return this.create({
      username: 'sales_mgr_' + faker.string.numeric(4),
      role: '销售经理',
      department: '销售部'
    });
  }
}
```

### 3.2 数据库操作工具

```typescript
// utils/DatabaseUtils.ts
import mysql from 'mysql2/promise';

export class DatabaseUtils {
  private connection: mysql.Connection;

  constructor(config: mysql.ConnectionOptions) {
    this.connection = mysql.createConnection(config);
  }

  async cleanup() {
    // 清理测试数据
    const tables = [
      'sys_users', 
      'sys_roles', 
      'oms_orders', 
      'pms_products'
    ];

    for (const table of tables) {
      await this.connection.execute(
        `DELETE FROM ${table} WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`
      );
    }
  }

  async seedTestData() {
    // 插入基础测试数据
    await this.insertTestUsers();
    await this.insertTestProducts();
    await this.insertTestOrders();
  }

  private async insertTestUsers() {
    const users = UserFactory.createBatch(10);
    for (const user of users) {
      await this.connection.execute(
        `INSERT INTO sys_users (username, name, phone, email, password_hash) 
         VALUES (?, ?, ?, ?, ?)`,
        [user.username, user.name, user.phone, user.email, hashPassword(user.password)]
      );
    }
  }

  async findUserByUsername(username: string) {
    const [rows] = await this.connection.execute(
      'SELECT * FROM sys_users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  async close() {
    await this.connection.end();
  }
}
```

### 3.3 Redis缓存操作工具

```typescript
// utils/RedisUtils.ts
import Redis from 'ioredis';

export class RedisUtils {
  private redis: Redis;

  constructor(config: any) {
    this.redis = new Redis(config);
  }

  async clearTestCache() {
    // 清理测试相关的缓存
    const keys = await this.redis.keys('test:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async setUserToken(userId: string, token: string) {
    await this.redis.setex(`test:token:${userId}`, 7200, token);
  }

  async getUserToken(userId: string): Promise<string | null> {
    return await this.redis.get(`test:token:${userId}`);
  }

  async close() {
    await this.redis.quit();
  }
}
```

## 4. 测试环境管理

### 4.1 环境配置管理

```typescript
// config/TestConfig.ts
export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
  apiUrl: string;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  auth: {
    defaultUser: {
      username: string;
      password: string;
    };
    adminUser: {
      username: string;
      password: string;
    };
  };
  timeouts: {
    default: number;
    api: number;
    page: number;
  };
}

export class TestConfig {
  private static instance: TestConfig;
  private config: EnvironmentConfig;

  private constructor() {
    const env = process.env.TEST_ENV || 'local';
    this.config = this.loadConfig(env);
  }

  static getInstance(): TestConfig {
    if (!TestConfig.instance) {
      TestConfig.instance = new TestConfig();
    }
    return TestConfig.instance;
  }

  private loadConfig(env: string): EnvironmentConfig {
    const configs = {
      local: {
        name: 'local',
        baseUrl: 'http://localhost:5173',
        apiUrl: 'http://localhost:8080',
        database: {
          host: 'localhost',
          port: 3306,
          database: 'tuangou_test',
          username: 'root',
          password: 'password'
        },
        redis: {
          host: 'localhost',
          port: 6379
        },
        auth: {
          defaultUser: { username: 'user1', password: '123456' },
          adminUser: { username: 'admin', password: 'admin123' }
        },
        timeouts: {
          default: 30000,
          api: 10000,
          page: 60000
        }
      },
      staging: {
        name: 'staging',
        baseUrl: 'https://staging.tuangou.example.com',
        apiUrl: 'https://api-staging.tuangou.example.com',
        // ... 其他配置
      },
      production: {
        name: 'production',
        baseUrl: 'https://tuangou.lining.com',
        apiUrl: 'https://api.tuangou.lining.com',
        // ... 其他配置
      }
    };

    return configs[env] || configs.local;
  }

  get(): EnvironmentConfig {
    return this.config;
  }
}
```

### 4.2 Docker测试环境

```dockerfile
# docker/Dockerfile.test
FROM node:18-alpine

WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 设置Playwright环境变量
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 复制package文件
COPY package*.json ./
RUN npm ci

# 复制测试代码
COPY tests/ ./tests/
COPY playwright.config.ts ./

# 运行测试
CMD ["npm", "run", "test:e2e"]
```

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  e2e-tests:
    build:
      context: .
      dockerfile: docker/Dockerfile.test
    environment:
      - TEST_ENV=docker
      - BASE_URL=http://frontend:5173
      - API_URL=http://backend:8080
    depends_on:
      - frontend
      - backend
      - mysql
      - redis
    volumes:
      - ./test-results:/app/test-results
      - ./screenshots:/app/screenshots

  frontend:
    build:
      context: ./tuangou-admin
    ports:
      - "5173:5173"
    environment:
      - VITE_APP_BASE_API_DEV=http://backend:8080

  backend:
    build:
      context: ./tuangou
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=tuangou_test
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mysql_data:
```

## 5. 测试套件组织

### 5.1 测试分层结构

```
tests/
├── e2e/                        # 端到端测试
│   ├── frontend/              # 前台用户端测试
│   │   ├── auth/              # 认证相关
│   │   │   ├── login.spec.ts
│   │   │   └── permissions.spec.ts
│   │   ├── products/          # 商品相关
│   │   │   ├── browse.spec.ts
│   │   │   └── search.spec.ts
│   │   └── orders/            # 订单相关
│   │       ├── create.spec.ts
│   │       └── manage.spec.ts
│   ├── admin/                 # 后台管理端测试
│   │   ├── system/            # 系统管理
│   │   │   ├── users.spec.ts
│   │   │   └── roles.spec.ts
│   │   ├── business/          # 业务管理
│   │   │   ├── products.spec.ts
│   │   │   └── orders.spec.ts
│   │   └── data/              # 数据管理
│   │       ├── import.spec.ts
│   │       └── export.spec.ts
│   └── integration/           # 集成测试
│       ├── api/               # API集成
│       │   ├── auth.spec.ts
│       │   └── business.spec.ts
│       └── third-party/       # 第三方集成
│           ├── oms.spec.ts
│           └── payment.spec.ts
├── api/                       # API测试
│   ├── collections/           # Postman集合
│   │   ├── auth.json
│   │   ├── users.json
│   │   └── orders.json
│   └── environments/          # 环境配置
│       ├── local.json
│       └── staging.json
├── fixtures/                  # 测试固件
│   ├── auth.ts               # 认证固件
│   ├── database.ts           # 数据库固件
│   └── setup.ts              # 全局设置
├── pages/                    # Page Objects
│   ├── base/
│   │   └── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── UserManagePage.ts
├── utils/                    # 工具类
│   ├── DatabaseUtils.ts
│   ├── RedisUtils.ts
│   └── ApiUtils.ts
├── factories/                # 数据工厂
│   ├── UserFactory.ts
│   ├── ProductFactory.ts
│   └── OrderFactory.ts
└── config/                   # 配置文件
    ├── TestConfig.ts
    └── environments/
        ├── local.ts
        ├── staging.ts
        └── production.ts
```

### 5.2 测试固件设计

```typescript
// fixtures/auth.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TestConfig } from '../config/TestConfig';

type AuthFixture = {
  loginPage: LoginPage;
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixture>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  authenticatedPage: async ({ page }, use) => {
    const config = TestConfig.getInstance().get();
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(
      config.auth.defaultUser.username,
      config.auth.defaultUser.password
    );
    await loginPage.verifyLoginSuccess();
    
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    const config = TestConfig.getInstance().get();
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(
      config.auth.adminUser.username,
      config.auth.adminUser.password
    );
    await loginPage.verifyLoginSuccess();
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

### 5.3 数据库固件

```typescript
// fixtures/database.ts
import { test as base } from '@playwright/test';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { RedisUtils } from '../utils/RedisUtils';
import { TestConfig } from '../config/TestConfig';

type DatabaseFixture = {
  db: DatabaseUtils;
  redis: RedisUtils;
};

export const test = base.extend<DatabaseFixture>({
  db: async ({}, use) => {
    const config = TestConfig.getInstance().get();
    const db = new DatabaseUtils(config.database);
    
    // 测试前清理数据
    await db.cleanup();
    await db.seedTestData();
    
    await use(db);
    
    // 测试后清理数据
    await db.cleanup();
    await db.close();
  },

  redis: async ({}, use) => {
    const config = TestConfig.getInstance().get();
    const redis = new RedisUtils(config.redis);
    
    // 测试前清理缓存
    await redis.clearTestCache();
    
    await use(redis);
    
    // 测试后清理缓存
    await redis.clearTestCache();
    await redis.close();
  },
});
```

## 6. CI/CD集成方案

### 6.1 GitHub Actions工作流

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点执行

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        npm ci
        npx playwright install --with-deps ${{ matrix.browser }}
        
    - name: Start test environment
      run: |
        docker-compose -f docker-compose.test.yml up -d
        sleep 30  # 等待服务启动
        
    - name: Wait for services
      run: |
        npx wait-on http://localhost:5173 --timeout 60000
        npx wait-on http://localhost:8080/health --timeout 60000
        
    - name: Run E2E tests
      run: |
        npm run test:e2e:${{ matrix.browser }}
      env:
        BASE_URL: http://localhost:5173
        API_URL: http://localhost:8080
        
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results-${{ matrix.browser }}
        path: |
          test-results/
          screenshots/
          videos/
          
    - name: Upload Allure results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: allure-results-${{ matrix.browser }}
        path: allure-results/
        
    - name: Stop test environment
      if: always()
      run: docker-compose -f docker-compose.test.yml down
      
  api-tests:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install Newman
      run: npm install -g newman newman-reporter-allure
      
    - name: Start backend services
      run: |
        docker-compose -f docker-compose.test.yml up -d backend mysql redis
        sleep 30
        
    - name: Run API tests
      run: |
        newman run tests/api/collections/auth.json \
          -e tests/api/environments/local.json \
          -r allure,cli \
          --reporter-allure-export allure-results
          
    - name: Upload API test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: api-test-results
        path: allure-results/
        
  generate-report:
    runs-on: ubuntu-latest
    needs: [e2e-tests, api-tests]
    if: always()
    
    steps:
    - name: Download all artifacts
      uses: actions/download-artifact@v4
      
    - name: Generate Allure report
      run: |
        npm install -g allure-commandline
        allure generate allure-results-*/ --clean -o allure-report
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./allure-report
        
    - name: Send Slack notification
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: 'E2E Tests Failed! Check the report for details.'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 6.2 测试报告生成

```typescript
// utils/ReportGenerator.ts
import allure from 'allure-js-commons';

export class ReportGenerator {
  static addEnvironmentInfo() {
    const config = TestConfig.getInstance().get();
    
    allure.addEnvironment('Environment', config.name);
    allure.addEnvironment('Base URL', config.baseUrl);
    allure.addEnvironment('API URL', config.apiUrl);
    allure.addEnvironment('Browser', process.env.BROWSER || 'chromium');
    allure.addEnvironment('OS', process.platform);
    allure.addEnvironment('Node Version', process.version);
  }

  static addTestCase(testName: string, testId: string) {
    allure.addTestId(testId);
    allure.addSeverity('normal');
    allure.addStory('User Management');
    allure.addFeature('System Administration');
  }

  static addStep(stepName: string, status: 'passed' | 'failed' | 'skipped') {
    allure.addStep(stepName, () => {
      // 步骤执行逻辑
    }, status);
  }

  static attachScreenshot(screenshotPath: string) {
    allure.addAttachment('Screenshot', screenshotPath, 'image/png');
  }

  static attachVideo(videoPath: string) {
    allure.addAttachment('Video', videoPath, 'video/webm');
  }
}
```

### 6.3 测试执行脚本

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:webkit": "playwright test --project=webkit",
    "test:e2e:mobile": "playwright test --project=mobile-chrome",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:api": "newman run tests/api/collections/*.json -e tests/api/environments/local.json",
    "test:smoke": "playwright test --grep='@smoke'",
    "test:regression": "playwright test --grep='@regression'",
    "test:parallel": "playwright test --workers=4",
    "report:generate": "allure generate allure-results --clean -o allure-report",
    "report:open": "allure open allure-report",
    "setup:test-env": "docker-compose -f docker-compose.test.yml up -d",
    "cleanup:test-env": "docker-compose -f docker-compose.test.yml down"
  }
}
```

## 7. 测试用例示例

### 7.1 前台用户端测试用例

```typescript
// tests/e2e/frontend/auth/login.spec.ts
import { test, expect } from '../../fixtures/auth';
import { UserFactory } from '../../factories/UserFactory';

test.describe('Frontend Login Tests', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('should login successfully with valid credentials @smoke', async ({ loginPage }) => {
    // Arrange
    const config = TestConfig.getInstance().get();
    
    // Act
    await loginPage.login(
      config.auth.defaultUser.username,
      config.auth.defaultUser.password
    );
    
    // Assert
    await loginPage.verifyLoginSuccess();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    // Arrange
    const invalidUser = UserFactory.create();
    
    // Act
    await loginPage.login(invalidUser.username, 'wrongpassword');
    
    // Assert
    await loginPage.verifyLoginError('用户名或密码错误');
  });

  test('should refresh captcha when clicked', async ({ loginPage }) => {
    // Act
    await loginPage.refreshCaptcha();
    
    // Assert - 验证验证码图片已更新
    // 这里需要比较刷新前后的图片或请求
  });
});
```

### 7.2 后台管理端测试用例

```typescript
// tests/e2e/admin/system/users.spec.ts
import { test, expect } from '../../fixtures/auth';
import { test as dbTest } from '../../fixtures/database';
import { UserManagePage } from '../../pages/UserManagePage';
import { UserFactory } from '../../factories/UserFactory';

test.describe('User Management Tests', () => {
  test('should create user successfully @regression', async ({ adminPage, db }) => {
    // Arrange
    const userManagePage = new UserManagePage(adminPage);
    const newUser = UserFactory.create();
    
    await userManagePage.goto();
    
    // Act
    await userManagePage.clickAddUser();
    await userManagePage.fillUserForm(newUser);
    await userManagePage.saveUser();
    
    // Assert
    await userManagePage.verifyUserInTable(newUser.username);
    
    // 验证数据库中的数据
    const dbUser = await db.findUserByUsername(newUser.username);
    expect(dbUser).toBeTruthy();
    expect(dbUser.name).toBe(newUser.name);
  });

  test('should search users correctly', async ({ adminPage }) => {
    // Arrange
    const userManagePage = new UserManagePage(adminPage);
    await userManagePage.goto();
    
    // Act
    await userManagePage.searchUser('admin');
    
    // Assert
    await userManagePage.verifyUserInTable('admin');
  });
});
```

### 7.3 集成测试用例

```typescript
// tests/e2e/integration/api/orders.spec.ts
import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/ApiUtils';
import { OrderFactory } from '../../factories/OrderFactory';

test.describe('Order API Integration Tests', () => {
  let apiUtils: ApiUtils;

  test.beforeAll(async () => {
    apiUtils = new ApiUtils();
    await apiUtils.authenticate();
  });

  test('should create order and sync to OMS', async () => {
    // Arrange
    const orderData = OrderFactory.create();
    
    // Act - 创建订单
    const createResponse = await apiUtils.post('/api/v1/orders', orderData);
    expect(createResponse.status).toBe(201);
    
    const order = createResponse.data;
    
    // Act - 审批订单
    const approvalResponse = await apiUtils.put(
      `/api/v1/orders/${order.id}/approve`,
      { approved: true, comment: '测试审批' }
    );
    expect(approvalResponse.status).toBe(200);
    
    // Assert - 验证OMS同步
    // 这里需要检查OMS系统是否收到了订单推送
    // 可以通过Mock OMS API或者检查日志来验证
    
    // 等待异步处理完成
    await test.waitForTimeout(5000);
    
    // 验证订单状态已更新
    const orderStatus = await apiUtils.get(`/api/v1/orders/${order.id}`);
    expect(orderStatus.data.status).toBe('approved');
    expect(orderStatus.data.oms_order_no).toBeTruthy();
  });
});
```

## 8. 性能测试集成

### 8.1 性能监控

```typescript
// utils/PerformanceMonitor.ts
import { Page } from '@playwright/test';

export class PerformanceMonitor {
  private page: Page;
  private metrics: any[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring() {
    // 监听网络请求
    this.page.on('response', (response) => {
      this.metrics.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing(),
        size: response.headers()['content-length']
      });
    });

    // 监听控制台错误
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.metrics.push({
          type: 'console_error',
          text: msg.text()
        });
      }
    });
  }

  async measurePageLoad(url: string) {
    const startTime = Date.now();
    
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 获取性能指标
    const performanceMetrics = await this.page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.timing));
    });

    return {
      loadTime,
      performanceMetrics,
      networkRequests: this.metrics.filter(m => m.url)
    };
  }

  async measureApiPerformance(apiCall: () => Promise<any>) {
    const startTime = Date.now();
    const result = await apiCall();
    const duration = Date.now() - startTime;

    return {
      duration,
      result
    };
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = [];
  }
}
```

## 9. 最佳实践和规范

### 9.1 测试编写规范

1. **测试命名规范**:
   ```typescript
   // 好的命名
   test('should display error message when login with invalid credentials')
   test('should create user successfully with valid data')
   
   // 不好的命名
   test('test login')
   test('user creation')
   ```

2. **测试结构 (AAA Pattern)**:
   ```typescript
   test('should update user profile successfully', async ({ page }) => {
     // Arrange - 准备测试数据和环境
     const user = UserFactory.create();
     const profilePage = new ProfilePage(page);
     
     // Act - 执行测试操作
     await profilePage.goto();
     await profilePage.updateProfile(user);
     
     // Assert - 验证结果
     await profilePage.verifyProfileUpdated(user);
   });
   ```

3. **等待策略**:
   ```typescript
   // 好的等待方式
   await page.waitForResponse(response => 
     response.url().includes('/api/users') && response.status() === 200
   );
   
   // 避免固定时间等待
   // await page.waitForTimeout(5000); // 不推荐
   ```

### 9.2 维护性最佳实践

1. **Page Object封装**:
   - 每个页面对应一个Page Object类
   - 封装页面元素和操作方法
   - 隐藏实现细节，只暴露业务接口

2. **数据驱动测试**:
   ```typescript
   const testCases = [
     { role: 'admin', expectedMenu: ['用户管理', '系统设置'] },
     { role: 'user', expectedMenu: ['个人中心'] }
   ];

   testCases.forEach(({ role, expectedMenu }) => {
     test(`should show correct menu for ${role}`, async ({ page }) => {
       // 测试逻辑
     });
   });
   ```

3. **测试数据隔离**:
   - 每个测试使用独立的测试数据
   - 测试前后清理数据
   - 使用工厂模式生成测试数据

### 9.3 错误处理和调试

```typescript
// utils/TestUtils.ts
export class TestUtils {
  static async takeScreenshotOnFailure(page: Page, testName: string) {
    await page.screenshot({
      path: `screenshots/failed-${testName}-${Date.now()}.png`,
      fullPage: true
    });
  }

  static async logBrowserConsole(page: Page) {
    page.on('console', (msg) => {
      console.log(`Browser console: ${msg.type()} - ${msg.text()}`);
    });
  }

  static async waitForApiResponse(page: Page, urlPattern: string, timeout: number = 30000) {
    return await page.waitForResponse(
      response => response.url().includes(urlPattern),
      { timeout }
    );
  }
}
```

## 10. 实施计划和里程碑

### 10.1 第一阶段 (Week 1-2): 基础框架搭建
- [ ] 安装和配置Playwright
- [ ] 建立项目结构和目录规范
- [ ] 实现基础Page Object模式
- [ ] 配置测试环境管理
- [ ] 建立基础的CI/CD工作流

### 10.2 第二阶段 (Week 3-4): 核心测试用例实现
- [ ] 实现登录认证测试用例
- [ ] 实现用户管理测试用例
- [ ] 实现订单管理测试用例
- [ ] 建立测试数据工厂
- [ ] 实现数据库操作工具

### 10.3 第三阶段 (Week 5-6): 集成测试和API测试
- [ ] 实现API测试套件
- [ ] 集成第三方服务测试
- [ ] 实现性能监控
- [ ] 完善错误处理和重试机制

### 10.4 第四阶段 (Week 7-8): 完善和优化
- [ ] 实现测试报告和可视化
- [ ] 优化测试执行效率
- [ ] 建立测试维护文档
- [ ] 团队培训和知识转移

### 10.5 验收标准
- [ ] 测试覆盖率达到85%以上
- [ ] 测试执行时间控制在30分钟内
- [ ] 测试稳定性达到95%以上
- [ ] CI/CD集成无缝运行
- [ ] 团队成员能够独立编写和维护测试用例

---

**文档版本**: v1.0  
**创建日期**: 2025-08-05  
**负责人**: Claude  
**任务编号**: 607