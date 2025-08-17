/**
 * 定时器诊断工具
 * 在浏览器控制台运行，帮助诊断定时器功能问题
 */

class TimerDiagnostics {
  constructor() {
    this.API_BASE = '/api/v1';
    this.monitoringInterval = null;
    // Timer diagnostics tool initialized silently
  }

  log(message, type = 'info') {
    const styles = {
      info: 'color: #2196F3',
      success: 'color: #4CAF50; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      warning: 'color: #FF9800; font-weight: bold'
    };
    console.log(`%c[定时器诊断] ${message}`, styles[type] || styles.info);
  }

  // 检查认证状态
  checkAuth() {
    this.log('=== 检查认证状态 ===');
    
    const token = localStorage.getItem('token');
    if (token) {
      this.log('✅ 找到认证token', 'success');
      this.log(`Token前50字符: ${token.substring(0, 50)}...`);
      
      // 解析JWT token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.log(`Token内容: ${JSON.stringify(payload, null, 2)}`);
        
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp > now) {
          this.log('✅ Token未过期', 'success');
        } else {
          this.log('❌ Token已过期', 'error');
        }
      } catch (e) {
        this.log('⚠️ 无法解析token', 'warning');
      }
      
      return token;
    } else {
      this.log('❌ 未找到认证token', 'error');
      this.log('建议：先登录应用');
      return null;
    }
  }

  // 测试API连接
  async testAPI() {
    this.log('=== 测试API连接 ===');
    
    const token = this.checkAuth();
    if (!token) {
      this.log('无法测试API：需要先登录', 'error');
      return false;
    }

    try {
      // 测试任务列表API
      this.log('测试任务列表API...');
      const response = await fetch(`${this.API_BASE}/tasks?limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      this.log(`API响应状态: ${response.status}`);
      
      if (!response.ok) {
        this.log(`❌ API请求失败: ${response.status} ${response.statusText}`, 'error');
        return false;
      }

      const data = await response.json();
      this.log(`API响应: ${JSON.stringify(data, null, 2)}`);
      
      if (data.success && data.data && data.data.data) {
        this.log(`✅ API连接正常，获取到 ${data.data.data.length} 个任务`, 'success');
        return data.data.data;
      } else {
        this.log('❌ API响应格式异常', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ API连接错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 测试定时器API
  async testTimer() {
    this.log('=== 测试定时器功能 ===');
    
    const token = this.checkAuth();
    if (!token) {
      this.log('无法测试定时器：需要先登录', 'error');
      return false;
    }

    try {
      // 1. 获取当前状态
      this.log('1. 获取当前定时器状态...');
      const currentResponse = await fetch(`${this.API_BASE}/timer/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!currentResponse.ok) {
        this.log(`❌ 获取定时器状态失败: ${currentResponse.status}`, 'error');
        return false;
      }
      
      const currentData = await currentResponse.json();
      this.log(`当前状态: ${JSON.stringify(currentData, null, 2)}`);
      
      // 如果有正在运行的定时器，先停止
      if (currentData.is_running) {
        this.log('发现正在运行的定时器，先停止...');
        await fetch(`${this.API_BASE}/timer/stop`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        this.log('已停止现有定时器');
      }

      // 2. 获取任务列表
      this.log('2. 获取任务列表...');
      const tasks = await this.testAPI();
      if (!tasks || tasks.length === 0) {
        this.log('❌ 无可用任务进行测试', 'error');
        return false;
      }

      const testTask = tasks[0];
      this.log(`选择测试任务: ${testTask.title} (ID: ${testTask.id})`);

      // 3. 启动定时器
      this.log('3. 启动定时器...');
      const startResponse = await fetch(`${this.API_BASE}/timer/start`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: testTask.id })
      });

      if (!startResponse.ok) {
        this.log(`❌ 启动定时器失败: ${startResponse.status}`, 'error');
        const errorData = await startResponse.json();
        this.log(`错误详情: ${JSON.stringify(errorData, null, 2)}`, 'error');
        return false;
      }

      const startData = await startResponse.json();
      this.log(`启动响应: ${JSON.stringify(startData, null, 2)}`);
      this.log('✅ 定时器启动成功', 'success');

      // 4. 等待2秒后检查状态
      this.log('4. 等待2秒后检查状态...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const runningResponse = await fetch(`${this.API_BASE}/timer/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const runningData = await runningResponse.json();
      this.log(`运行状态: ${JSON.stringify(runningData, null, 2)}`);
      
      if (runningData.is_running) {
        this.log(`✅ 定时器正在运行: ${runningData.formatted_time}`, 'success');
      } else {
        this.log('⚠️ 定时器未在运行状态', 'warning');
      }

      // 5. 停止定时器
      this.log('5. 停止定时器...');
      const stopResponse = await fetch(`${this.API_BASE}/timer/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (stopResponse.ok) {
        const stopData = await stopResponse.json();
        this.log(`停止响应: ${JSON.stringify(stopData, null, 2)}`);
        this.log('✅ 定时器已停止', 'success');
      } else {
        this.log('⚠️ 停止定时器失败', 'warning');
      }

      this.log('✅ 定时器功能测试完成', 'success');
      return true;

    } catch (error) {
      this.log(`❌ 定时器测试错误: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  // 检查前端组件状态
  checkComponents() {
    this.log('=== 检查前端组件 ===');
    
    // 检查React组件
    const timerCards = document.querySelectorAll('.timer-card');
    this.log(`找到 ${timerCards.length} 个定时器卡片组件`);
    
    // 检查定时器按钮
    const timerButtons = document.querySelectorAll('.timer-start-button');
    this.log(`找到 ${timerButtons.length} 个定时器按钮`);
    
    // 检查浮动定时器
    const floatingTimers = document.querySelectorAll('.floating-timer');
    this.log(`找到 ${floatingTimers.length} 个浮动定时器`);
    
    // 检查全局变量
    if (typeof window.React !== 'undefined') {
      this.log('✅ React已加载', 'success');
    } else {
      this.log('❌ React未检测到', 'error');
    }
    
    // 检查控制台错误
    this.log('请检查浏览器控制台是否有错误信息');
    this.log('请检查网络面板是否有失败的请求');
  }

  // 开始定时器状态监控
  startMonitoring() {
    if (this.monitoringInterval) {
      this.log('监控已在运行中', 'warning');
      return;
    }

    const token = this.checkAuth();
    if (!token) {
      this.log('无法开始监控：需要先登录', 'error');
      return;
    }

    this.log('🔄 开始定时器状态监控 (每3秒更新)', 'success');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.API_BASE}/timer/current`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const timestamp = new Date().toLocaleTimeString();
          
          if (data.is_running) {
            console.log(`%c[定时器监控 ${timestamp}] ✅ 运行中`, 'color: #4CAF50; font-weight: bold');
            console.log(`%c  任务: ${data.task_title || '未知'} (ID: ${data.task_id})`, 'color: #2196F3');
            console.log(`%c  时间: ${data.formatted_time} (${data.elapsed_seconds}秒)`, 'color: #2196F3');
          } else {
            console.log(`%c[定时器监控 ${timestamp}] ⏹️ 未运行`, 'color: #9E9E9E');
          }
        } else {
          this.log(`监控请求失败: ${response.status}`, 'error');
        }
      } catch (error) {
        this.log(`监控错误: ${error.message}`, 'error');
      }
    }, 3000);
  }

  // 停止定时器状态监控
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log('⏹️ 已停止定时器状态监控', 'warning');
    } else {
      this.log('监控未在运行', 'info');
    }
  }

  // 运行完整诊断
  async runDiagnostics() {
    this.log('🚀 开始运行完整诊断...', 'success');
    
    this.checkAuth();
    await this.testAPI();
    await this.testTimer();
    this.checkComponents();
    
    this.log('🎉 诊断完成！', 'success');
    this.log('如果发现问题，请根据上述信息进行排查');
    this.log('💡 提示: 使用 startMonitoring() 开始实时监控定时器状态');
  }

  // 快速启动定时器
  async startQuickTimer() {
    this.log('准备快速启动定时器...');
    
    const token = this.checkAuth();
    if (!token) {
      this.log('需要先登录', 'error');
      return false;
    }

    try {
      // 获取第一个可用任务
      const tasksResponse = await fetch(`${this.API_BASE}/tasks?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!tasksResponse.ok) {
        this.log('获取任务列表失败', 'error');
        return false;
      }

      const tasksData = await tasksResponse.json();
      if (!tasksData.success || !tasksData.data.data.length) {
        this.log('没有可用任务', 'error');
        return false;
      }

      const firstTask = tasksData.data.data[0];
      this.log(`选择任务: ${firstTask.title} (ID: ${firstTask.id})`);

      // 启动定时器
      const startResponse = await fetch(`${this.API_BASE}/timer/start`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: firstTask.id })
      });

      if (startResponse.ok) {
        const startData = await startResponse.json();
        this.log(`✅ 定时器启动成功: ${startData.task_title}`, 'success');
        this.log('💡 使用 startMonitoring() 开始监控运行状态', 'info');
        return true;
      } else {
        this.log('启动定时器失败', 'error');
        return false;
      }
    } catch (error) {
      this.log(`快速启动错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 停止当前定时器
  async stopCurrentTimer() {
    this.log('停止当前定时器...');
    
    const token = this.checkAuth();
    if (!token) {
      this.log('需要先登录', 'error');
      return false;
    }

    try {
      const response = await fetch(`${this.API_BASE}/timer/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.log(`✅ 定时器已停止: ${data.task_title} (${data.formatted_time})`, 'success');
        return true;
      } else {
        this.log('停止定时器失败', 'error');
        return false;
      }
    } catch (error) {
      this.log(`停止定时器错误: ${error.message}`, 'error');
      return false;
    }
  }

  // 快速登录（用于测试）
  async quickLogin() {
    this.log('尝试快速登录...');
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' })
      });

      const data = await response.json();
      if (data.success && data.data && data.data.token) {
        localStorage.setItem('token', data.data.token);
        this.log('✅ 快速登录成功', 'success');
        return true;
      } else {
        this.log('❌ 快速登录失败', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ 登录错误: ${error.message}`, 'error');
      return false;
    }
  }
}

// 在全局暴露诊断工具
if (typeof window !== 'undefined') {
  window.timerDiag = new TimerDiagnostics();
  // Timer diagnostics tool loaded silently
} else {
  // Node.js环境
  module.exports = TimerDiagnostics;
}