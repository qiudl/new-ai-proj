#!/bin/bash

echo "🎬 启动 Playwright 测试..."
cd /Users/johnqiu/coding/www/projects/new-ai-proj

echo "清理旧的测试结果..."
rm -rf test-results/create-task-*

echo "开始执行测试..."
npx playwright test tests/create-task.spec.js --headed --timeout=300000 --retries=0 --workers=1

echo "测试完成，检查结果..."
ls -la test-results/

echo "视频文件位置:"
find test-results/ -name "*.webm" -exec ls -la {} \;

echo "截图文件位置:"  
find test-results/ -name "*.png" -exec ls -la {} \;
