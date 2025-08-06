// 临时环境变量调试注入脚本
// 此脚本将直接在浏览器中输出环境变量信息

console.log('🔍 ===== 环境变量调试注入脚本 =====');
console.log('当前时间:', new Date().toLocaleString());
console.log('页面URL:', window.location.href);

// 尝试访问React的环境变量
console.log('🌍 React环境变量:');
console.log('REACT_APP_ENV:', process.env.REACT_APP_ENV);
console.log('REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);
console.log('REACT_APP_LOCAL_DEV:', process.env.REACT_APP_LOCAL_DEV);
console.log('NODE_ENV:', process.env.NODE_ENV);

// 分析Layout.tsx的条件逻辑
const env1 = process.env.REACT_APP_ENV;
const env2 = process.env.REACT_APP_ENVIRONMENT;
const localDev = process.env.REACT_APP_LOCAL_DEV;

console.log('🧮 条件分析:');
console.log('条件1 (显示开发环境):', localDev === 'true', '← REACT_APP_LOCAL_DEV === "true"');
console.log('条件2a:', env1 === 'development', '← REACT_APP_ENV === "development"');
console.log('条件2b:', env2 === 'development', '← REACT_APP_ENVIRONMENT === "development"');
console.log('条件2c:', localDev !== 'true', '← REACT_APP_LOCAL_DEV !== "true"');

const condition2 = (env1 === 'development' && env2 === 'development' && localDev !== 'true');
console.log('条件2整体 (显示测试版本):', condition2);

let expectedFlag = '❌ 无标志';
if (localDev === 'true') {
    expectedFlag = '🟢 开发环境';
} else if (condition2) {
    expectedFlag = '🔵 测试版本';
}

console.log('📊 预期显示结果:', expectedFlag);

// 尝试查找实际的环境标志元素
setTimeout(() => {
    console.log('🔍 查找页面中的环境标志元素...');
    
    // 查找所有span元素
    const spans = document.querySelectorAll('span');
    let found = false;
    
    spans.forEach((span, index) => {
        const text = span.textContent?.trim();
        if (text === '开发环境' || text === '测试版本' || text === '预发布' || text === '生产环境') {
            const computedStyle = window.getComputedStyle(span);
            console.log(`✅ 找到环境标志 #${index + 1}:`);
            console.log('  文字:', text);
            console.log('  背景色:', computedStyle.backgroundColor);
            console.log('  前景色:', computedStyle.color);
            console.log('  DOM元素:', span);
            found = true;
        }
    });
    
    if (!found) {
        console.log('❌ 未找到任何环境标志元素');
        console.log('总共检查了', spans.length, '个span元素');
    }
    
    console.log('🔍 ===== 环境变量调试注入完成 =====');
}, 3000);

// 导出调试函数供外部调用
window.debugEnvVars = function() {
    return {
        REACT_APP_ENV: process.env.REACT_APP_ENV,
        REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
        REACT_APP_LOCAL_DEV: process.env.REACT_APP_LOCAL_DEV,
        NODE_ENV: process.env.NODE_ENV,
        expectedFlag: expectedFlag,
        condition2: condition2
    };
};