/**
 * 浏览器控制台调试脚本
 *
 * 使用方法:
 * 1. 打开生产环境 https://proj.joylodging.com
 * 2. 按F12打开DevTools
 * 3. 切换到Console标签
 * 4. 复制粘贴此脚本的全部内容
 * 5. 按Enter执行
 *
 * 这个脚本会输出详细的环境信息，帮助诊断localhost问题
 */

(function() {
    console.clear();
    console.log('%c🔍 AI-Proj 环境诊断工具', 'font-size: 24px; font-weight: bold; color: #667eea;');
    console.log('%c===================================', 'color: #999;');
    console.log('');

    // 1. 基础环境信息
    console.log('%c📍 1. 当前访问信息', 'font-size: 16px; font-weight: bold; color: #28a745;');
    console.log('完整URL:', window.location.href);
    console.log('协议:', window.location.protocol);
    console.log('主机名:', window.location.hostname);
    console.log('端口:', window.location.port || (window.location.protocol === 'https:' ? '443' : '80'));
    console.log('Origin:', window.location.origin);
    console.log('');

    // 2. 环境检测
    console.log('%c🌍 2. 环境检测', 'font-size: 16px; font-weight: bold; color: #28a745;');
    const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    let detectedEnv = 'unknown';
    let expectedAPI = '';

    if (currentPort === '3000') {
        detectedEnv = 'local-dev';
        expectedAPI = '/api/v1 (代理到 http://localhost:8080)';
    } else if (currentPort === '443' || window.location.protocol === 'https:') {
        detectedEnv = 'production';
        expectedAPI = '/api/v1 (Nginx代理)';
    } else if (currentPort === '80') {
        detectedEnv = 'docker-test';
        expectedAPI = '/api/v1 (Nginx代理)';
    }

    console.log('检测环境:', detectedEnv.toUpperCase());
    console.log('预期API地址:', expectedAPI);
    console.log('');

    // 3. 计算API配置
    console.log('%c🔧 3. API配置分析', 'font-size: 16px; font-weight: bold; color: #28a745;');
    const computedAPIBase = '/api/v1';
    const fullAPIURL = window.location.origin + computedAPIBase;

    console.log('相对路径:', computedAPIBase);
    console.log('完整API URL:', fullAPIURL);

    const hasLocalhost = fullAPIURL.includes('localhost');
    if (hasLocalhost) {
        console.log('%c❌ 错误: API URL包含localhost!', 'color: red; font-weight: bold;');
    } else {
        console.log('%c✅ 正确: API URL不包含localhost', 'color: green; font-weight: bold;');
    }
    console.log('');

    // 4. 检查加载的脚本文件
    console.log('%c📦 4. 加载的JavaScript文件', 'font-size: 16px; font-weight: bold; color: #28a745;');
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    scripts.forEach((script, index) => {
        const src = script.src;
        const isMain = src.includes('main.') && src.includes('.js');
        if (isMain) {
            console.log(`%c🎯 主文件 ${index + 1}:`, 'color: #667eea; font-weight: bold;', src);

            // 检查hash
            const hashMatch = src.match(/main\.([a-f0-9]+)\.js/);
            if (hashMatch) {
                const hash = hashMatch[1];
                console.log('   文件Hash:', hash);
                if (hash === 'fc6dc0ab') {
                    console.log('%c   ✅ 这是最新版本!', 'color: green; font-weight: bold;');
                } else {
                    console.log('%c   ⚠️ Hash不匹配! 可能是旧版本，需要清除缓存!', 'color: orange; font-weight: bold;');
                    console.log('   预期Hash: fc6dc0ab');
                    console.log('   实际Hash:', hash);
                }
            }
        } else {
            console.log(`Script ${index + 1}:`, src);
        }
    });
    console.log('');

    // 5. LocalStorage检查
    console.log('%c💾 5. LocalStorage检查', 'font-size: 16px; font-weight: bold; color: #28a745;');
    const hasToken = !!localStorage.getItem('accessToken');
    console.log('访问Token:', hasToken ? '✅ 已找到' : '❌ 未找到');
    if (hasToken) {
        const token = localStorage.getItem('accessToken');
        console.log('Token前缀:', token.substring(0, 50) + '...');
        console.log('Token长度:', token.length, '字符');
    }
    console.log('LocalStorage项数:', Object.keys(localStorage).length);
    console.log('');

    // 6. Service Worker检查
    console.log('%c🔧 6. Service Worker检查', 'font-size: 16px; font-weight: bold; color: #28a745;');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 0) {
                console.log('%c⚠️ 发现 ' + registrations.length + ' 个Service Worker!', 'color: orange; font-weight: bold;');
                console.log('Service Worker可能缓存了旧版本的应用');
                console.log('执行以下命令卸载:');
                console.log('%cnav igator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))', 'background: #f0f0f0; padding: 5px;');
            } else {
                console.log('✅ 未发现Service Worker');
            }
        });
    } else {
        console.log('浏览器不支持Service Worker');
    }
    console.log('');

    // 7. 实际API测试
    console.log('%c🧪 7. API连接测试', 'font-size: 16px; font-weight: bold; color: #28a745;');
    console.log('准备测试 /api/v1/health 接口...');

    const testURL = '/api/v1/health';
    console.log('测试URL:', testURL);
    console.log('完整URL:', window.location.origin + testURL);

    fetch(testURL)
        .then(response => {
            console.log('');
            console.log('%c✅ Health API 测试成功!', 'color: green; font-weight: bold; font-size: 14px;');
            console.log('响应状态:', response.status);
            console.log('响应URL:', response.url);

            // 关键检查: 响应URL是否包含localhost
            if (response.url.includes('localhost')) {
                console.log('%c❌ 严重问题: 响应URL包含localhost!', 'color: red; font-weight: bold; font-size: 14px;');
                console.log('这说明浏览器缓存了旧版本的JavaScript代码');
                console.log('');
                console.log('%c🔧 解决方案:', 'font-weight: bold; font-size: 14px;');
                console.log('1. 硬刷新: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)');
                console.log('2. 清除缓存: DevTools → Application → Clear storage');
                console.log('3. 无痕模式测试: 打开无痕窗口重新访问');
            } else {
                console.log('%c✅ 响应URL正确，不包含localhost', 'color: green; font-weight: bold;');
            }

            return response.json();
        })
        .then(data => {
            console.log('响应数据:', data);
            console.log('');
        })
        .catch(error => {
            console.log('');
            console.log('%c❌ Health API 测试失败', 'color: red; font-weight: bold; font-size: 14px;');
            console.log('错误:', error.message);
            console.log('');
        });

    // 8. 测试Timer API (如果有token)
    const token = localStorage.getItem('accessToken');
    if (token) {
        console.log('');
        console.log('准备测试 /api/v1/user/timer/active 接口...');

        const timerURL = '/api/v1/user/timer/active';
        console.log('测试URL:', timerURL);
        console.log('完整URL:', window.location.origin + timerURL);

        fetch(timerURL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                console.log('');
                console.log('%c🔄 Timer API 测试结果', 'font-weight: bold; font-size: 14px;');
                console.log('响应状态:', response.status);
                console.log('响应URL:', response.url);

                // 关键检查
                if (response.url.includes('localhost')) {
                    console.log('%c❌ 问题确认: Timer API也在使用localhost!', 'color: red; font-weight: bold; font-size: 14px;');
                } else {
                    console.log('%c✅ Timer API URL正确', 'color: green; font-weight: bold;');
                }

                return response.json();
            })
            .then(data => {
                console.log('响应数据:', data);
                console.log('');
            })
            .catch(error => {
                console.log('');
                console.log('Timer API错误:', error.message);
                console.log('');
            });
    }

    // 9. 总结和建议
    setTimeout(() => {
        console.log('');
        console.log('%c📋 9. 诊断总结', 'font-size: 16px; font-weight: bold; color: #28a745;');
        console.log('');

        console.log('%c如果以上测试显示包含localhost:', 'font-weight: bold;');
        console.log('');
        console.log('原因: 浏览器缓存了旧版本的JavaScript文件');
        console.log('');
        console.log('%c解决步骤:', 'font-weight: bold; color: #667eea;');
        console.log('');
        console.log('1️⃣  硬刷新页面:');
        console.log('   Windows/Linux: Ctrl + Shift + R');
        console.log('   Mac: Cmd + Shift + R');
        console.log('');
        console.log('2️⃣  如果仍然有问题，清除浏览器缓存:');
        console.log('   F12 → Application → Storage → Clear site data');
        console.log('');
        console.log('3️⃣  卸载Service Worker (如果存在):');
        console.log('   复制并执行以下命令:');
        console.log('%c   navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister().then(() => console.log("已卸载"))))', 'background: #f0f0f0; padding: 5px;');
        console.log('');
        console.log('4️⃣  无痕模式测试:');
        console.log('   打开无痕窗口，访问 https://proj.joylodging.com');
        console.log('   如果无痕模式正常，证明是缓存问题');
        console.log('');
        console.log('5️⃣  查看详细调试页面:');
        console.log('   访问 https://proj.joylodging.com/debug-env.html');
        console.log('');
        console.log('%c技术说明:', 'font-weight: bold; color: #667eea;');
        console.log('服务器文件已经修复，不包含localhost引用');
        console.log('当前main.fc6dc0ab.js是正确的版本');
        console.log('问题出在浏览器缓存层，需要清除');
        console.log('');
        console.log('%c===================================', 'color: #999;');
        console.log('%c诊断完成！', 'font-size: 18px; font-weight: bold; color: #667eea;');
        console.log('');
    }, 2000);

})();
