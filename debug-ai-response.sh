#!/bin/bash

# 创建一个简单的测试来确认问题

echo "创建最简单的AI任务生成测试..."

# 登录
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "登录失败"
  exit 1
fi

echo "Token获取成功"

# 先测试一个简单的AI连接
echo -e "\n1. 测试AI连接..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/system/ai-configs/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "model": "deepseek-chat",
    "question": "请返回以下JSON格式的响应（只返回JSON，不要其他文字）：{\"tasks\": [{\"title\": \"示例任务\", \"description\": \"这是一个示例任务\", \"priority\": \"medium\", \"estimated_hours\": 4, \"tags\": [\"示例\"], \"dependencies\": [], \"confidence\": 0.9}]}"
  }')

echo "AI测试响应："
echo $RESPONSE | python3 -m json.tool

# 检查响应中的answer字段
ANSWER=$(echo $RESPONSE | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('data', {}).get('conversation', {}).get('answer', '') if data.get('success') else '')")
echo -e "\nAI回答内容："
echo "$ANSWER"

# 尝试解析JSON
echo -e "\n尝试从回答中提取JSON："
echo "$ANSWER" | python3 -c "
import re
import json
import sys

content = sys.stdin.read()
print(f'原始内容长度: {len(content)}')

# 尝试不同的提取方法
# 1. 代码块
match = re.search(r'\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`', content)
if match:
    print('找到代码块')
    json_str = match.group(1)
else:
    # 2. 直接查找JSON对象
    match = re.search(r'\{[\s\S]*\}', content)
    if match:
        print('找到JSON对象')
        json_str = match.group(0)
    else:
        print('未找到JSON')
        json_str = None

if json_str:
    print(f'提取的JSON: {json_str}')
    try:
        parsed = json.loads(json_str)
        print('JSON解析成功:')
        print(json.dumps(parsed, indent=2))
    except Exception as e:
        print(f'JSON解析失败: {e}')
"
