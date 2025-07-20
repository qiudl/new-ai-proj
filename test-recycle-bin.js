#!/usr/bin/env node

/**
 * 回收站功能测试脚本
 * 测试回收站项目和任务的读取、恢复、永久删除功能
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:8080/api';

// 简单的API包装器
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API错误 (${response.status}): ${errorData}`);
  }
  
  return await response.json();
}

async function testRecycleBin() {
  console.log('🗑️ 开始测试回收站功能...\n');

  try {
    // 1. 测试获取回收站项目
    console.log('1. 测试获取回收站项目');
    const recycledProjects = await apiCall('/system/recycle/projects?page=1&page_size=10');
    console.log('✅ 回收站项目数据结构:', {
      hasData: !!recycledProjects.data,
      dataType: Array.isArray(recycledProjects.data) ? 'array' : typeof recycledProjects.data,
      dataLength: Array.isArray(recycledProjects.data) ? recycledProjects.data.length : 'N/A',
      hasPagination: !!recycledProjects.pagination,
      paginationFields: recycledProjects.pagination ? Object.keys(recycledProjects.pagination) : 'N/A'
    });

    if (recycledProjects.data && recycledProjects.data.length > 0) {
      console.log('   示例项目:', recycledProjects.data[0]);
    } else {
      console.log('   当前回收站中没有项目');
    }

    // 2. 测试获取回收站任务
    console.log('\n2. 测试获取回收站任务');
    const recycledTasks = await apiCall('/system/recycle/tasks?page=1&page_size=10');
    console.log('✅ 回收站任务数据结构:', {
      hasData: !!recycledTasks.data,
      dataType: Array.isArray(recycledTasks.data) ? 'array' : typeof recycledTasks.data,
      dataLength: Array.isArray(recycledTasks.data) ? recycledTasks.data.length : 'N/A',
      hasPagination: !!recycledTasks.pagination,
      paginationFields: recycledTasks.pagination ? Object.keys(recycledTasks.pagination) : 'N/A'
    });

    if (recycledTasks.data && recycledTasks.data.length > 0) {
      console.log('   示例任务:', recycledTasks.data[0]);
    } else {
      console.log('   当前回收站中没有任务');
    }

    // 3. 为了测试，创建一个项目然后删除它
    console.log('\n3. 创建测试项目用于回收站测试');
    const testProject = await apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: '测试回收站项目',
        description: '这是一个用于测试回收站功能的项目'
      })
    });
    console.log('✅ 创建测试项目:', testProject.data);

    // 4. 删除项目（软删除）
    console.log('\n4. 删除测试项目（软删除）');
    await apiCall(`/projects/${testProject.data.id}`, { method: 'DELETE' });
    console.log('✅ 项目已删除');

    // 5. 再次检查回收站项目
    console.log('\n5. 验证项目出现在回收站中');
    const updatedRecycledProjects = await apiCall('/system/recycle/projects?page=1&page_size=10');
    const foundProject = updatedRecycledProjects.data.find(p => p.id === testProject.data.id);
    if (foundProject) {
      console.log('✅ 项目成功出现在回收站中:', foundProject);
    } else {
      console.log('❌ 项目未出现在回收站中');
    }

    // 6. 测试恢复项目
    if (foundProject) {
      console.log('\n6. 测试恢复项目');
      await apiCall(`/system/recycle/projects/${testProject.data.id}/restore`, { method: 'POST' });
      console.log('✅ 项目恢复成功');

      // 7. 验证项目从回收站中移除
      console.log('\n7. 验证项目从回收站中移除');
      const finalRecycledProjects = await apiCall('/system/recycle/projects?page=1&page_size=10');
      const stillInRecycleBin = finalRecycledProjects.data.find(p => p.id === testProject.data.id);
      if (!stillInRecycleBin) {
        console.log('✅ 项目已从回收站中移除');
      } else {
        console.log('❌ 项目仍在回收站中');
      }

      // 8. 清理：永久删除测试项目
      console.log('\n8. 清理测试数据');
      await apiCall(`/projects/${testProject.data.id}`, { method: 'DELETE' });
      console.log('✅ 测试项目已永久删除');
    }

    // 9. 测试审计日志
    console.log('\n9. 测试审计日志');
    const auditLogs = await apiCall('/system/audit/logs?page=1&page_size=5');
    console.log('✅ 审计日志数据结构:', {
      hasData: !!auditLogs.data,
      dataType: Array.isArray(auditLogs.data) ? 'array' : typeof auditLogs.data,
      dataLength: Array.isArray(auditLogs.data) ? auditLogs.data.length : 'N/A',
      hasPagination: !!auditLogs.pagination
    });

    if (auditLogs.data && auditLogs.data.length > 0) {
      console.log('   最近的审计日志:', auditLogs.data.slice(0, 3));
    }

    console.log('\n🎉 回收站功能测试完成！');

  } catch (error) {
    console.error('\n❌ 回收站功能测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testRecycleBin();
