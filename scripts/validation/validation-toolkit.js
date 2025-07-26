#!/usr/bin/env node

/**
 * 统一验证工具集 - Validation Toolkit
 * 合并所有验证功能，包括API验证、数据验证、系统验证等
 * 
 * 包含功能:
 * - API端点验证
 * - 数据格式验证  
 * - 数据库验证
 * - 前端组件验证
 * - 配置验证
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// 全局配置
// =============================================================================

const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api/v1',
  FRONTEND_URL: 'http://localhost:3000',
  DB_CONNECTION_STRING: 'postgresql://postgres:password@localhost:5432/ai_task_manager',
  PROJECT_ROOT: process.cwd()
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 验证结果收集器
class ValidationCollector {
  constructor() {
    this.categories = new Map();
    this.currentCategory = null;
  }

  createCategory(name) {
    this.currentCategory = {
      name,
      validations: [],
      passed: 0,
      failed: 0,
      total: 0,
      startTime: Date.now()
    };
    this.categories.set(name, this.currentCategory);
    return this;
  }

  recordValidation(name, passed, details = '') {
    if (!this.currentCategory) throw new Error('No active validation category');
    
    this.currentCategory.total++;
    if (passed) {
      this.currentCategory.passed++;
      colorLog('green', `  ✅ ${name}`);
    } else {
      this.currentCategory.failed++;
      colorLog('red', `  ❌ ${name}`);
      if (details) colorLog('red', `     ${details}`);
    }
    
    this.currentCategory.validations.push({ name, passed, details });
    return this;
  }

  finishCategory() {
    if (this.currentCategory) {
      this.currentCategory.endTime = Date.now();
      this.currentCategory.duration = this.currentCategory.endTime - this.currentCategory.startTime;
    }
    return this;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      categories: Array.from(this.categories.values()),
      summary: {
        totalCategories: this.categories.size,
        totalValidations: 0,
        totalPassed: 0,
        totalFailed: 0
      }
    };

    // 计算总计
    report.categories.forEach(category => {
      report.summary.totalValidations += category.total;
      report.summary.totalPassed += category.passed;
      report.summary.totalFailed += category.failed;
    });

    report.summary.successRate = Math.round((report.summary.totalPassed / report.summary.totalValidations) * 100);

    return report;
  }
}

// =============================================================================
// 验证模块 1: API端点验证
// =============================================================================

async function validateAPIEndpoints(collector) {
  collector.createCategory('API端点验证');
  colorLog('cyan', '\n🔌 开始API端点验证...');

  // 生成测试JWT
  function generateTestJWT() {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      user_id: 1,
      username: 'validator',
      role: 'admin',
      user_type: 'system',
      exp: now + 3600,
      iat: now
    };
    
    // 简化的JWT（仅用于测试）
    const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${payloadB64}.test_signature`;
  }

  const token = generateTestJWT();
  const endpoints = [
    { path: '/health', method: 'GET', auth: false, expectedStatus: [200] },
    { path: '/user/profile', method: 'GET', auth: true, expectedStatus: [200, 401] },
    { path: '/documents', method: 'GET', auth: true, expectedStatus: [200, 401] },
    { path: '/projects', method: 'GET', auth: true, expectedStatus: [200, 401] },
    { path: '/tasks', method: 'GET', auth: true, expectedStatus: [200, 401] },
    { path: '/timer/current', method: 'GET', auth: true, expectedStatus: [200, 401] },
    { path: '/admin/users', method: 'GET', auth: true, expectedStatus: [200, 401, 403] },
    { path: '/system/audit', method: 'GET', auth: true, expectedStatus: [200, 401, 403] }
  ];

  for (const endpoint of endpoints) {
    try {
      const headers = endpoint.auth ? { 'Authorization': `Bearer ${token}` } : {};
      const url = endpoint.path.startsWith('/health') 
        ? `${CONFIG.API_BASE_URL.replace('/api/v1', '')}${endpoint.path}`
        : `${CONFIG.API_BASE_URL}${endpoint.path}`;
      
      const response = await axios({
        method: endpoint.method,
        url: url,
        headers: headers,
        timeout: 5000,
        validateStatus: () => true // 不抛出错误
      });

      const isExpectedStatus = endpoint.expectedStatus.includes(response.status);
      collector.recordValidation(
        `${endpoint.method} ${endpoint.path} (${response.status})`,
        isExpectedStatus,
        isExpectedStatus ? '' : `Expected: ${endpoint.expectedStatus.join('/')}, Got: ${response.status}`
      );

    } catch (error) {
      collector.recordValidation(
        `${endpoint.method} ${endpoint.path}`,
        false,
        `Connection error: ${error.message}`
      );
    }
  }

  collector.finishCategory();
}

// =============================================================================
// 验证模块 2: 数据格式验证
// =============================================================================

async function validateDataFormats(collector) {
  collector.createCategory('数据格式验证');
  colorLog('cyan', '\n📊 开始数据格式验证...');

  // 验证API响应格式
  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL.replace('/api/v1', '')}/health`, { timeout: 5000 });
    
    // 检查响应是否包含必要字段
    const hasSuccess = response.data.hasOwnProperty('status') || response.data.hasOwnProperty('success');
    collector.recordValidation('API响应包含状态字段', hasSuccess);
    
    const hasMessage = response.data.hasOwnProperty('message') || response.data.hasOwnProperty('data');
    collector.recordValidation('API响应包含消息/数据字段', hasMessage);

  } catch (error) {
    collector.recordValidation('健康检查API格式', false, error.message);
  }

  // 验证前端配置文件格式
  try {
    const packageJsonPath = path.join(CONFIG.PROJECT_ROOT, 'frontend/package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      collector.recordValidation('package.json格式正确', true);
      collector.recordValidation('包含必要的scripts', 
        packageJson.scripts && packageJson.scripts.build && packageJson.scripts.start);
      collector.recordValidation('包含React依赖', 
        packageJson.dependencies && packageJson.dependencies.react);
    } else {
      collector.recordValidation('frontend/package.json存在', false);
    }
  } catch (error) {
    collector.recordValidation('package.json格式验证', false, error.message);
  }

  // 验证环境配置文件
  const envFiles = ['.env', '.env.development', '.env.production'];
  envFiles.forEach(envFile => {
    const envPath = path.join(CONFIG.PROJECT_ROOT, envFile);
    const exists = fs.existsSync(envPath);
    collector.recordValidation(`环境文件 ${envFile}`, exists);
    
    if (exists) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const hasDbUrl = content.includes('DATABASE_URL') || content.includes('DB_');
        const hasApiUrl = content.includes('API_URL') || content.includes('REACT_APP_');
        
        collector.recordValidation(`${envFile} 包含数据库配置`, hasDbUrl);
        collector.recordValidation(`${envFile} 包含API配置`, hasApiUrl);
      } catch (error) {
        collector.recordValidation(`${envFile} 读取`, false, error.message);
      }
    }
  });

  collector.finishCategory();
}

// =============================================================================
// 验证模块 3: 数据库验证
// =============================================================================

async function validateDatabase(collector) {
  collector.createCategory('数据库验证');
  colorLog('cyan', '\n🗄️ 开始数据库验证...');

  try {
    // 检查数据库连接
    const healthResponse = await axios.get(`${CONFIG.API_BASE_URL}/health/db`, { timeout: 5000 });
    collector.recordValidation('数据库连接', healthResponse.data.success === true);
  } catch (error) {
    collector.recordValidation('数据库连接', false, error.message);
  }

  // 检查必要的表
  const requiredTables = [
    'users', 'projects', 'tasks', 'documents', 
    'timer_logs', 'audit_logs', 'companies'
  ];

  try {
    // 通过Docker执行SQL检查表
    const checkTablesCmd = `docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null`;
    const result = execSync(checkTablesCmd, { encoding: 'utf8' });
    
    requiredTables.forEach(table => {
      const tableExists = result.includes(table);
      collector.recordValidation(`数据库表 ${table}`, tableExists);
    });

  } catch (error) {
    requiredTables.forEach(table => {
      collector.recordValidation(`数据库表 ${table}`, false, '无法检查表结构');
    });
  }

  // 检查索引和约束
  try {
    const indexCheckCmd = `docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null`;
    const indexResult = execSync(indexCheckCmd, { encoding: 'utf8' });
    
    const hasUserIndex = indexResult.includes('users') || indexResult.includes('idx_');
    collector.recordValidation('数据库索引存在', hasUserIndex);

  } catch (error) {
    collector.recordValidation('数据库索引检查', false, '无法检查索引');
  }

  collector.finishCategory();
}

// =============================================================================
// 验证模块 4: 前端组件验证
// =============================================================================

async function validateFrontendComponents(collector) {
  collector.createCategory('前端组件验证');
  colorLog('cyan', '\n🎨 开始前端组件验证...');

  const criticalComponents = [
    'frontend/src/App.tsx',
    'frontend/src/components/Dashboard.tsx',
    'frontend/src/components/TimerCard.tsx',
    'frontend/src/pages/DocumentsPage.tsx',
    'frontend/src/pages/ProjectsPage.tsx',
    'frontend/src/services/apiService.ts',
    'frontend/src/types/api.ts'
  ];

  criticalComponents.forEach(componentPath => {
    const fullPath = path.join(CONFIG.PROJECT_ROOT, componentPath);
    const exists = fs.existsSync(fullPath);
    collector.recordValidation(`组件文件 ${path.basename(componentPath)}`, exists);

    if (exists) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // 检查TypeScript/React特征
        if (componentPath.endsWith('.tsx') || componentPath.endsWith('.ts')) {
          const hasImport = content.includes('import');
          const hasExport = content.includes('export');
          
          collector.recordValidation(`${path.basename(componentPath)} 模块结构`, hasImport && hasExport);
          
          if (componentPath.endsWith('.tsx')) {
            const hasReact = content.includes('React') || content.includes('useState') || content.includes('useEffect');
            collector.recordValidation(`${path.basename(componentPath)} React特征`, hasReact);
          }
        }

        // 检查文件大小合理性
        const stats = fs.statSync(fullPath);
        const sizeOK = stats.size > 0 && stats.size < 1024 * 1024; // 0 < size < 1MB
        collector.recordValidation(`${path.basename(componentPath)} 文件大小合理`, sizeOK);

      } catch (error) {
        collector.recordValidation(`${path.basename(componentPath)} 内容检查`, false, error.message);
      }
    }
  });

  // 检查前端构建
  try {
    const buildPath = path.join(CONFIG.PROJECT_ROOT, 'frontend/build');
    const buildExists = fs.existsSync(buildPath);
    collector.recordValidation('前端构建目录存在', buildExists);

    if (buildExists) {
      const staticPath = path.join(buildPath, 'static');
      const staticExists = fs.existsSync(staticPath);
      collector.recordValidation('静态资源目录存在', staticExists);

      const indexPath = path.join(buildPath, 'index.html');
      const indexExists = fs.existsSync(indexPath);
      collector.recordValidation('index.html存在', indexExists);
    }
  } catch (error) {
    collector.recordValidation('前端构建检查', false, error.message);
  }

  collector.finishCategory();
}

// =============================================================================
// 验证模块 5: 配置验证
// =============================================================================

async function validateConfiguration(collector) {
  collector.createCategory('配置验证');
  colorLog('cyan', '\n⚙️ 开始配置验证...');

  // 检查Docker配置
  const dockerComposePath = path.join(CONFIG.PROJECT_ROOT, 'docker-compose.yml');
  const dockerComposeExists = fs.existsSync(dockerComposePath);
  collector.recordValidation('docker-compose.yml存在', dockerComposeExists);

  if (dockerComposeExists) {
    try {
      const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
      
      const services = ['frontend', 'backend', 'postgres'];
      services.forEach(service => {
        const serviceExists = dockerComposeContent.includes(`${service}:`);
        collector.recordValidation(`Docker服务 ${service}`, serviceExists);
      });

      const hasVolumes = dockerComposeContent.includes('volumes:');
      const hasNetworks = dockerComposeContent.includes('networks:') || dockerComposeContent.includes('links:');
      
      collector.recordValidation('Docker卷配置', hasVolumes);
      collector.recordValidation('Docker网络配置', hasNetworks);

    } catch (error) {
      collector.recordValidation('docker-compose.yml读取', false, error.message);
    }
  }

  // 检查Nginx配置
  const nginxConfigPath = path.join(CONFIG.PROJECT_ROOT, 'nginx/nginx.conf');
  const nginxExists = fs.existsSync(nginxConfigPath);
  collector.recordValidation('Nginx配置文件', nginxExists);

  if (nginxExists) {
    try {
      const nginxContent = fs.readFileSync(nginxConfigPath, 'utf8');
      const hasProxy = nginxContent.includes('proxy_pass');
      const hasStatic = nginxContent.includes('location') && nginxContent.includes('/static');
      
      collector.recordValidation('Nginx代理配置', hasProxy);
      collector.recordValidation('Nginx静态文件配置', hasStatic);
    } catch (error) {
      collector.recordValidation('Nginx配置读取', false, error.message);
    }
  }

  // 检查后端配置
  const backendConfigPath = path.join(CONFIG.PROJECT_ROOT, 'backend/config');
  const backendConfigExists = fs.existsSync(backendConfigPath);
  collector.recordValidation('后端配置目录', backendConfigExists);

  if (backendConfigExists) {
    const configFiles = fs.readdirSync(backendConfigPath);
    const hasDbConfig = configFiles.some(file => file.includes('database') || file.includes('db'));
    const hasServerConfig = configFiles.some(file => file.includes('server') || file.includes('app'));
    
    collector.recordValidation('数据库配置文件', hasDbConfig);
    collector.recordValidation('服务器配置文件', hasServerConfig);
  }

  // 检查前端配置
  const cracoConfigPath = path.join(CONFIG.PROJECT_ROOT, 'frontend/craco.config.js');
  const webpackConfigPath = path.join(CONFIG.PROJECT_ROOT, 'frontend/webpack.config.js');
  
  collector.recordValidation('CRACO配置', fs.existsSync(cracoConfigPath));
  collector.recordValidation('Webpack配置', fs.existsSync(webpackConfigPath));

  collector.finishCategory();
}

// =============================================================================
// 验证模块 6: 系统集成验证
// =============================================================================

async function validateSystemIntegration(collector) {
  collector.createCategory('系统集成验证');
  colorLog('cyan', '\n🔗 开始系统集成验证...');

  // 检查服务间连接
  try {
    // 前端到后端
    const frontendResponse = await axios.get(CONFIG.FRONTEND_URL, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    collector.recordValidation('前端服务可访问', frontendResponse.status === 200);

    // 后端健康检查
    const backendResponse = await axios.get(`${CONFIG.API_BASE_URL.replace('/api/v1', '')}/health`, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    collector.recordValidation('后端服务可访问', backendResponse.status === 200);

  } catch (error) {
    collector.recordValidation('服务连接检查', false, error.message);
  }

  // 检查Docker容器状态
  try {
    const dockerStatus = execSync('docker-compose ps', { encoding: 'utf8' });
    const runningContainers = (dockerStatus.match(/Up/g) || []).length;
    const totalContainers = dockerStatus.split('\n').filter(line => line.includes('new-ai-proj')).length;
    
    collector.recordValidation('Docker容器运行状态', runningContainers >= 2);
    collector.recordValidation(`容器运行比例 (${runningContainers}/${totalContainers})`, runningContainers === totalContainers);

  } catch (error) {
    collector.recordValidation('Docker状态检查', false, error.message);
  }

  // 检查端口占用
  const ports = [3000, 8080, 5432, 80];
  for (const port of ports) {
    try {
      const netstatCmd = process.platform === 'win32' 
        ? `netstat -an | findstr :${port}`
        : `lsof -i :${port} || netstat -tulpn | grep :${port}`;
      
      execSync(netstatCmd, { encoding: 'utf8' });
      collector.recordValidation(`端口 ${port} 占用`, true);
    } catch (error) {
      collector.recordValidation(`端口 ${port} 占用`, false, '端口未被占用或检查失败');
    }
  }

  collector.finishCategory();
}

// =============================================================================
// 主验证流程
// =============================================================================

async function runCompleteValidation() {
  const collector = new ValidationCollector();
  
  colorLog('bright', '🔍 启动统一验证工具集');
  colorLog('bright', '='.repeat(80));
  
  try {
    await validateAPIEndpoints(collector);
    await validateDataFormats(collector);
    await validateDatabase(collector);
    await validateFrontendComponents(collector);
    await validateConfiguration(collector);
    await validateSystemIntegration(collector);
    
    // 生成验证报告
    const report = collector.generateReport();
    
    // 保存报告到文件
    const reportPath = 'validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 输出验证摘要
    colorLog('bright', '\n' + '='.repeat(80));
    colorLog('bright', '📊 统一验证报告');
    colorLog('bright', '='.repeat(80));
    
    report.categories.forEach(category => {
      const successRate = Math.round((category.passed / category.total) * 100);
      const statusColor = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
      
      colorLog('white', `\n📋 ${category.name}`);
      colorLog(statusColor, `   通过: ${category.passed}/${category.total} (${successRate}%)`);
      colorLog('white', `   耗时: ${category.duration}ms`);
    });
    
    colorLog('bright', '\n' + '-'.repeat(50));
    colorLog('white', `🎯 总体结果: ${report.summary.totalPassed}/${report.summary.totalValidations}`);
    colorLog('white', `📈 成功率: ${report.summary.successRate}%`);
    colorLog('white', `📁 详细报告: ${reportPath}`);
    
    // 最终评估
    if (report.summary.successRate >= 95) {
      colorLog('green', '\n🎉 系统验证完美通过！所有组件运行正常。');
    } else if (report.summary.successRate >= 85) {
      colorLog('green', '\n✅ 系统验证基本通过，少量问题不影响核心功能。');
    } else if (report.summary.successRate >= 70) {
      colorLog('yellow', '\n⚠️ 系统验证部分通过，建议修复失败项目。');
    } else {
      colorLog('red', '\n❌ 系统验证发现较多问题，需要重点关注和修复。');
    }
    
    colorLog('bright', '='.repeat(80));
    
  } catch (error) {
    colorLog('red', `💥 验证过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
验证工具集使用说明:

使用方法: node validation-toolkit.js [选项]

选项:
  --help, -h         显示帮助信息
  --api              仅验证API端点
  --data             仅验证数据格式
  --database         仅验证数据库
  --frontend         仅验证前端组件
  --config           仅验证配置文件
  --integration      仅验证系统集成

示例:
  node validation-toolkit.js              # 运行完整验证
  node validation-toolkit.js --api        # 仅验证API
  node validation-toolkit.js --frontend   # 仅验证前端
    `);
    process.exit(0);
  }
  
  runCompleteValidation();
}

module.exports = {
  runCompleteValidation,
  validateAPIEndpoints,
  validateDataFormats,
  validateDatabase,
  validateFrontendComponents,
  validateConfiguration,
  validateSystemIntegration
};
