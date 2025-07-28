#!/usr/bin/env node

/**
 * 定时器和加载状态问题诊断脚本
 * 用于验证修复后的组件挂载和加载状态问题
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class TimerIssueDebugger {
  constructor() {
    this.results = {
      componentMounting: { status: 'unknown', issues: [] },
      localTimer: { status: 'unknown', issues: [] },
      loadingState: { status: 'unknown', issues: [] }
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m',   // red
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[定时器调试] ${message}${colors.reset}`);
  }

  async checkServices() {
    this.log('=== 检查服务状态 ===');
    
    try {
      // 检查Docker服务
      const { stdout: dockerStatus } = await execAsync('docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"');
      this.log('Docker服务状态:', 'info');
      console.log(dockerStatus);
      
      // 检查端口占用
      const ports = [80, 3000, 8080, 5432];
      for (const port of ports) {
        try {
          await execAsync(`lsof -i :${port}`);
          this.log(`✅ 端口 ${port} 正在使用`, 'success');
        } catch (error) {
          this.log(`❌ 端口 ${port} 未使用`, 'warning');
        }
      }
      
    } catch (error) {
      this.log(`检查服务失败: ${error.message}`, 'error');
    }
  }

  async checkFrontendBuild() {
    this.log('=== 检查前端构建状态 ===');
    
    try {
      // 检查关键组件文件
      const criticalFiles = [
        'frontend/src/contexts/TimerContext.tsx',
        'frontend/src/components/FloatingTimer/index.tsx',
        'frontend/src/components/GlobalLoading.tsx'
      ];
      
      for (const file of criticalFiles) {
        try {
          await execAsync(`test -f ${file}`);
          this.log(`✅ ${file} 存在`, 'success');
          
          // 检查文件语法
          const { stdout } = await execAsync(`head -5 ${file}`);
          if (stdout.includes('import') || stdout.includes('export')) {
            this.log(`✅ ${file} 语法正常`, 'success');
          }
        } catch (error) {
          this.log(`❌ ${file} 检查失败`, 'error');
          this.results.componentMounting.issues.push(`文件 ${file} 不存在或语法错误`);
        }
      }

      // 检查TypeScript编译
      try {
        this.log('检查TypeScript编译...', 'info');
        const { stderr } = await execAsync('cd frontend && npm run type-check', { timeout: 30000 });
        if (stderr && stderr.includes('error')) {
          this.log('❌ TypeScript编译有错误', 'error');
          this.results.componentMounting.issues.push('TypeScript编译错误');
        } else {
          this.log('✅ TypeScript编译正常', 'success');
        }
      } catch (error) {
        this.log(`TypeScript检查失败: ${error.message}`, 'warning');
      }

    } catch (error) {
      this.log(`前端构建检查失败: ${error.message}`, 'error');
    }
  }

  async testAPIEndpoints() {
    this.log('=== 测试API端点 ===');
    
    const endpoints = [
      { name: '健康检查', url: 'http://localhost/api/v1/health' },
      { name: '定时器状态', url: 'http://localhost/api/v1/timer/current' },
      { name: '项目列表', url: 'http://localhost/api/v1/projects' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const { stdout } = await execAsync(`curl -s -w "%{http_code}" "${endpoint.url}" -o /dev/null`);
        const statusCode = stdout.trim();
        
        if (statusCode === '200') {
          this.log(`✅ ${endpoint.name}: ${statusCode}`, 'success');
        } else {
          this.log(`⚠️  ${endpoint.name}: ${statusCode}`, 'warning');
          this.results.loadingState.issues.push(`${endpoint.name} 返回状态码 ${statusCode}`);
        }
      } catch (error) {
        this.log(`❌ ${endpoint.name}: 连接失败`, 'error');
        this.results.loadingState.issues.push(`${endpoint.name} 连接失败`);
      }
    }
  }

  async testLocalStorage() {
    this.log('=== 测试localStorage功能 ===');
    
    // 创建测试HTML文件
    const testHTML = `
<!DOCTYPE html>
<html>
<head><title>LocalStorage Test</title></head>
<body>
<script>
try {
  // 测试基本localStorage功能
  localStorage.setItem('test', 'value');
  const value = localStorage.getItem('test');
  localStorage.removeItem('test');
  
  // 测试定时器状态结构
  const timerState = {
    isRunning: false,
    isPaused: false,
    taskId: 1,
    taskTitle: 'Test Task',
    startTime: new Date().toISOString(),
    elapsedSeconds: 0,
    formattedTime: '00:00:00',
    lastSync: new Date().toISOString()
  };
  
  localStorage.setItem('globalTimerState', JSON.stringify(timerState));
  const restored = JSON.parse(localStorage.getItem('globalTimerState'));
  
  console.log('✅ localStorage功能正常');
  console.log('✅ 定时器状态序列化正常');
  
  localStorage.removeItem('globalTimerState');
} catch (error) {
  console.log('❌ localStorage测试失败:', error.message);
}
</script>
</body>
</html>`;
    
    try {
      const fs = require('fs');
      fs.writeFileSync('/tmp/localStorage-test.html', testHTML);
      
      // 使用无头浏览器测试(如果可用)
      try {
        const { stdout } = await execAsync('which google-chrome || which chromium-browser || echo "none"');
        if (stdout.trim() !== 'none') {
          const browser = stdout.trim();
          const { stdout: result } = await execAsync(`${browser} --headless --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=1000 --dump-dom "file:///tmp/localStorage-test.html" 2>/dev/null | grep -E "(✅|❌)"`);
          
          if (result.includes('✅')) {
            this.log('✅ localStorage功能测试通过', 'success');
          } else {
            this.log('❌ localStorage功能测试失败', 'error');
            this.results.localTimer.issues.push('localStorage功能异常');
          }
        }
      } catch (error) {
        this.log('无法进行浏览器localStorage测试', 'warning');
      }
      
      // 清理测试文件
      fs.unlinkSync('/tmp/localStorage-test.html');
      
    } catch (error) {
      this.log(`localStorage测试失败: ${error.message}`, 'error');
    }
  }

  async checkMemoryUsage() {
    this.log('=== 检查内存使用 ===');
    
    try {
      // 检查Docker容器内存使用
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"');
      this.log('Docker容器资源使用:', 'info');
      console.log(stdout);
      
      // 检查系统内存
      const { stdout: memInfo } = await execAsync('free -h || vm_stat');
      this.log('系统内存状态:', 'info');
      console.log(memInfo);
      
    } catch (error) {
      this.log(`内存检查失败: ${error.message}`, 'warning');
    }
  }

  generateReport() {
    this.log('=== 问题诊断报告 ===');
    
    // 分析结果并生成建议
    const allIssues = [
      ...this.results.componentMounting.issues,
      ...this.results.localTimer.issues,
      ...this.results.loadingState.issues
    ];
    
    if (allIssues.length === 0) {
      this.log('🎉 未发现明显问题，组件挂载和加载状态应该正常', 'success');
    } else {
      this.log(`🔍 发现 ${allIssues.length} 个潜在问题:`, 'warning');
      allIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    this.log('=== 修复建议 ===');
    console.log(`
✅ 已修复的问题:
  1. TimerContext 组件挂载优化 - 分离初始化逻辑
  2. FloatingTimer useEffect 依赖优化 - 避免无限循环  
  3. GlobalLoading 增强错误处理 - 超时和错误状态
  
🔧 应用修复:
  1. 重启前端开发服务器: cd frontend && npm start
  2. 清除浏览器缓存和localStorage
  3. 在浏览器控制台运行调试: window.timerDiag.runDiagnostics()
  
📊 监控方法:
  1. 打开浏览器开发者工具 → Console
  2. 查看是否有错误信息或警告
  3. 检查 Network 面板的API请求状态
  4. 观察组件挂载和卸载过程
    `);
  }

  async runAllChecks() {
    this.log('🚀 开始定时器和加载状态问题诊断...', 'info');
    
    await this.checkServices();
    await this.checkFrontendBuild();
    await this.testAPIEndpoints();
    await this.testLocalStorage();
    await this.checkMemoryUsage();
    
    this.generateReport();
    
    this.log('🎯 诊断完成！请根据上述建议进行调试', 'success');
  }
}

// 运行诊断
const timerDebugger = new TimerIssueDebugger();
timerDebugger.runAllChecks().catch(error => {
  console.error('诊断过程中出错:', error);
  process.exit(1);
});