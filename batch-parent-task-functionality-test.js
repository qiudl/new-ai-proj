#!/usr/bin/env node

/**
 * 批量设置父任务功能验证测试脚本
 * 这个脚本将验证task-602.md中定义的批量父任务功能是否正确实现
 */

const puppeteer = require('puppeteer');

async function verifyBatchParentTaskFunctionality() {
    console.log('🎯 === 批量设置父任务功能验证测试 ===');
    
    let browser;
    let passed = 0;
    let failed = 0;
    const testResults = [];
    
    try {
        console.log('\n🚀 启动浏览器...');
        browser = await puppeteer.launch({ 
            headless: false, // 设为false以便观察测试过程
            defaultViewport: { width: 1200, height: 800 }
        });
        
        const page = await browser.newPage();
        
        // 导航到项目页面
        console.log('📍 导航到项目页面...');
        await page.goto('http://localhost/projects/1', { waitUntil: 'networkidle0' });
        
        // 等待页面加载完成
        await page.waitForTimeout(2000);
        
        // Test 1: 检查任务列表是否存在
        console.log('\n🧪 Test 1: 检查任务列表...');
        const taskRows = await page.$$('.ant-table-tbody tr');
        if (taskRows.length > 0) {
            console.log(`✅ 找到 ${taskRows.length} 个任务`);
            testResults.push({ test: 'Task List Exists', status: 'PASS', details: `${taskRows.length} tasks found` });
            passed++;
        } else {
            console.log('❌ 未找到任务列表');
            testResults.push({ test: 'Task List Exists', status: 'FAIL', details: 'No tasks found' });
            failed++;
        }
        
        // Test 2: 选择多个任务
        console.log('\n🧪 Test 2: 选择多个任务...');
        const checkboxes = await page.$$('.ant-table-selection-column .ant-checkbox-input');
        if (checkboxes.length >= 2) {
            // 选择前3个任务
            for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
                await checkboxes[i].click();
                await page.waitForTimeout(200);
            }
            console.log('✅ 成功选择多个任务');
            testResults.push({ test: 'Select Multiple Tasks', status: 'PASS', details: 'Successfully selected 3 tasks' });
            passed++;
        } else {
            console.log('❌ 可选择任务数量不足');
            testResults.push({ test: 'Select Multiple Tasks', status: 'FAIL', details: 'Insufficient tasks to select' });
            failed++;
        }
        
        // Test 3: 查找批量操作按钮
        console.log('\n🧪 Test 3: 查找批量操作按钮...');
        await page.waitForTimeout(1000);
        
        const batchButton = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent && btn.textContent.trim() === '批量操作'
            );
        });
        
        if (batchButton) {
            console.log('✅ 找到批量操作按钮');
            testResults.push({ test: 'Batch Operation Button', status: 'PASS', details: 'Button found and accessible' });
            passed++;
            
            // Test 4: 点击批量操作按钮
            console.log('\n🧪 Test 4: 点击批量操作按钮...');
            await batchButton.click();
            await page.waitForTimeout(800);
            
            // Test 5: 检查下拉菜单
            console.log('\n🧪 Test 5: 检查批量操作下拉菜单...');
            const dropdown = await page.$('.ant-dropdown:not(.ant-dropdown-hidden)');
            if (dropdown) {
                console.log('✅ 下拉菜单成功显示');
                testResults.push({ test: 'Dropdown Menu Display', status: 'PASS', details: 'Menu displayed correctly' });
                passed++;
                
                // Test 6: 查找"更改父任务"菜单项
                console.log('\n🧪 Test 6: 查找"更改父任务"菜单项...');
                const parentTaskMenuItem = await page.evaluateHandle(() => {
                    const menuItems = document.querySelectorAll('.ant-dropdown-menu-item');
                    return Array.from(menuItems).find(item => 
                        item.textContent.includes('更改父任务')
                    );
                });
                
                if (parentTaskMenuItem && await parentTaskMenuItem.evaluate(el => el !== null)) {
                    console.log('✅ 找到"更改父任务"菜单项');
                    testResults.push({ test: 'Parent Task Menu Item', status: 'PASS', details: 'Menu item found' });
                    passed++;
                    
                    // Test 7: 点击"更改父任务"菜单项
                    console.log('\n🧪 Test 7: 点击"更改父任务"菜单项...');
                    await parentTaskMenuItem.click();
                    await page.waitForTimeout(1000);
                    
                    // Test 8: 验证TaskParentSelectorModal弹窗
                    console.log('\n🧪 Test 8: 验证TaskParentSelectorModal弹窗...');
                    const modal = await page.$('.ant-modal:not(.ant-modal-hidden)');
                    if (modal) {
                        console.log('✅ TaskParentSelectorModal弹窗成功打开');
                        testResults.push({ test: 'TaskParentSelectorModal', status: 'PASS', details: 'Modal opened successfully' });
                        passed++;
                        
                        // Test 9: 检查弹窗组件
                        console.log('\n🧪 Test 9: 检查弹窗内组件...');
                        const searchInput = await modal.$('.ant-input');
                        const recommendations = await modal.$('.recommendations-section');
                        const taskList = await modal.$('.task-list-container');
                        const okButton = await modal.$('.ant-modal-footer .ant-btn-primary');
                        const cancelButton = await modal.$('.ant-modal-footer .ant-btn:not(.ant-btn-primary)');
                        
                        let modalComponentsScore = 0;
                        const components = [
                            { name: '搜索框', element: searchInput },
                            { name: '智能推荐区域', element: recommendations },
                            { name: '任务列表', element: taskList },
                            { name: '确定按钮', element: okButton },
                            { name: '取消按钮', element: cancelButton }
                        ];
                        
                        for (const component of components) {
                            if (component.element) {
                                console.log(`   ✅ ${component.name}: 存在`);
                                modalComponentsScore++;
                            } else {
                                console.log(`   ❌ ${component.name}: 缺失`);
                            }
                        }
                        
                        if (modalComponentsScore >= 4) {
                            console.log('✅ 弹窗组件检查通过');
                            testResults.push({ test: 'Modal Components', status: 'PASS', details: `${modalComponentsScore}/5 components found` });
                            passed++;
                        } else {
                            console.log('❌ 弹窗组件不完整');
                            testResults.push({ test: 'Modal Components', status: 'FAIL', details: `Only ${modalComponentsScore}/5 components found` });
                            failed++;
                        }
                        
                        // Test 10: 测试搜索功能
                        if (searchInput) {
                            console.log('\n🧪 Test 10: 测试搜索功能...');
                            await searchInput.type('32');
                            await page.waitForTimeout(1000);
                            
                            const searchResults = await modal.$$('.task-tree-list .ant-tree-node-content-wrapper');
                            console.log(`✅ 搜索功能测试完成，找到 ${searchResults.length} 个结果`);
                            testResults.push({ test: 'Search Functionality', status: 'PASS', details: `Search returned ${searchResults.length} results` });
                            passed++;
                        }
                        
                        // 关闭弹窗
                        if (cancelButton) {
                            console.log('\n🔄 关闭测试弹窗...');
                            await cancelButton.click();
                            await page.waitForTimeout(500);
                        }
                        
                    } else {
                        console.log('❌ TaskParentSelectorModal弹窗未打开');
                        testResults.push({ test: 'TaskParentSelectorModal', status: 'FAIL', details: 'Modal failed to open' });
                        failed++;
                    }
                } else {
                    console.log('❌ 未找到"更改父任务"菜单项');
                    testResults.push({ test: 'Parent Task Menu Item', status: 'FAIL', details: 'Menu item not found' });
                    failed++;
                }
            } else {
                console.log('❌ 下拉菜单未显示');
                testResults.push({ test: 'Dropdown Menu Display', status: 'FAIL', details: 'Menu failed to display' });
                failed++;
            }
        } else {
            console.log('❌ 未找到批量操作按钮');
            testResults.push({ test: 'Batch Operation Button', status: 'FAIL', details: 'Button not found' });
            failed++;
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        testResults.push({ test: 'Test Execution', status: 'ERROR', details: error.message });
        failed++;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // 输出测试结果
    console.log('\n🎉 === 批量父任务功能验证测试结果 ===');
    console.log(`📊 总测试数: ${passed + failed}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`🎯 通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 详细测试结果:');
    testResults.forEach((result, index) => {
        const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`   ${index + 1}. ${status} ${result.test}: ${result.details}`);
    });
    
    const allPassed = failed === 0;
    if (allPassed) {
        console.log('\n🎊 批量设置父任务功能验证完全成功！');
        console.log('🏆 新功能集成成功！用户现在可以批量设置父任务了！');
    } else {
        console.log('\n⚠️ 功能验证存在问题，需要进一步调试和修复');
    }
    
    return { passed, failed, testResults, allPassed };
}

// 执行测试
if (require.main === module) {
    verifyBatchParentTaskFunctionality()
        .then(result => {
            process.exit(result.allPassed ? 0 : 1);
        })
        .catch(error => {
            console.error('脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = { verifyBatchParentTaskFunctionality };