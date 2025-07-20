#!/bin/bash

# 测试全局任务API的完整性和层级支持
# 用于验证任务1.3的完成情况

BASE_URL="http://localhost:8080"
API_URL="${BASE_URL}/api/tasks"

echo "🔍 测试全局任务API的项目信息完整性和层级支持"
echo "===================================================="

# 检查服务器是否运行
echo "1. 检查服务器状态..."
health_response=$(curl -s "${BASE_URL}/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ 服务器运行正常"
    echo "服务器状态: $(echo $health_response | jq -r '.data.status' 2>/dev/null || echo 'healthy')"
else
    echo "❌ 服务器未运行，请先启动后端服务"
    exit 1
fi

echo ""
echo "2. 测试全局任务API..."

# 发送请求
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "${API_URL}?page=1&page_size=10")
http_status=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
response_body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

echo "HTTP Status: $http_status"

if [ "$http_status" -eq 200 ]; then
    echo "✅ API请求成功"
    
    # 解析响应数据
    echo ""
    echo "3. 验证响应数据结构..."
    
    # 检查基本结构
    has_data=$(echo "$response_body" | jq -r 'has("data")' 2>/dev/null)
    has_pagination=$(echo "$response_body" | jq -r '.data | has("pagination")' 2>/dev/null)
    has_tasks=$(echo "$response_body" | jq -r '.data | has("data")' 2>/dev/null)
    
    if [ "$has_data" = "true" ] && [ "$has_pagination" = "true" ] && [ "$has_tasks" = "true" ]; then
        echo "✅ 基本响应结构正确"
    else
        echo "❌ 响应结构不完整"
        echo "Response: $response_body"
        exit 1
    fi
    
    # 检查任务数量
    task_count=$(echo "$response_body" | jq -r '.data.data | length' 2>/dev/null)
    total_tasks=$(echo "$response_body" | jq -r '.data.pagination.total' 2>/dev/null)
    
    echo "📊 找到 $task_count 个任务 (总计: $total_tasks)"
    
    if [ "$task_count" -gt 0 ]; then
        echo ""
        echo "4. 验证项目信息完整性..."
        
        # 检查第一个任务的项目信息
        first_task=$(echo "$response_body" | jq -r '.data.data[0]' 2>/dev/null)
        project_name=$(echo "$first_task" | jq -r '.project_name // empty' 2>/dev/null)
        project_id=$(echo "$first_task" | jq -r '.project_id // empty' 2>/dev/null)
        
        if [ -n "$project_name" ] && [ "$project_name" != "null" ]; then
            echo "✅ 项目名称字段存在: $project_name"
        else
            echo "⚠️  项目名称字段缺失或为空"
        fi
        
        if [ -n "$project_id" ] && [ "$project_id" != "null" ]; then
            echo "✅ 项目ID字段存在: $project_id"
        else
            echo "❌ 项目ID字段缺失"
        fi
        
        echo ""
        echo "5. 验证层级相关字段..."
        
        # 检查层级相关字段
        depth=$(echo "$first_task" | jq -r '.depth // empty' 2>/dev/null)
        has_children=$(echo "$first_task" | jq -r '.has_children // empty' 2>/dev/null)
        children_count=$(echo "$first_task" | jq -r '.children_count // empty' 2>/dev/null)
        parent_id=$(echo "$first_task" | jq -r '.parent_id // empty' 2>/dev/null)
        
        if [ -n "$depth" ] && [ "$depth" != "null" ]; then
            echo "✅ 深度字段存在: $depth"
        else
            echo "❌ 深度字段缺失"
        fi
        
        if [ -n "$has_children" ] && [ "$has_children" != "null" ]; then
            echo "✅ has_children字段存在: $has_children"
        else
            echo "❌ has_children字段缺失"
        fi
        
        if [ -n "$children_count" ] && [ "$children_count" != "null" ]; then
            echo "✅ children_count字段存在: $children_count"
        else
            echo "❌ children_count字段缺失"
        fi
        
        echo ""
        echo "6. 检查子任务继承情况..."
        
        # 查找子任务（有parent_id的任务）
        subtask_count=$(echo "$response_body" | jq -r '[.data.data[] | select(.parent_id != null)] | length' 2>/dev/null)
        
        if [ "$subtask_count" -gt 0 ]; then
            echo "📝 找到 $subtask_count 个子任务"
            
            # 检查第一个子任务的项目继承
            first_subtask=$(echo "$response_body" | jq -r '[.data.data[] | select(.parent_id != null)][0]' 2>/dev/null)
            subtask_project_name=$(echo "$first_subtask" | jq -r '.project_name // empty' 2>/dev/null)
            subtask_parent_id=$(echo "$first_subtask" | jq -r '.parent_id // empty' 2>/dev/null)
            
            if [ -n "$subtask_project_name" ] && [ "$subtask_project_name" != "null" ] && [ "$subtask_project_name" != "未知项目" ]; then
                echo "✅ 子任务项目继承正常: $subtask_project_name (父任务ID: $subtask_parent_id)"
            else
                echo "❌ 子任务项目继承异常: $subtask_project_name"
            fi
        else
            echo "ℹ️  当前没有子任务数据"
        fi
        
        echo ""
        echo "7. 详细任务信息示例..."
        echo "=============================="
        echo "$first_task" | jq -r '{
            id: .id,
            title: .title,
            project_name: .project_name,
            project_id: .project_id,
            depth: .depth,
            has_children: .has_children,
            children_count: .children_count,
            parent_id: .parent_id
        }' 2>/dev/null || echo "$first_task"
        
    else
        echo "ℹ️  当前没有任务数据，无法验证字段"
    fi
    
    echo ""
    echo "8. 总结..."
    echo "=========="
    
    # 综合评估
    total_checks=0
    passed_checks=0
    
    # API响应
    total_checks=$((total_checks + 1))
    [ "$http_status" -eq 200 ] && passed_checks=$((passed_checks + 1))
    
    # 数据结构
    total_checks=$((total_checks + 1))
    [ "$has_data" = "true" ] && [ "$has_pagination" = "true" ] && [ "$has_tasks" = "true" ] && passed_checks=$((passed_checks + 1))
    
    if [ "$task_count" -gt 0 ]; then
        # 项目信息
        total_checks=$((total_checks + 1))
        [ -n "$project_name" ] && [ "$project_name" != "null" ] && passed_checks=$((passed_checks + 1))
        
        # 层级字段
        total_checks=$((total_checks + 3))
        [ -n "$depth" ] && [ "$depth" != "null" ] && passed_checks=$((passed_checks + 1))
        [ -n "$has_children" ] && [ "$has_children" != "null" ] && passed_checks=$((passed_checks + 1))
        [ -n "$children_count" ] && [ "$children_count" != "null" ] && passed_checks=$((passed_checks + 1))
    fi
    
    completion_rate=$(( passed_checks * 100 / total_checks ))
    
    echo "✅ 通过检查: $passed_checks/$total_checks"
    echo "📊 完成度: $completion_rate%"
    
    if [ "$completion_rate" -ge 90 ]; then
        echo "🎉 任务1.3修复状态: 优秀"
    elif [ "$completion_rate" -ge 70 ]; then
        echo "👍 任务1.3修复状态: 良好"
    elif [ "$completion_rate" -ge 50 ]; then
        echo "⚠️  任务1.3修复状态: 需要改进"
    else
        echo "❌ 任务1.3修复状态: 不合格"
    fi
    
else
    echo "❌ API请求失败"
    echo "Response: $response_body"
    exit 1
fi

echo ""
echo "测试完成！"
echo "===================================================="
