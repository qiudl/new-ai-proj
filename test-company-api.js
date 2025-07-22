// 测试企业客户管理API的脚本

const fetch = require('node-fetch');

async function testCompanyAPI() {
    try {
        console.log('🔍 测试企业客户管理API...\n');
        
        // 测试获取企业列表
        const response = await fetch('http://localhost:80/api/v1/companies?page=1&page_size=10');
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ API调用失败:', data.message);
            return;
        }
        
        console.log(`✅ API调用成功`);
        console.log(`📊 总企业数: ${data.data.pagination.total}`);
        console.log(`📄 当前页面企业数: ${data.data.data.length}\n`);
        
        // 检查每个企业的企业名称
        console.log('📋 企业列表详情:');
        console.log('='.repeat(80));
        
        data.data.data.forEach((company, index) => {
            console.log(`${index + 1}. 企业信息:`);
            console.log(`   ID: ${company.id}`);
            console.log(`   企业名称: "${company.companyName}"`);
            console.log(`   企业代码: ${company.companyCode || '未设置'}`);
            console.log(`   行业: ${company.industry || '未设置'}`);
            console.log(`   状态: ${company.status} (${company.statusText})`);
            console.log(`   优先级: ${company.priority} (${company.priorityText})`);
            
            // 检查企业名称是否为空
            if (!company.companyName || company.companyName.trim() === '') {
                console.log('   ⚠️  警告: 企业名称为空!');
            } else {
                console.log('   ✅ 企业名称正常');
            }
            
            console.log('-'.repeat(40));
        });
        
        // 统计检查
        const emptyNames = data.data.data.filter(company => 
            !company.companyName || company.companyName.trim() === ''
        );
        
        console.log('\n📈 检查结果统计:');
        console.log(`✅ 有企业名称: ${data.data.data.length - emptyNames.length}`);
        console.log(`❌ 企业名称为空: ${emptyNames.length}`);
        
        if (emptyNames.length === 0) {
            console.log('\n🎉 所有企业都有正确的企业名称！问题已修复。');
        } else {
            console.log('\n⚠️  仍有企业名称为空的记录，需要进一步修复。');
            emptyNames.forEach(company => {
                console.log(`   - ID: ${company.id}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testCompanyAPI();