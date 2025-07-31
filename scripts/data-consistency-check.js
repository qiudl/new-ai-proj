#!/usr/bin/env node

// 数据一致性检查工具
const axios = require('axios');

class DataConsistencyChecker {
  constructor(baseURL = 'http://localhost:8080/api/v1') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async login() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        username: 'admin',
        password: 'password123'
      });
      this.token = response.data.data.token;
      return true;
    } catch (error) {
      console.error('❌ 登录失败:', error.message);
      return false;
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async checkCustomFieldsConsistency() {
    console.log('🔍 检查CustomFields数据一致性...\n');
    
    const issues = [];
    
    try {
      // 获取所有任务
      const response = await axios.get(`${this.baseURL}/projects/1/tasks?page_size=1000`, {
        headers: this.getHeaders()
      });
      
      const tasks = response.data.data.data;
      
      console.log(`📊 检查 ${tasks.length} 个任务的数据格式...\n`);
      
      tasks.forEach(task => {
        const taskInfo = `任务 #${task.id}: ${task.title}`;
        
        // 检查custom_fields格式
        if (task.custom_fields === null) {
          issues.push({
            type: 'null_custom_fields',
            task_id: task.id,
            task_title: task.title,
            description: 'custom_fields为null，应该是空对象{}',
            severity: 'low'
          });
        } else if (Array.isArray(task.custom_fields)) {
          issues.push({
            type: 'array_custom_fields',
            task_id: task.id,
            task_title: task.title,
            description: 'custom_fields是数组格式，应该是对象格式',
            data: task.custom_fields,
            severity: 'high'
          });
        } else if (typeof task.custom_fields === 'string') {
          issues.push({
            type: 'string_custom_fields',
            task_id: task.id,
            task_title: task.title,
            description: 'custom_fields是字符串格式，应该是对象格式',
            data: task.custom_fields,
            severity: 'medium'
          });
        } else if (typeof task.custom_fields === 'object') {
          // 检查对象内容
          const cf = task.custom_fields;
          
          // 检查priority字段
          if (cf.priority && !['low', 'medium', 'high'].includes(cf.priority)) {
            issues.push({
              type: 'invalid_priority',
              task_id: task.id,
              task_title: task.title,
              description: `无效的priority值: ${cf.priority}`,
              severity: 'medium'
            });
          }
          
          // 检查tags字段
          if (cf.tags && !Array.isArray(cf.tags)) {
            issues.push({
              type: 'invalid_tags',
              task_id: task.id,
              task_title: task.title,
              description: `tags应该是数组格式，当前是: ${typeof cf.tags}`,
              data: cf.tags,
              severity: 'medium'
            });
          }
          
          // 检查estimated_hours字段
          if (cf.estimated_hours && (isNaN(cf.estimated_hours) || cf.estimated_hours < 0)) {
            issues.push({
              type: 'invalid_estimated_hours',
              task_id: task.id,
              task_title: task.title,
              description: `无效的estimated_hours值: ${cf.estimated_hours}`,
              severity: 'medium'
            });
          }
          
          // 检查progress字段
          if (cf.progress && (isNaN(cf.progress) || cf.progress < 0 || cf.progress > 100)) {
            issues.push({
              type: 'invalid_progress',
              task_id: task.id,
              task_title: task.title,
              description: `无效的progress值: ${cf.progress}`,
              severity: 'medium'
            });
          }
        }
        
        // 检查层级一致性
        if (task.parent_id && task.task_level === 0) {
          issues.push({
            type: 'hierarchy_inconsistency',
            task_id: task.id,
            task_title: task.title,
            description: `有parent_id但task_level为0`,
            data: { parent_id: task.parent_id, task_level: task.task_level },
            severity: 'high'
          });
        }
        
        if (!task.parent_id && task.task_level > 0) {
          issues.push({
            type: 'hierarchy_inconsistency',
            task_id: task.id,
            task_title: task.title,
            description: `没有parent_id但task_level大于0`,
            data: { parent_id: task.parent_id, task_level: task.task_level },
            severity: 'high'
          });
        }
      });
      
      return issues;
      
    } catch (error) {
      console.error('❌ 检查过程失败:', error.message);
      return [];
    }
  }

  async generateFixSuggestions(issues) {
    console.log('\n🛠️  修复建议:\n');
    
    const groupedIssues = {};
    issues.forEach(issue => {
      if (!groupedIssues[issue.type]) {
        groupedIssues[issue.type] = [];
      }
      groupedIssues[issue.type].push(issue);
    });
    
    Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
      console.log(`\n📋 ${type} (${typeIssues.length}个问题):`);
      
      switch (type) {
        case 'array_custom_fields':
          console.log('   SQL修复脚本:');
          typeIssues.forEach(issue => {
            console.log(`   UPDATE tasks SET custom_fields = '{}' WHERE id = ${issue.task_id}; -- ${issue.task_title}`);
          });
          break;
          
        case 'null_custom_fields':
          console.log('   SQL修复脚本:');
          console.log(`   UPDATE tasks SET custom_fields = '{}' WHERE custom_fields IS NULL;`);
          break;
          
        case 'string_custom_fields':
          console.log('   需要手动检查JSON格式:');
          typeIssues.forEach(issue => {
            console.log(`   任务 #${issue.task_id}: ${issue.data}`);
          });
          break;
          
        case 'hierarchy_inconsistency':
          console.log('   需要重新计算task_level:');
          console.log('   执行层级修复脚本或重新计算parent-child关系');
          break;
          
        default:
          console.log('   手动检查和修复相关数据');
      }
    });
  }

  async generateReport(issues) {
    console.log('\n📊 数据一致性检查报告\n');
    
    const severityCount = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
    
    console.log('📈 问题统计:');
    console.log(`   🔴 高严重性: ${severityCount.high}`);
    console.log(`   🟡 中严重性: ${severityCount.medium}`);
    console.log(`   🟢 低严重性: ${severityCount.low}`);
    console.log(`   📝 总计: ${issues.length}`);
    
    if (issues.length === 0) {
      console.log('\n✅ 所有数据格式检查通过！');
      return;
    }
    
    console.log('\n📋 详细问题列表:');
    issues.forEach((issue, index) => {
      const severityIcon = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[issue.severity];
      
      console.log(`\n${index + 1}. ${severityIcon} 任务 #${issue.task_id}: ${issue.task_title}`);
      console.log(`   问题: ${issue.description}`);
      if (issue.data) {
        console.log(`   数据: ${JSON.stringify(issue.data)}`);
      }
    });
  }

  async run() {
    console.log('🔍 数据一致性检查工具启动...\n');
    
    // 登录
    if (!await this.login()) {
      process.exit(1);
    }
    console.log('✅ 登录成功\n');
    
    // 检查数据一致性
    const issues = await this.checkCustomFieldsConsistency();
    
    // 生成报告
    await this.generateReport(issues);
    
    // 生成修复建议
    if (issues.length > 0) {
      await this.generateFixSuggestions(issues);
    }
    
    console.log('\n🎯 预防措施建议:');
    console.log('   1. 在前端和后端都添加数据验证');
    console.log('   2. 使用数据库约束确保数据格式');
    console.log('   3. 定期运行此检查工具');
    console.log('   4. 在API层面添加数据清理逻辑');
    
    console.log('\n✅ 检查完成');
  }
}

// 运行检查
const checker = new DataConsistencyChecker();
checker.run().catch(error => {
  console.error('❌ 检查工具运行失败:', error);
  process.exit(1);
});