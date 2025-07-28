/**
 * 增强型调试脚本 - 复制到浏览器控制台运行
 * 专门针对组件挂载和定时器问题
 */

(function() {

class EnhancedTimerDebugger {
  constructor() {
    this.API_BASE = '/api/v1';
    this.log('🔧 增强型调试工具已加载', 'success');
  }

  log(message, type = 'info') {
    const styles = {
      info: 'color: #2196F3',
      success: 'color: #4CAF50; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      warning: 'color: #FF9800; font-weight: bold'
    };
    console.log(`%c[增强调试] ${message}`, styles[type] || styles.info);
  }

  // 检查React应用状态
  checkReactApp() {
    this.log('=== 检查React应用状态 ===');
    
    // 检查React根元素
    const root = document.getElementById('root');
    if (!root) {
      this.log('❌ 找不到#root元素', 'error');
      return false;
    }
    
    this.log('✅ #root元素存在', 'success');
    this.log(`根元素HTML长度: ${root.innerHTML.length}`);
    
    // 检查React Fiber
    const fiberKey = Object.keys(root).find(key => 
      key.startsWith('_reactInternalInstance') || 
      key.startsWith('_reactInternals') ||
      key.startsWith('__reactInternalInstance')
    );
    
    if (fiberKey) {
      this.log('✅ React Fiber节点找到', 'success');
      this.log(`Fiber键: ${fiberKey}`);
    } else {
      this.log('⚠️ React Fiber节点未找到', 'warning');
    }
    
    // 检查全局React对象
    const reactChecks = [
      () => typeof window.React !== 'undefined',
      () => typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
      () => document.querySelector('[data-reactroot]') !== null,
      () => document.querySelector('script[src*="react"]') !== null
    ];
    
    reactChecks.forEach((check, index) => {
      try {
        if (check()) {
          this.log(`✅ React检查 ${index + 1} 通过`, 'success');
        } else {
          this.log(`⚠️ React检查 ${index + 1} 失败`, 'warning');
        }
      } catch (error) {
        this.log(`❌ React检查 ${index + 1} 出错: ${error.message}`, 'error');
      }
    });
    
    return true;
  }

  // 深度检查定时器组件
  checkTimerComponents() {
    this.log('=== 深度检查定时器组件 ===');
    
    // 更详细的组件选择器
    const componentSelectors = {
      'FloatingTimer': [
        '.floating-timer',
        '[class*="floating-timer"]',
        '[data-testid*="floating-timer"]',
        '[id*="floating-timer"]'
      ],
      'TimerCard': [
        '.timer-card',
        '[class*="timer-card"]',
        '.ant-card .timer',
        '[data-testid*="timer-card"]'
      ],
      'TimerButton': [
        '.timer-start-button',
        '[class*="timer-button"]',
        'button[class*="timer"]',
        '[data-testid*="timer-button"]'
      ],
      'TimerContext': [
        '[data-timer-context]',
        '[class*="timer-context"]'
      ],
      'AntdComponents': [
        '.ant-spin',
        '.ant-card',
        '.ant-button',
        '[class*="ant-"]'
      ]
    };
    
    Object.entries(componentSelectors).forEach(([componentName, selectors]) => {
      this.log(`--- 检查 ${componentName} ---`);
      let totalFound = 0;
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            this.log(`  ✅ ${selector}: ${elements.length} 个元素`, 'success');
            totalFound += elements.length;
            
            // 打印前3个元素的详细信息
            Array.from(elements).slice(0, 3).forEach((el, index) => {
              this.log(`    ${index + 1}. 类名: ${el.className}`);
              this.log(`    ${index + 1}. 标签: ${el.tagName}`);
            });
          } else {
            this.log(`  ⚠️ ${selector}: 0 个元素`, 'warning');
          }
        } catch (error) {
          this.log(`  ❌ ${selector}: 查询失败 - ${error.message}`, 'error');
        }
      });
      
      this.log(`${componentName} 总计: ${totalFound} 个元素`);
    });
  }

  // 检查TimerContext状态
  checkTimerContextState() {
    this.log('=== 检查TimerContext状态 ===');
    
    // 检查localStorage中的定时器状态
    try {
      const globalTimerState = localStorage.getItem('globalTimerState');
      if (globalTimerState) {
        const state = JSON.parse(globalTimerState);
        this.log('✅ 找到localStorage定时器状态:', 'success');
        this.log(`  运行状态: ${state.isRunning ? '运行中' : '已停止'}`);
        this.log(`  暂停状态: ${state.isPaused ? '已暂停' : '未暂停'}`);
        this.log(`  任务ID: ${state.taskId || '无'}`);
        this.log(`  任务标题: ${state.taskTitle || '无'}`);
        this.log(`  运行时间: ${state.formattedTime || '00:00:00'}`);
        this.log(`  最后同步: ${state.lastSync || '无'}`);
        
        // 检查状态一致性
        if (state.isRunning && !state.startTime) {
          this.log('⚠️ 状态异常: 定时器运行但无开始时间', 'warning');
        }
        if (state.isRunning && state.isPaused) {
          this.log('⚠️ 状态冲突: 同时运行和暂停', 'warning');
        }
      } else {
        this.log('⚠️ localStorage中无定时器状态', 'warning');
      }
    } catch (error) {
      this.log(`❌ 读取localStorage失败: ${error.message}`, 'error');
    }
    
    // 检查其他相关localStorage项
    const storageItems = [
      'floatingTimerPosition',
      'floatingTimerMinimized', 
      'floatingTimerHidden',
      'token'
    ];
    
    storageItems.forEach(item => {
      const value = localStorage.getItem(item);
      if (value) {
        this.log(`✅ ${item}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`, 'success');
      } else {
        this.log(`⚠️ ${item}: 未设置`, 'warning');
      }
    });
  }

  // 检查网络和API状态
  async checkNetworkAndAPI() {
    this.log('=== 检查网络和API状态 ===');
    
    const token = localStorage.getItem('token');
    if (!token) {
      this.log('❌ 未找到认证token，跳过API测试', 'error');
      return false;
    }
    
    this.log('✅ 找到认证token', 'success');
    
    // 测试关键API端点
    const endpoints = [
      { name: '定时器当前状态', url: `${this.API_BASE}/timer/current` },
      { name: '项目列表', url: `${this.API_BASE}/projects` },
      { name: '健康检查', url: `${this.API_BASE}/health` }
    ];
    
    for (const endpoint of endpoints) {
      try {
        this.log(`测试 ${endpoint.name}...`);
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        this.log(`  状态码: ${response.status}`);
        this.log(`  状态文本: ${response.statusText}`);
        
        if (response.ok) {
          try {
            const data = await response.json();
            this.log(`  ✅ ${endpoint.name} 响应正常`, 'success');
            if (endpoint.name === '定时器当前状态') {
              this.log(`  定时器运行: ${data.is_running ? '是' : '否'}`);
              if (data.is_running) {
                this.log(`  当前任务: ${data.task_title || '未知'}`);
                this.log(`  运行时间: ${data.formatted_time || '未知'}`);
              }
            }
          } catch (jsonError) {
            this.log(`  ⚠️ JSON解析失败: ${jsonError.message}`, 'warning');
          }
        } else {
          this.log(`  ❌ ${endpoint.name} 请求失败`, 'error');
        }
      } catch (error) {
        this.log(`  ❌ ${endpoint.name} 网络错误: ${error.message}`, 'error');
      }
    }
  }

  // 检查控制台错误
  checkConsoleErrors() {
    this.log('=== 检查控制台错误 ===');
    
    // 监听新的错误
    const originalError = console.error;
    const originalWarn = console.warn;
    const errors = [];
    const warnings = [];
    
    console.error = function(...args) {
      errors.push(args.join(' '));
      originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
      warnings.push(args.join(' '));
      originalWarn.apply(console, args);
    };
    
    // 5秒后恢复并报告
    setTimeout(() => {
      console.error = originalError;
      console.warn = originalWarn;
      
      if (errors.length > 0) {
        this.log(`❌ 发现 ${errors.length} 个新错误:`, 'error');
        errors.forEach((error, index) => {
          this.log(`  ${index + 1}. ${error}`);
        });
      } else {
        this.log('✅ 未发现新错误', 'success');
      }
      
      if (warnings.length > 0) {
        this.log(`⚠️ 发现 ${warnings.length} 个新警告:`, 'warning');
        warnings.forEach((warning, index) => {
          this.log(`  ${index + 1}. ${warning}`);
        });
      } else {
        this.log('✅ 未发现新警告', 'success');
      }
    }, 5000);
    
    this.log('已开始监听控制台错误（5秒）...');
  }

  // 尝试触发组件重新渲染
  triggerRerender() {
    this.log('=== 尝试触发组件重新渲染 ===');
    
    // 触发各种可能导致重新渲染的事件
    const events = [
      'storage',
      'resize', 
      'focus',
      'visibilitychange'
    ];
    
    events.forEach(eventType => {
      try {
        window.dispatchEvent(new Event(eventType));
        this.log(`✅ 触发 ${eventType} 事件`, 'success');
      } catch (error) {
        this.log(`❌ 触发 ${eventType} 事件失败: ${error.message}`, 'error');
      }
    });
    
    // 强制重新计算localStorage状态
    try {
      const currentState = localStorage.getItem('globalTimerState');
      if (currentState) {
        localStorage.removeItem('globalTimerState');
        setTimeout(() => {
          localStorage.setItem('globalTimerState', currentState);
          this.log('✅ 已重新设置localStorage状态', 'success');
        }, 100);
      }
    } catch (error) {
      this.log(`❌ 重新设置localStorage失败: ${error.message}`, 'error');
    }
  }

  // 运行完整诊断
  async runCompleteDiagnostics() {
    this.log('🚀 开始运行完整增强诊断...', 'success');
    
    this.checkReactApp();
    this.checkTimerComponents();
    this.checkTimerContextState();
    await this.checkNetworkAndAPI();
    this.checkConsoleErrors();
    
    this.log('🎉 增强诊断完成！', 'success');
    this.log('如果发现问题，运行 window.enhancedDebug.triggerRerender() 尝试修复');
  }

  // 快速修复
  async quickFix() {
    this.log('=== 执行快速修复 ===');
    
    // 清理状态
    localStorage.removeItem('globalTimerState');
    localStorage.removeItem('floatingTimerPosition');
    localStorage.removeItem('floatingTimerMinimized');
    localStorage.removeItem('floatingTimerHidden');
    this.log('✅ 清理localStorage完成', 'success');
    
    // 触发重新渲染
    this.triggerRerender();
    
    // 等待2秒后重新检查
    setTimeout(async () => {
      this.log('--- 修复后重新检查 ---');
      this.checkTimerComponents();
      await this.checkNetworkAndAPI();
    }, 2000);
    
    this.log('🎉 快速修复完成！', 'success');
  }
}

// 创建增强调试实例
window.enhancedDebug = new EnhancedTimerDebugger();
window.timerDebug = window.enhancedDebug; // 兼容

})();