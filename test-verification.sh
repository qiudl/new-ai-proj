#!/bin/bash

# 子任务表格功能测试验证脚本
echo "🧪 子任务表格功能测试"
echo "===================="

echo "📄 测试地址: http://localhost:3000/projects/35/tasks/113"
echo ""
echo "✅ 需要验证的功能:"
echo "  1. 子任务表格第一列显示为'任务ID'"
echo "  2. 任务ID列显示格式为 #123"
echo "  3. 所有列都支持排序（标题有排序图标）"
echo "  4. 点击列标题可以进行排序"
echo ""
echo "🔧 预期的表格列结构:"
echo "  - 第1列: 任务ID (可排序)"
echo "  - 第2列: 任务名称 (可排序)"
echo "  - 第3列: 状态 (可排序)"
echo "  - 第4列: 创建时间 (可排序)"
echo ""

# 测试API响应
echo "🔍 API测试 - 获取父任务的子任务..."
TOKEN=$(node generate-jwt-proper.js | grep -A1 "生成的JWT Token:" | tail -1 | tr -d '\n\r ')

SUBTASKS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/projects/35/tasks/113/children")

if echo "$SUBTASKS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ API响应正常"
    SUBTASK_COUNT=$(echo "$SUBTASKS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)
    echo "📊 找到 $SUBTASK_COUNT 个子任务"
    
    echo ""
    echo "子任务列表:"
    echo "$SUBTASKS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success') and 'data' in data:
        tasks = data['data'] if isinstance(data['data'], list) else data['data'].get('data', [])
        for i, task in enumerate(tasks, 1):
            print(f'  {i}. #{task[\"id\"]} - {task[\"title\"]} ({task[\"status\"]})')
    else:
        print('  数据格式不正确')
except:
    print('  JSON解析失败')
"
else
    echo "❌ API响应异常"
    echo "Response: $SUBTASKS_RESPONSE"
fi

echo ""
echo "🌐 请在浏览器中打开以下地址进行手动测试:"
echo "   http://localhost:3000/projects/35/tasks/113"
echo ""
echo "🔑 登录信息:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "📋 检查清单:"
echo "   □ 子任务表格是否显示"
echo "   □ 第一列是否为'任务ID'"
echo "   □ 任务ID是否以#开头"
echo "   □ 各列是否有排序图标"
echo "   □ 点击排序是否正常工作"
