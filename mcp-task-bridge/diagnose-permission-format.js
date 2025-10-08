#!/usr/bin/env node
/**
 * 诊断权限格式问题
 * 测试后端使用的是点号(.)还是下划线(_)格式
 */

const TOKEN = process.env.ADMIN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk1ODY3OTEsIm5iZiI6MTc1OTUwMDM5MSwiaWF0IjoxNzU5NTAwMzkxLCJqdGkiOiJhMDY2OTA1Y2YxZmRkY2Q2MDY3MmY1NWQ0MzY2ZmY4MCJ9.l-Za1e7Ui6AXmpyv8d3VMP5HgqV6mC-iyAJoaXQDXFQ';
const API_BASE = process.env.API_BASE || 'http://152.136.104.251:8080/api/v1';

async function testEndpoint(name, url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    const data = await response.json();
    
    console.log(`\n${name}:`);
    console.log(`  状态码: ${response.status}`);
    console.log(`  成功: ${data.success}`);
    
    if (!data.success) {
      console.log(`  错误: ${data.error}`);
      
      // 提取权限信息
      if (data.error && data.error.includes('需要权限')) {
        const match = data.error.match(/需要权限[：:]\s*([a-zA-Z_:.]+)/);
        if (match) {
          console.log(`  ⚠️  需要的权限格式: "${match[1]}"`);
          
          // 分析格式
          if (match[1].includes('_')) {
            console.log(`  📌 使用下划线(_)格式`);
          } else if (match[1].includes('.')) {
            console.log(`  📌 使用点号(.)格式`);
          } else if (match[1].includes(':')) {
            console.log(`  📌 使用冒号(:)格式`);
          }
        }
      }
    } else {
      console.log(`  ✅ 访问成功`);
    }
    
    return {
      endpoint: name,
      status: response.status,
      success: data.success,
      error: data.error,
      requiredPermission: data.error ? extractPermission(data.error) : null
    };
  } catch (error) {
    console.log(`\n${name}:`);
    console.log(`  ❌ 请求失败: ${error.message}`);
    return { endpoint: name, error: error.message };
  }
}

function extractPermission(errorMsg) {
  const match = errorMsg.match(/需要权限[：:]\s*([a-zA-Z_:.]+)/);
  return match ? match[1] : null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   权限格式诊断工具                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`服务器: ${API_BASE}`);
  console.log(`Token: ${TOKEN.substring(0, 50)}...`);

  const results = [];

  // 测试各种端点
  results.push(await testEndpoint('任务列表', `${API_BASE}/tasks?limit=5`));
  results.push(await testEndpoint('项目列表', `${API_BASE}/projects?limit=5`));
  results.push(await testEndpoint('任务详情', `${API_BASE}/tasks/1`));
  results.push(await testEndpoint('项目详情', `${API_BASE}/projects/1`));
  results.push(await testEndpoint('用户列表', `${API_BASE}/users?limit=5`));
  results.push(await testEndpoint('文档列表', `${API_BASE}/documents?limit=5`));
  
  // 汇总分析
  console.log('\n' + '='.repeat(60));
  console.log('📊 权限格式分析汇总');
  console.log('='.repeat(60));
  
  const permissions = results
    .filter(r => r.requiredPermission)
    .map(r => r.requiredPermission);
  
  if (permissions.length === 0) {
    console.log('✅ 所有测试端点都可访问,未发现权限问题');
  } else {
    console.log(`\n发现 ${permissions.length} 个需要的权限:`);
    
    const uniquePerms = [...new Set(permissions)];
    uniquePerms.forEach(perm => {
      let format = '';
      if (perm.includes('_')) format = '下划线(_)';
      else if (perm.includes('.')) format = '点号(.)';
      else if (perm.includes(':')) format = '冒号(:)';
      
      console.log(`  - ${perm} [${format}]`);
    });
    
    // 统计格式
    const formats = {
      underscore: uniquePerms.filter(p => p.includes('_')).length,
      dot: uniquePerms.filter(p => p.includes('.')).length,
      colon: uniquePerms.filter(p => p.includes(':')).length
    };
    
    console.log('\n格式统计:');
    if (formats.underscore > 0) console.log(`  下划线(_): ${formats.underscore}个`);
    if (formats.dot > 0) console.log(`  点号(.): ${formats.dot}个`);
    if (formats.colon > 0) console.log(`  冒号(:): ${formats.colon}个`);
    
    // 结论
    console.log('\n🔍 结论:');
    if (formats.underscore > formats.dot && formats.underscore > formats.colon) {
      console.log('  后端主要使用 下划线(_) 格式');
    } else if (formats.dot > formats.underscore && formats.dot > formats.colon) {
      console.log('  后端主要使用 点号(.) 格式');
    } else if (formats.colon > formats.underscore && formats.colon > formats.dot) {
      console.log('  后端主要使用 冒号(:) 格式');
    } else {
      console.log('  后端使用混合格式');
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
