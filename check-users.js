const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_project_v2',
  password: 'postgres',
  port: 5432,
});

async function checkDatabaseUsers() {
  console.log('🔍 检查数据库中的用户信息...\n');
  
  try {
    const client = await pool.connect();
    
    // 查询所有用户
    const usersResult = await client.query(`
      SELECT id, username, email, password_hash, role, user_type, is_active, created_at
      FROM users 
      ORDER BY id
    `);
    
    console.log('数据库中的用户列表:');
    console.log('ID | 用户名 | 邮箱 | 角色 | 用户类型 | 状态 | 创建时间');
    console.log('-'.repeat(80));
    
    if (usersResult.rows.length === 0) {
      console.log('❌ 没有找到任何用户！');
      console.log('这可能是导致登录失败的原因。');
    } else {
      usersResult.rows.forEach(user => {
        console.log(`${user.id} | ${user.username} | ${user.email} | ${user.role} | ${user.user_type} | ${user.is_active ? '激活' : '未激活'} | ${user.created_at}`);
      });
    }
    
    // 检查密码哈希格式
    if (usersResult.rows.length > 0) {
      console.log('\n密码哈希示例:');
      usersResult.rows.slice(0, 3).forEach(user => {
        console.log(`用户 ${user.username}: ${user.password_hash.substring(0, 20)}...`);
      });
    }
    
    client.release();
    
    // 测试密码验证
    if (usersResult.rows.length > 0) {
      console.log('\n🔧 测试密码验证...');
      const bcrypt = require('bcryptjs');
      
      // 尝试常见的密码
      const testPasswords = ['admin123', 'password', '123456', 'admin'];
      
      for (const user of usersResult.rows.slice(0, 2)) {
        console.log(`\n测试用户 ${user.username} 的密码:`);
        
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPassword, user.password_hash);
            if (isMatch) {
              console.log(`✅ 密码匹配: ${testPassword}`);
              break;
            } else {
              console.log(`❌ 密码不匹配: ${testPassword}`);
            }
          } catch (error) {
            console.log(`❌ 密码验证出错 (${testPassword}): ${error.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 数据库连接或查询失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n可能的解决方案:');
      console.log('1. 确保PostgreSQL服务正在运行');
      console.log('2. 检查数据库连接参数是否正确');
      console.log('3. 运行: brew services start postgresql 或 pg_ctl start');
    }
  } finally {
    await pool.end();
  }
}

checkDatabaseUsers().catch(console.error);
