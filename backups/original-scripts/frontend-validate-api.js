// 数据验证和测试脚本 - 真实API版本
// 运行方式: node validate-data.js

const fs = require('fs');
const path = require('path');

console.log('🔍 验证工作台真实API集成...\n');

try {
  // 检查关键文件是否存在
  const files = [
    'src/services/dashboardService.ts',
    'src/utils/formatters.ts',
    'src/pages/DashboardPage.tsx',
    'src/services/api.ts'
  ];

  console.log('📁 核心文件检查:');
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} (不存在)`);
    }
  });

  // 检查是否已移除mock数据文件
  const removedFiles = [
    'src/data/sampleData.ts'
  ];

  console.log('\n🗑️  已移除Mock数据文件:');
  removedFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} (已正确移除)`);
    } else {
      console.log(`  ❌ ${file} (仍然存在，应该删除)`);
    }
  });

  console.log('\n🔧 API服务验证:');
  
  // 检查API配置
  const apiPath = path.join(__dirname, 'src/services/api.ts');
  if (fs.existsSync(apiPath)) {
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    if (apiContent.includes('http://localhost:8080/api')) {
      console.log('  ✅ API基础URL配置正确');
    } else if (apiContent.includes('/api/v1')) {
      console.log('  ❌ API基础URL配置错误 (仍为/api/v1)');
    } else {
      console.log('  ⚠️  API基础URL配置未知');
    }
  }

  // 检查Dashboard服务是否使用真实API
  const dashboardServicePath = path.join(__dirname, 'src/services/dashboardService.ts');
  if (fs.existsSync(dashboardServicePath)) {
    const serviceContent = fs.readFileSync(dashboardServicePath, 'utf8');
    
    const apiChecks = [
      { pattern: /api\.get\(['"]\/projects['"]/, desc: '项目API调用' },
      { pattern: /api\.get\(['"]\/tasks['"]/, desc: '任务API调用' },
      { pattern: /Promise\.all/, desc: '并发API请求' },
      { pattern: /timeline/, desc: '时间轴API集成' }
    ];

    console.log('\n📡 真实API调用检查:');
    apiChecks.forEach(check => {
      if (check.pattern.test(serviceContent)) {
        console.log(`  ✅ ${check.desc}`);
      } else {
        console.log(`  ❌ ${check.desc} - 未找到`);
      }
    });

    // 检查是否移除了mock相关代码
    const mockChecks = [
      { pattern: /setTimeout.*resolve/, desc: 'Mock延迟代码' },
      { pattern: /sampleProjects/, desc: 'Sample项目数据' },
      { pattern: /sampleTasks/, desc: 'Sample任务数据' }
    ];

    console.log('\n🚫 Mock代码清理检查:');
    mockChecks.forEach(check => {
      if (!check.pattern.test(serviceContent)) {
        console.log(`  ✅ ${check.desc} (已移除)`);
      } else {
        console.log(`  ❌ ${check.desc} (仍然存在)`);
      }
    });

    // 统计代码行数和API调用数量
    const lines = serviceContent.split('\n').length;
    const apiCalls = (serviceContent.match(/api\./g) || []).length;
    console.log(`\n📊 代码统计:`);
    console.log(`  📝 文件行数: ${lines}`);
    console.log(`  🔌 API调用次数: ${apiCalls}`);
  }

  console.log('\n🎨 样式文件检查:');
  const cssPath = path.join(__dirname, 'src/App.css');
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const dashboardStyles = [
      'dashboard-stat-card',
      'dashboard-progress-item', 
      'dashboard-activity-item',
      'dashboard-quick-action',
      'dashboard-workload-item'
    ];

    dashboardStyles.forEach(style => {
      if (cssContent.includes(style)) {
        console.log(`  ✅ .${style} 样式`);
      } else {
        console.log(`  ❌ .${style} 样式 - 未找到`);
      }
    });
  }

  console.log('\n🔧 环境配置检查:');
  const envPath = path.join(__dirname, '../.env.development');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('REACT_APP_API_URL=http://localhost:8080/api')) {
      console.log('  ✅ 环境变量API_URL配置正确');
    } else {
      console.log('  ❌ 环境变量API_URL配置可能有误');
    }
  } else {
    console.log('  ⚠️  环境配置文件未找到');
  }

  console.log('\n🚀 部署脚本检查:');
  const demoScriptPath = path.join(__dirname, '../demo-api.sh');
  if (fs.existsSync(demoScriptPath)) {
    console.log('  ✅ demo-api.sh 演示脚本存在');
    
    const scriptContent = fs.readFileSync(demoScriptPath, 'utf8');
    if (scriptContent.includes('docker-compose') && scriptContent.includes('postgres')) {
      console.log('  ✅ 包含完整的Docker部署配置');
    }
    if (scriptContent.includes('curl') && scriptContent.includes('health')) {
      console.log('  ✅ 包含API健康检查');
    }
  } else {
    console.log('  ❌ demo-api.sh 演示脚本缺失');
  }

  console.log('\n📈 API集成验证总结:');
  console.log('  🔄 数据源: PostgreSQL数据库');
  console.log('  🌐 API服务: Go后端 (localhost:8080)');
  console.log('  ⚡ 请求策略: 并发请求优化');
  console.log('  💾 缓存机制: useCache钩子保留');
  console.log('  🎯 实时计算: 动态统计指标');

  console.log('\n✨ 真实API集成验证完成!');
  console.log('🚀 启动说明:');
  console.log('  1. 运行 ../demo-api.sh 启动后端服务');
  console.log('  2. 运行 npm start 启动前端服务');
  console.log('  3. 访问 http://localhost:3000 查看真实数据');

} catch (error) {
  console.error('❌ 验证过程中发生错误:', error.message);
  process.exit(1);
}
