#!/usr/bin/env node
/**
 * 测试update_task_document MCP接口
 * 用于验证任务文档更新功能
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const MCP_BASE_URL = `${API_BASE_URL}/api/v1/mcp`;

// 测试配置
const TEST_TASK_ID = 3177; // 使用当前任务ID进行测试

async function devLogin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/v1/dev/quick-login`, {
      username: 'admin'
    });

    if (response.data.success) {
      console.log('✅ 开发环境快速登录成功');
      return response.data.data.token;
    } else {
      throw new Error('登录失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

async function getTaskDocument(token, taskId) {
  try {
    const response = await axios.get(`${MCP_BASE_URL}/task-document/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error(`❌ 获取任务${taskId}文档失败:`, error.response?.data || error.message);
    return null;
  }
}

async function createTaskDocument(token, taskId) {
  try {
    const content = `# 任务${taskId}测试文档

## 初始内容

这是用于测试update_task_document接口的初始文档内容。

创建时间: ${new Date().toISOString()}
`;

    const response = await axios.post(`${MCP_BASE_URL}/create-and-attach`, {
      taskId,
      content,
      title: `任务${taskId}测试文档`
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`✅ 创建任务${taskId}文档成功`);
      console.log(`   文档ID: ${response.data.document_id}`);
      return response.data;
    } else {
      console.error('❌ 创建文档失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建文档失败:', error.response?.data || error.message);
    return null;
  }
}

async function updateTaskDocument(token, taskId, content, title) {
  try {
    const updateData = { content };
    if (title) {
      updateData.title = title;
    }

    console.log(`\n🔄 更新任务${taskId}文档...`);
    console.log(`   内容长度: ${content.length}`);
    if (title) console.log(`   新标题: ${title}`);

    const response = await axios.put(`${MCP_BASE_URL}/task-document/${taskId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ 更新任务文档成功');
      console.log(`   任务ID: ${response.data.task_id || response.data.data?.task_id}`);
      console.log(`   文档ID: ${response.data.document_id || response.data.data?.id}`);
      console.log(`   版本号: ${response.data.version || response.data.data?.version}`);
      console.log(`   更新时间: ${response.data.updated_at || response.data.data?.updated_at}`);
      return response.data;
    } else {
      console.error('❌ 更新文档失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 更新文档失败:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 开始测试update_task_document接口\n');

  try {
    // 1. 登录
    console.log('📝 步骤1: 开发环境登录');
    const token = await devLogin();
    console.log();

    // 2. 检查任务文档是否存在
    console.log('📝 步骤2: 检查任务文档');
    let docData = await getTaskDocument(token, TEST_TASK_ID);

    if (!docData || !docData.success || (docData.documents && docData.documents.length === 0)) {
      console.log(`⚠️  任务${TEST_TASK_ID}暂无文档，先创建一个`);
      await createTaskDocument(token, TEST_TASK_ID);
      console.log();
    } else {
      console.log(`✅ 任务${TEST_TASK_ID}已有文档`);
      console.log();
    }

    // 3. 测试1: 只更新内容
    console.log('📝 步骤3: 测试只更新文档内容');
    const newContent1 = `# 任务${TEST_TASK_ID}测试文档 - 已更新

## 更新内容 - 测试1

这是第一次更新的内容。

更新时间: ${new Date().toISOString()}

## 测试说明

本次测试仅更新文档内容，不更新标题。
`;
    await updateTaskDocument(token, TEST_TASK_ID, newContent1);
    console.log();

    // 4. 测试2: 同时更新内容和标题
    console.log('📝 步骤4: 测试同时更新内容和标题');
    const newContent2 = `# 任务${TEST_TASK_ID}测试文档 - 二次更新

## 更新内容 - 测试2

这是第二次更新的内容，并且同时更新了标题。

更新时间: ${new Date().toISOString()}

## 测试说明

本次测试同时更新文档内容和标题。

## 新增功能验证

- ✅ 支持通过taskId更新文档
- ✅ 支持只更新content
- ✅ 支持同时更新content和title
- ✅ 自动递增版本号
`;
    const newTitle = `任务${TEST_TASK_ID}测试文档 - 已更新`;
    await updateTaskDocument(token, TEST_TASK_ID, newContent2, newTitle);
    console.log();

    // 5. 验证更新结果
    console.log('📝 步骤5: 验证更新结果');
    const updatedDoc = await getTaskDocument(token, TEST_TASK_ID);
    if (updatedDoc && updatedDoc.success) {
      console.log('✅ 成功获取更新后的文档');
      if (updatedDoc.documents && updatedDoc.documents.length > 0) {
        const doc = updatedDoc.documents[0];
        console.log(`   文档ID: ${doc.id}`);
        console.log(`   标题: ${doc.title}`);
        console.log(`   版本: ${doc.version}`);
        console.log(`   内容长度: ${doc.content?.length || 0}`);
      }
    }
    console.log();

    console.log('🎉 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests();
