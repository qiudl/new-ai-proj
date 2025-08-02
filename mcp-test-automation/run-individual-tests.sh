#!/bin/bash

# MCP功能逐个测试脚本 - 为每个功能生成独立视频
# 每个测试生成一个视频文件，便于单独查看

echo "🚀 MCP功能分别测试开始"
echo "=================================="

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
TEST_DIR="$PROJECT_DIR/mcp-test-automation"

cd "$TEST_DIR"

echo "📂 当前目录: $(pwd)"

# 检查服务状态
echo "🔍 检查前端服务状态..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 前端服务未启动，请先启动前端服务"
    exit 1
fi

echo "✅ 前端服务运行正常"

# 创建视频输出目录
mkdir -p videos
mkdir -p test-results

echo ""
echo "🎬 开始录制6个MCP功能测试视频"
echo "每个功能将生成独立的视频文件"
echo ""

# 定义测试列表
tests=(
    "01-create-task.spec.ts:create_task创建任务功能"
    "02-list-tasks.spec.ts:list_tasks查看任务列表功能"
    "03-start-task.spec.ts:start_task开始任务功能"
    "04-complete-task.spec.ts:complete_task完成任务功能"
    "05-create-subtask.spec.ts:create_subtask创建子任务功能"
    "06-find-task.spec.ts:find_task查找任务功能"
)

# 逐个执行测试
for i in "${!tests[@]}"; do
    IFS=':' read -r test_file test_name <<< "${tests[i]}"
    test_number=$((i + 1))
    
    echo ""
    echo "🎥 录制测试 $test_number/6: $test_name"
    echo "📁 文件: $test_file"
    echo "⏰ 预计耗时: 1-2分钟"
    
    # 运行单个测试
    npx playwright test "$test_file" --project=mcp-tests --headed 2>&1 | tee "test-${test_number}-execution.log"
    
    if [ $? -eq 0 ]; then
        echo "✅ 测试 $test_number 完成: $test_name"
        
        # 查找生成的视频文件并重命名
        video_file=$(find test-results -name "*.webm" -newer test-results 2>/dev/null | head -1)
        if [ -n "$video_file" ]; then
            mv "$video_file" "videos/mcp-test-${test_number}-${test_name%功能}.webm" 2>/dev/null
            echo "📹 视频已保存: videos/mcp-test-${test_number}-${test_name%功能}.webm"
        fi
    else
        echo "❌ 测试 $test_number 失败: $test_name"
        echo "📋 查看日志: test-${test_number}-execution.log"
    fi
    
    # 测试间隔，让系统稳定
    if [ $test_number -lt 6 ]; then
        echo "⏸️  等待3秒后继续下一个测试..."
        sleep 3
    fi
done

echo ""
echo "🎉 所有MCP功能测试录制完成！"
echo "=================================="
echo "📁 视频文件位置: $TEST_DIR/videos/"
echo "📊 测试日志: $TEST_DIR/test-*-execution.log"
echo ""

# 列出生成的视频文件
echo "📹 生成的视频文件:"
ls -la videos/ 2>/dev/null || echo "暂无视频文件生成"

echo ""
echo "💡 使用说明:"
echo "1. 每个视频展示一个MCP功能的完整测试过程"
echo "2. 视频包含功能说明、测试步骤和结果验证"
echo "3. 可以单独查看每个功能的测试效果"

echo ""
echo "🏁 MCP功能测试录制任务完成"
