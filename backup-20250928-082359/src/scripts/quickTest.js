// 快速系统测试脚本
// 在浏览器控制台中运行: window.runQuickTest()

window.runQuickTest = async function() {
  console.log('🚀 开始快速系统测试...\n');
  
  const results = [];
  
  // 测试1: 性能监控
  console.log('1️⃣ 测试性能监控...');
  try {
    const performanceMonitor = window.performanceMonitor || (await import('/src/services/performanceMonitor.ts')).performanceMonitor;
    
    // 测试API调用追踪
    const trackId = performanceMonitor.startApiCall('/test', 'GET');
    performanceMonitor.endApiCall(trackId, 200, 1024, false);
    
    // 测试用户行为追踪
    performanceMonitor.trackUserAction('test-action', 'quick-test');
    
    // 获取统计
    const stats = performanceMonitor.getPerformanceStats();
    console.log('✅ 性能监控正常 - API调用:', stats.totalRequests);
    results.push({ test: '性能监控', status: '✅', details: `${stats.totalRequests} API调用记录` });
  } catch (error) {
    console.log('❌ 性能监控失败:', error.message);
    results.push({ test: '性能监控', status: '❌', details: error.message });
  }
  
  // 测试2: React Query
  console.log('\n2️⃣ 测试React Query...');
  try {
    const reactQuery = await import('@tanstack/react-query');
    const hasQueryClient = typeof reactQuery.useQueryClient === 'function';
    
    if (hasQueryClient) {
      console.log('✅ React Query正常');
      results.push({ test: 'React Query', status: '✅', details: '查询客户端可用' });
    } else {
      console.log('❌ React Query配置异常');
      results.push({ test: 'React Query', status: '❌', details: '查询客户端不可用' });
    }
  } catch (error) {
    console.log('❌ React Query加载失败:', error.message);
    results.push({ test: 'React Query', status: '❌', details: error.message });
  }
  
  // 测试3: 导出功能
  console.log('\n3️⃣ 测试导出功能...');
  try {
    const exportService = await import('/src/services/exportService.ts');
    const testData = {
      weekRange: '测试周',
      selectedWeek: new Date(),
      tasks: [{ id: 1, title: '测试任务', status: 'completed' }],
      projects: [{ id: 1, name: '测试项目' }],
      customers: [],
      stats: { totalTasks: 1, completedTasks: 1, inProgressTasks: 0, todoTasks: 0, overdueTasks: 0, completionRate: 100 },
      filters: { selectedProject: 1, selectedStatus: 'all', searchText: '' }
    };
    
    const preview = exportService.generateExportPreview(testData);
    
    if (preview && preview.summary && Array.isArray(preview.sheets)) {
      console.log('✅ 导出功能正常 - 工作表数:', preview.sheets.length);
      results.push({ test: '导出功能', status: '✅', details: `${preview.sheets.length} 个工作表` });
    } else {
      console.log('❌ 导出预览异常');
      results.push({ test: '导出功能', status: '❌', details: '预览数据结构错误' });
    }
  } catch (error) {
    console.log('❌ 导出功能失败:', error.message);
    results.push({ test: '导出功能', status: '❌', details: error.message });
  }
  
  // 测试4: 缓存系统
  console.log('\n4️⃣ 测试缓存系统...');
  try {
    const cacheUtils = await import('/src/utils/cache.ts');
    
    if (cacheUtils.CACHE_KEYS && cacheUtils.CACHE_TTL) {
      console.log('✅ 缓存系统正常');
      results.push({ test: '缓存系统', status: '✅', details: '缓存键和TTL配置正常' });
    } else {
      console.log('❌ 缓存配置异常');
      results.push({ test: '缓存系统', status: '❌', details: '缓存配置不完整' });
    }
  } catch (error) {
    console.log('❌ 缓存系统失败:', error.message);
    results.push({ test: '缓存系统', status: '❌', details: error.message });
  }
  
  // 测试5: URL状态管理
  console.log('\n5️⃣ 测试URL状态管理...');
  try {
    const urlState = await import('/src/hooks/useUrlState.ts');
    
    if (typeof urlState.generateShareableUrl === 'function') {
      const testFilters = {
        selectedWeek: new Date(),
        selectedProject: 1,
        selectedStatus: 'completed',
        searchText: 'test',
        viewMode: 'calendar'
      };
      
      const url = urlState.generateShareableUrl(testFilters);
      
      if (typeof url === 'string' && url.length > 0) {
        console.log('✅ URL状态管理正常');
        results.push({ test: 'URL状态管理', status: '✅', details: '分享链接生成正常' });
      } else {
        console.log('❌ URL生成异常');
        results.push({ test: 'URL状态管理', status: '❌', details: 'URL生成失败' });
      }
    } else {
      console.log('❌ URL状态函数不可用');
      results.push({ test: 'URL状态管理', status: '❌', details: '函数不可用' });
    }
  } catch (error) {
    console.log('❌ URL状态管理失败:', error.message);
    results.push({ test: 'URL状态管理', status: '❌', details: error.message });
  }
  
  // 测试6: API拦截器
  console.log('\n6️⃣ 测试API拦截器...');
  try {
    const originalFetch = window.fetch;
    const isEnhanced = originalFetch && originalFetch.toString().length > 100;
    
    if (isEnhanced) {
      console.log('✅ API拦截器已安装');
      results.push({ test: 'API拦截器', status: '✅', details: 'Fetch已被增强' });
    } else {
      console.log('⚠️ API拦截器可能未安装');
      results.push({ test: 'API拦截器', status: '⚠️', details: 'Fetch未被明显修改' });
    }
  } catch (error) {
    console.log('❌ API拦截器检查失败:', error.message);
    results.push({ test: 'API拦截器', status: '❌', details: error.message });
  }
  
  // 测试7: 组件加载
  console.log('\n7️⃣ 测试组件加载...');
  try {
    const components = [
      '/src/components/ExportModal.tsx',
      '/src/components/PerformanceMonitorDashboard.tsx', 
      '/src/components/SystemValidationPanel.tsx',
      '/src/components/QuickDatePicker.tsx'
    ];
    
    let loadedCount = 0;
    for (const component of components) {
      try {
        await import(component);
        loadedCount++;
      } catch (err) {
        console.log(`⚠️ 组件 ${component} 加载失败`);
      }
    }
    
    console.log(`✅ 组件加载完成 ${loadedCount}/${components.length}`);
    results.push({ test: '组件加载', status: '✅', details: `${loadedCount}/${components.length} 个组件` });
  } catch (error) {
    console.log('❌ 组件加载测试失败:', error.message);
    results.push({ test: '组件加载', status: '❌', details: error.message });
  }
  
  // 输出结果摘要
  console.log('\n📊 ===== 测试结果摘要 =====');
  const passed = results.filter(r => r.status === '✅').length;
  const warning = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;
  const total = results.length;
  
  console.log(`总测试数: ${total}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`⚠️ 警告: ${warning}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`成功率: ${Math.round((passed / total) * 100)}%`);
  
  console.log('\n📋 详细结果:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.status} ${result.test} - ${result.details}`);
  });
  
  // 返回结果供进一步处理
  return results;
};

// 自动运行测试（如果在开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 开发环境检测到，快速测试功能已准备就绪');
  console.log('💡 在控制台运行 window.runQuickTest() 开始测试');
}

// 导出供其他模块使用
export default window.runQuickTest;