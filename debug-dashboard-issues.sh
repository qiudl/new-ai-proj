#!/bin/bash

echo "🔧 清理时间管理页面缓存和调试"
echo "==============================="

cd frontend

echo "1. 检查当前组件配置..."
node -e "
const fs = require('fs');
const content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// 提取所有组件key
const keyMatches = content.match(/<div key=\"[^\"]+\"/g);
if (keyMatches) {
  const keys = keyMatches.map(match => match.match(/key=\"([^\"]+)\"/)[1]);
  console.log('定义的组件key:', keys);
  console.log('组件数量:', keys.length);
} else {
  console.log('未找到组件key');
}

// 检查布局配置
const layoutMatches = content.match(/{ i: '[^']+'/g);
if (layoutMatches) {
  const layoutKeys = layoutMatches.map(match => match.match(/i: '([^']+)'/)[1]);
  console.log('布局配置key:', [...new Set(layoutKeys)]);
}
"

echo ""
echo "2. 检查是否有重复或错误的组件..."
node -e "
const fs = require('fs');
const content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// 检查是否有重复的key
const keyMatches = content.match(/<div key=\"[^\"]+\"/g);
if (keyMatches) {
  const keys = keyMatches.map(match => match.match(/key=\"([^\"]+)\"/)[1]);
  const uniqueKeys = [...new Set(keys)];
  
  if (keys.length !== uniqueKeys.length) {
    console.log('❌ 发现重复的组件key!');
    console.log('总数:', keys.length, '唯一数:', uniqueKeys.length);
  } else {
    console.log('✅ 组件key无重复');
  }
}
"

echo ""
echo "3. 创建本地存储清理HTML页面..."
cat > clear-dashboard-cache.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>清理时间管理页面缓存</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .button { background: #1890ff; color: white; padding: 10px 20px; border: none; cursor: pointer; margin: 5px; }
        .success { color: green; }
        .info { color: blue; }
    </style>
</head>
<body>
    <h2>🔧 时间管理页面缓存清理工具</h2>
    
    <h3>当前缓存状态：</h3>
    <div id="cache-status"></div>
    
    <h3>操作：</h3>
    <button class="button" onclick="clearAllCache()">清理所有缓存</button>
    <button class="button" onclick="checkCache()">检查缓存状态</button>
    <button class="button" onclick="resetToDefault()">重置为默认布局</button>
    
    <h3>操作日志：</h3>
    <div id="log"></div>

    <script>
        function log(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            logDiv.innerHTML += `<div class="${type}">[${timestamp}] ${message}</div>`;
        }

        function checkCache() {
            const cacheKeys = [
                'dashboardLayouts',
                'dashboardComponentConfigs', 
                'dashboardDragMode'
            ];
            
            const statusDiv = document.getElementById('cache-status');
            let statusHtml = '';
            
            cacheKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    statusHtml += `<div><strong>${key}:</strong> 存在 (${value.length} 字符)</div>`;
                } else {
                    statusHtml += `<div><strong>${key}:</strong> 不存在</div>`;
                }
            });
            
            statusDiv.innerHTML = statusHtml;
            log('缓存状态检查完成');
        }

        function clearAllCache() {
            const cacheKeys = [
                'dashboardLayouts',
                'dashboardComponentConfigs', 
                'dashboardDragMode'
            ];
            
            let cleared = 0;
            cacheKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    cleared++;
                    log(`清理了 ${key}`, 'success');
                }
            });
            
            if (cleared > 0) {
                log(`成功清理 ${cleared} 个缓存项`, 'success');
                log('请刷新时间管理页面以应用默认布局', 'info');
            } else {
                log('没有需要清理的缓存项', 'info');
            }
            
            checkCache();
        }

        function resetToDefault() {
            // 设置默认布局
            const defaultLayouts = {
                lg: [
                    { i: 'timer', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
                    { i: 'my-tasks', x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
                    { i: 'today-stats', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6, maxH: 24 },
                    { i: 'timer-stats', x: 0, y: 8, w: 8, h: 6, minW: 6, minH: 4, maxH: 16 },
                    { i: 'task-progress', x: 8, y: 8, w: 4, h: 6, minW: 3, minH: 4, maxH: 16 }
                ]
            };
            
            localStorage.setItem('dashboardLayouts', JSON.stringify(defaultLayouts));
            localStorage.removeItem('dashboardComponentConfigs');
            localStorage.setItem('dashboardDragMode', 'false');
            
            log('已重置为默认布局配置', 'success');
            log('请刷新页面查看效果', 'info');
            checkCache();
        }

        // 页面加载时检查缓存
        window.onload = function() {
            checkCache();
        };
    </script>
</body>
</html>
EOF

echo "✅ 创建了缓存清理页面: clear-dashboard-cache.html"
echo ""
echo "4. 使用说明:"
echo "   1. 打开 clear-dashboard-cache.html 文件"
echo "   2. 点击'清理所有缓存'按钮"
echo "   3. 刷新时间管理页面"
echo ""
echo "或者直接在浏览器控制台运行:"
echo "localStorage.removeItem('dashboardLayouts');"
echo "localStorage.removeItem('dashboardComponentConfigs');"
echo "localStorage.removeItem('dashboardDragMode');"
echo "location.reload();"
