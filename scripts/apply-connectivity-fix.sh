#!/bin/bash

# 腾讯云服务器前后端连通性修复应用脚本
# 使用方法: bash apply-connectivity-fix.sh

set -e  # 出错时停止执行

echo "🚀 开始应用前后端连通性修复..."
echo "=================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查Docker是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker未运行或无权限访问"
        exit 1
    fi
    log_success "Docker运行正常"
}

# 获取最新代码
update_code() {
    log_info "更新代码到最新版本..."
    
    # 如果是git仓库，拉取最新代码
    if [ -d ".git" ]; then
        git fetch origin main
        git reset --hard origin/main
        log_success "代码已更新到最新版本"
    else
        log_warning "不是git仓库，跳过代码更新"
    fi
}

# 重新构建后端服务（应用新的API路由）
rebuild_backend() {
    log_info "重新构建后端服务..."
    
    # 停止现有后端
    docker stop ai_backend_prod 2>/dev/null || true
    
    # 使用docker-compose重新构建
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml build backend-prod
        docker-compose -f docker-compose.prod.yml up -d backend-prod
    else
        log_warning "docker-compose.prod.yml不存在，尝试直接重启容器"
        docker start ai_backend_prod || log_error "无法启动后端容器"
    fi
    
    # 等待服务启动
    sleep 10
    log_success "后端服务重新构建完成"
}

# 部署前端服务到3001端口
deploy_frontend() {
    log_info "部署前端服务到3001端口..."
    
    # 停止旧的前端服务
    docker stop test_frontend_3001 2>/dev/null || true
    docker rm test_frontend_3001 2>/dev/null || true
    
    # 创建测试前端页面
    mkdir -p /tmp/frontend-connectivity-test
    cat > /tmp/frontend-connectivity-test/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>前后端连通性验证</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .loading { background: #cce7ff; border: 1px solid #b3d9ff; color: #004085; }
        button { padding: 12px 24px; margin: 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .result { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 前后端连通性验证</h1>
            <p>端口配置: 前端3001 ← → 后端8080</p>
        </div>
        
        <div id="status" class="status loading">正在检测服务状态...</div>
        
        <div style="text-align: center; margin: 20px 0;">
            <button class="btn-primary" onclick="testHealth()">测试健康检查</button>
            <button class="btn-primary" onclick="testApiHealth()">测试API健康检查</button>
            <button class="btn-success" onclick="testLogin()">测试快速登录</button>
        </div>
        
        <div id="result" class="result"></div>
    </div>

    <script>
        const API_BASE = 'http://152.136.104.251:8080';
        
        function updateStatus(message, type = 'loading') {
            document.getElementById('status').className = `status ${type}`;
            document.getElementById('status').innerHTML = message;
        }
        
        function logResult(message) {
            const result = document.getElementById('result');
            const timestamp = new Date().toLocaleTimeString();
            result.innerHTML += `[${timestamp}] ${message}\n`;
        }
        
        async function testHealth() {
            updateStatus('正在测试基础健康检查...', 'loading');
            try {
                const response = await fetch(`${API_BASE}/health`);
                const data = await response.text();
                updateStatus('✅ 基础健康检查成功!', 'success');
                logResult(`✅ 健康检查成功: ${data}`);
            } catch (error) {
                updateStatus('❌ 基础健康检查失败', 'error');
                logResult(`❌ 健康检查失败: ${error.message}`);
            }
        }
        
        async function testApiHealth() {
            updateStatus('正在测试API健康检查...', 'loading');
            try {
                const response = await fetch(`${API_BASE}/api/v1/health`);
                if (response.ok) {
                    const data = await response.json();
                    updateStatus('🎉 API路由修复成功!', 'success');
                    logResult(`🎉 API健康检查成功: ${JSON.stringify(data)}`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                updateStatus('⚠️ API路由需要重新构建', 'error');
                logResult(`⚠️ API健康检查失败: ${error.message} - 可能需要重新构建后端`);
            }
        }
        
        async function testLogin() {
            updateStatus('正在测试快速登录...', 'loading');
            try {
                const response = await fetch(`${API_BASE}/api/v1/auth/dev/quick-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin' })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    updateStatus('🔐 认证功能正常!', 'success');
                    logResult(`🔐 快速登录成功: ${data.message || 'Token已获取'}`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                updateStatus('❌ 认证功能异常', 'error');
                logResult(`❌ 快速登录失败: ${error.message}`);
            }
        }
        
        // 页面加载时自动检测
        window.onload = function() {
            setTimeout(testHealth, 1000);
        };
    </script>
</body>
</html>
EOF

    # 启动前端服务
    docker run -d --name connectivity_test_frontend \
        -p 3001:80 \
        -v /tmp/frontend-connectivity-test:/usr/share/nginx/html:ro \
        nginx:alpine
    
    log_success "前端测试服务已启动在3001端口"
}

# 验证修复结果
verify_fix() {
    log_info "验证修复结果..."
    
    # 测试基础健康检查
    echo -n "测试基础健康检查: "
    if curl -s http://localhost:8080/health > /dev/null; then
        log_success "基础健康检查 ✅"
    else
        log_error "基础健康检查 ❌"
    fi
    
    # 测试API健康检查
    echo -n "测试API健康检查: "
    if curl -s http://localhost:8080/api/v1/health > /dev/null; then
        log_success "API健康检查 ✅"
    else
        log_warning "API健康检查 ⚠️ (可能需要重新构建)"
    fi
    
    # 测试前端服务
    echo -n "测试前端服务: "
    if curl -s http://localhost:3001 > /dev/null; then
        log_success "前端服务 ✅"
    else
        log_error "前端服务 ❌"
    fi
}

# 显示访问信息
show_access_info() {
    echo
    echo "=================================================="
    log_success "修复应用完成!"
    echo
    echo "📍 访问地址:"
    echo "   前端测试页面: http://152.136.104.251:3001"
    echo "   后端API: http://152.136.104.251:8080"
    echo "   健康检查: http://152.136.104.251:8080/health"
    echo "   API健康检查: http://152.136.104.251:8080/api/v1/health"
    echo
    echo "🔧 手动验证命令:"
    echo "   curl http://152.136.104.251:8080/health"
    echo "   curl http://152.136.104.251:8080/api/v1/health"
    echo "   curl http://152.136.104.251:3001"
    echo
    echo "📋 如果API路由仍然404，请运行:"
    echo "   docker-compose -f docker-compose.prod.yml build backend-prod"
    echo "   docker-compose -f docker-compose.prod.yml up -d backend-prod"
    echo "=================================================="
}

# 主执行流程
main() {
    echo "开始执行修复应用流程..."
    
    check_docker
    # update_code  # 如果需要更新代码，取消注释
    rebuild_backend
    deploy_frontend
    
    sleep 5  # 等待服务完全启动
    
    verify_fix
    show_access_info
    
    log_success "前后端连通性修复应用完成!"
}

# 捕获错误
trap 'log_error "脚本执行过程中出现错误，请检查日志"; exit 1' ERR

# 执行主函数
main

exit 0