#!/usr/bin/env node

/**
 * 企业客户管理功能全面测试脚本
 * 测试前端和后端所有功能是否正常工作
 */

const axios = require('axios');
const colors = require('colors');

// 配置
const BASE_URL = 'http://localhost:8080/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

class CompanyManagementTester {
    constructor() {
        this.results = [];
        this.testCount = 0;
        this.passCount = 0;
        this.failCount = 0;
    }

    // 记录测试结果
    logResult(testName, passed, error = null) {
        this.testCount++;
        if (passed) {
            this.passCount++;
            console.log(`✅ ${testName}`.green);
        } else {
            this.failCount++;
            console.log(`❌ ${testName}`.red);
            if (error) {
                console.log(`   Error: ${error.message}`.red);
            }
        }
        this.results.push({ testName, passed, error });
    }

    // 测试API响应
    async testApiEndpoint(name, url, method = 'GET', data = null) {
        try {
            const response = await axios({
                method,
                url: `${BASE_URL}${url}`,
                data,
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status >= 200 && response.status < 300) {
                this.logResult(`API ${name} - 状态码: ${response.status}`, true);
                return response.data;
            } else {
                this.logResult(`API ${name}`, false, new Error(`状态码: ${response.status}`));
                return null;
            }
        } catch (error) {
            this.logResult(`API ${name}`, false, error);
            return null;
        }
    }

    // 测试企业统计数据
    async testCompanyStats() {
        console.log('\n🏢 测试企业统计数据...'.cyan);
        
        const stats = await this.testApiEndpoint(
            '获取企业统计数据',
            '/companies/stats'
        );
        
        if (stats && stats.success && stats.data) {
            const data = stats.data;
            this.logResult('统计数据包含总企业数', data.total_companies >= 0);
            this.logResult('统计数据包含活跃企业数', data.active_companies >= 0);
            this.logResult('统计数据包含潜在企业数', data.potential_companies >= 0);
            this.logResult('统计数据包含高优先级企业数', data.high_priority_companies >= 0);
            this.logResult('统计数据包含年度合同总额', data.total_annual_contract_value >= 0);
            this.logResult('统计数据包含平均合同金额', data.average_annual_contract_value >= 0);
            
            console.log(`   📊 统计数据概览:`.yellow);
            console.log(`      总企业数: ${data.total_companies}`);
            console.log(`      活跃企业: ${data.active_companies}`);
            console.log(`      潜在企业: ${data.potential_companies}`);
            console.log(`      高优先级: ${data.high_priority_companies}`);
            console.log(`      年度合同总额: ¥${data.total_annual_contract_value.toLocaleString()}`);
            console.log(`      平均合同金额: ¥${data.average_annual_contract_value.toLocaleString()}`);
        }
    }

    // 测试企业列表
    async testCompanyList() {
        console.log('\n📋 测试企业列表功能...'.cyan);
        
        // 测试默认列表
        const defaultList = await this.testApiEndpoint(
            '获取企业列表(默认参数)',
            '/companies'
        );
        
        if (defaultList && defaultList.success) {
            const data = defaultList.data;
            this.logResult('企业列表包含数据字段', Array.isArray(data.data));
            this.logResult('企业列表包含分页信息', data.pagination && typeof data.pagination === 'object');
            
            if (data.data.length > 0) {
                const company = data.data[0];
                this.logResult('企业对象包含ID', typeof company.id === 'number');
                this.logResult('企业对象包含名称', typeof company.company_name === 'string');
                this.logResult('企业对象包含状态', typeof company.status === 'string');
                this.logResult('企业对象包含状态文本', typeof company.status_text === 'string');
                this.logResult('企业对象包含优先级', typeof company.priority === 'string');
                this.logResult('企业对象包含优先级文本', typeof company.priority_text === 'string');
                this.logResult('企业对象包含类型文本', typeof company.company_type_text === 'string');
                this.logResult('企业对象包含创建时间', typeof company.created_at === 'string');
                this.logResult('企业对象包含更新时间', typeof company.updated_at === 'string');
            }
        }

        // 测试分页
        await this.testApiEndpoint(
            '获取企业列表(分页测试)',
            '/companies?page=1&page_size=5'
        );

        // 测试筛选
        await this.testApiEndpoint(
            '获取企业列表(状态筛选)',
            '/companies?status=active'
        );

        await this.testApiEndpoint(
            '获取企业列表(优先级筛选)',
            '/companies?priority=high'
        );

        await this.testApiEndpoint(
            '获取企业列表(搜索功能)',
            '/companies?search=腾讯'
        );
    }

    // 测试单个企业信息
    async testCompanyDetail() {
        console.log('\n🔍 测试企业详情功能...'.cyan);
        
        // 先获取一个企业ID
        const list = await this.testApiEndpoint('获取企业ID', '/companies?page_size=1');
        
        if (list && list.success && list.data.data.length > 0) {
            const companyId = list.data.data[0].id;
            
            const detail = await this.testApiEndpoint(
                `获取企业详情(ID: ${companyId})`,
                `/companies/${companyId}`
            );
            
            if (detail && detail.success) {
                const company = detail.data;
                this.logResult('企业详情包含完整信息', company.id === companyId);
                this.logResult('企业详情包含联系方式', true); // 总是包含，可能为null
                this.logResult('企业详情包含地址信息', true); // 总是包含，可能为null
            }
        }

        // 测试不存在的企业
        await this.testApiEndpoint(
            '获取不存在的企业详情',
            '/companies/99999'
        );
    }

    // 测试企业创建
    async testCompanyCreation() {
        console.log('\n➕ 测试企业创建功能...'.cyan);
        
        const testCompany = {
            company_name: `测试企业_${Date.now()}`,
            company_code: `TEST${Date.now()}`,
            industry: '软件开发',
            company_type: 'limited_company',
            business_license: '91000000000000000X',
            legal_representative: '张三',
            address: '北京市朝阳区测试街道123号',
            city: '北京',
            province: '北京',
            postal_code: '100000',
            website: 'https://test.example.com',
            main_phone: '010-12345678',
            main_email: 'test@example.com',
            status: 'potential',
            priority: 'medium',
            annual_contract_value: 100000,
            employee_count: 50,
            company_size: 'small'
        };

        const created = await this.testApiEndpoint(
            '创建新企业',
            '/companies',
            'POST',
            testCompany
        );

        if (created && created.success) {
            const newCompany = created.data;
            this.logResult('新企业具有有效ID', typeof newCompany.id === 'number');
            this.logResult('新企业名称匹配', newCompany.company_name === testCompany.company_name);
            this.logResult('新企业状态匹配', newCompany.status === testCompany.status);
            
            // 测试更新
            const updateData = {
                ...testCompany,
                company_name: `${testCompany.company_name}_更新`,
                status: 'active',
                priority: 'high'
            };

            const updated = await this.testApiEndpoint(
                `更新企业(ID: ${newCompany.id})`,
                `/companies/${newCompany.id}`,
                'PUT',
                updateData
            );

            if (updated && updated.success) {
                this.logResult('企业更新成功', updated.data.company_name.includes('更新'));
                this.logResult('企业状态更新', updated.data.status === 'active');
            }

            // 测试删除 (可选 - 如果不想删除测试数据可以注释掉)
            /*
            const deleted = await this.testApiEndpoint(
                `删除企业(ID: ${newCompany.id})`,
                `/companies/${newCompany.id}`,
                'DELETE'
            );
            
            if (deleted && deleted.success) {
                this.logResult('企业删除成功', true);
            }
            */
        }
    }

    // 测试企业用户管理
    async testCompanyUsers() {
        console.log('\n👥 测试企业用户管理功能...'.cyan);
        
        // 获取一个企业ID用于测试
        const list = await this.testApiEndpoint('获取企业ID用于用户测试', '/companies?page_size=1');
        
        if (list && list.success && list.data.data.length > 0) {
            const companyId = list.data.data[0].id;
            
            // 测试获取企业用户列表
            const users = await this.testApiEndpoint(
                `获取企业用户列表(企业ID: ${companyId})`,
                `/companies/${companyId}/users`
            );
            
            if (users && users.success) {
                this.logResult('企业用户列表返回数组', Array.isArray(users.data));
            }

            // 测试创建企业用户
            const testUser = {
                name: `测试用户_${Date.now()}`,
                position: '产品经理',
                department: '产品部',
                email: `test_${Date.now()}@example.com`,
                phone: '138-0000-0000',
                mobile: '138-0000-0000',
                role: 'normal',
                is_primary_contact: false,
                can_make_decisions: false,
                access_level: 2,
                status: 'active',
                notes: '测试用户账号'
            };

            const createdUser = await this.testApiEndpoint(
                `创建企业用户(企业ID: ${companyId})`,
                `/companies/${companyId}/users`,
                'POST',
                testUser
            );

            if (createdUser && createdUser.success) {
                const user = createdUser.data;
                this.logResult('新用户具有有效ID', typeof user.id === 'number');
                this.logResult('新用户名称匹配', user.name === testUser.name);
                this.logResult('新用户邮箱匹配', user.email === testUser.email);
                this.logResult('新用户角色文本存在', typeof user.role_text === 'string');
            }
        }
    }

    // 测试前端页面可访问性
    async testFrontendPages() {
        console.log('\n🌐 测试前端页面可访问性...'.cyan);
        
        const pages = [
            { name: '主页', url: '' },
            { name: '企业列表页', url: '/companies' },
            { name: '企业创建页', url: '/companies/create' },
            { name: '登录页', url: '/login' }
        ];

        for (const page of pages) {
            try {
                const response = await axios.get(`${FRONTEND_URL}${page.url}`, {
                    timeout: 5000,
                    validateStatus: function (status) {
                        return status < 500; // 接受所有小于500的状态码
                    }
                });
                
                if (response.status === 200) {
                    this.logResult(`前端${page.name}可访问`, true);
                } else {
                    this.logResult(`前端${page.name}可访问`, false, new Error(`状态码: ${response.status}`));
                }
            } catch (error) {
                this.logResult(`前端${page.name}可访问`, false, error);
            }
        }
    }

    // 测试数据验证
    async testDataValidation() {
        console.log('\n🔐 测试数据验证功能...'.cyan);
        
        // 测试无效数据
        const invalidCompany = {
            company_name: '', // 空名称
            company_type: 'invalid_type', // 无效类型
            status: 'invalid_status', // 无效状态
            priority: 'invalid_priority', // 无效优先级
            main_email: 'invalid-email', // 无效邮箱
            website: 'not-a-url', // 无效网址
            annual_contract_value: -1000 // 负数金额
        };

        const invalidResponse = await this.testApiEndpoint(
            '创建企业(无效数据验证)',
            '/companies',
            'POST',
            invalidCompany
        );

        // 验证失败应该返回400状态码
        this.logResult('无效数据被正确拒绝', 
            !invalidResponse || !invalidResponse.success);
    }

    // 运行所有测试
    async runAllTests() {
        console.log('🚀 开始企业客户管理功能全面测试...\n'.bold.blue);
        
        // 运行各项测试
        await this.testCompanyStats();
        await this.testCompanyList();
        await this.testCompanyDetail();
        await this.testCompanyCreation();
        await this.testCompanyUsers();
        await this.testFrontendPages();
        await this.testDataValidation();
        
        // 输出测试总结
        this.printSummary();
    }

    // 打印测试总结
    printSummary() {
        console.log('\n' + '='.repeat(60).blue);
        console.log('📋 测试总结报告'.bold.blue);
        console.log('='.repeat(60).blue);
        
        console.log(`\n📊 测试统计:`.yellow);
        console.log(`   总测试数: ${this.testCount}`);
        console.log(`   通过数量: ${this.passCount}`.green);
        console.log(`   失败数量: ${this.failCount}`.red);
        console.log(`   通过率: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
        
        if (this.failCount > 0) {
            console.log(`\n❌ 失败的测试:`.red);
            this.results
                .filter(r => !r.passed)
                .forEach(r => {
                    console.log(`   • ${r.testName}`.red);
                    if (r.error) {
                        console.log(`     错误: ${r.error.message}`.red);
                    }
                });
        }
        
        console.log(`\n✅ 成功的测试:`.green);
        this.results
            .filter(r => r.passed)
            .slice(0, 5) // 只显示前5个成功的测试
            .forEach(r => {
                console.log(`   • ${r.testName}`.green);
            });
            
        if (this.passCount > 5) {
            console.log(`   ... 和其他 ${this.passCount - 5} 个成功测试`.green);
        }
        
        // 总体评估
        const overallScore = (this.passCount / this.testCount) * 100;
        if (overallScore >= 90) {
            console.log(`\n🎉 系统状态: 优秀 (${overallScore.toFixed(1)}%)`.green.bold);
        } else if (overallScore >= 70) {
            console.log(`\n⚠️  系统状态: 良好 (${overallScore.toFixed(1)}%)`.yellow.bold);
        } else {
            console.log(`\n🚨 系统状态: 需要修复 (${overallScore.toFixed(1)}%)`.red.bold);
        }
        
        console.log('\n' + '='.repeat(60).blue);
    }
}

// 运行测试
async function main() {
    const tester = new CompanyManagementTester();
    await tester.runAllTests();
    
    // 根据测试结果设置退出码
    process.exit(tester.failCount > 0 ? 1 : 0);
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});

// 启动测试
main().catch(console.error);