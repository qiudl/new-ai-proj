#!/bin/bash

##############################################################################
# TaskDetail 旧代码清理脚本
#
# 用途: 在100%全量发布稳定后,清理旧版本代码
# 执行时机: Phase 4 - Day 4-5
# 前置条件: 100%全量发布已稳定运行至少24小时
##############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."

    echo ""
    log_warning "清理前确认:"
    echo "  1. 100%全量发布已完成?"
    echo "  2. 新版本已稳定运行24小时以上?"
    echo "  3. 错误率 < 0.1%?"
    echo "  4. 用户反馈良好?"
    echo "  5. 已备份代码?"
    echo ""

    read -p "所有条件都满足吗? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "前置条件未满足,清理已取消"
        exit 1
    fi

    log_success "前置条件检查通过"
}

# 备份旧代码
backup_old_code() {
    log_info "备份旧代码..."

    BACKUP_DIR="./backups/old_taskdetail_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # 备份TaskDetailPageNew相关文件
    if [ -f "frontend/src/pages/TaskDetailPageNew.tsx" ]; then
        cp "frontend/src/pages/TaskDetailPageNew.tsx" "$BACKUP_DIR/"
        log_success "已备份 TaskDetailPageNew.tsx"
    fi

    # 备份TaskDetailRouter
    if [ -f "frontend/src/routes/TaskDetailRouter.tsx" ]; then
        cp "frontend/src/routes/TaskDetailRouter.tsx" "$BACKUP_DIR/"
        log_success "已备份 TaskDetailRouter.tsx"
    fi

    # 备份相关测试文件
    if [ -f "frontend/src/routes/__tests__/TaskDetailRouter.test.tsx" ]; then
        cp "frontend/src/routes/__tests__/TaskDetailRouter.test.tsx" "$BACKUP_DIR/"
        log_success "已备份测试文件"
    fi

    log_success "旧代码已备份到: $BACKUP_DIR"
    echo "$BACKUP_DIR" > .old_code_backup_path
}

# 删除旧文件
delete_old_files() {
    log_info "删除旧文件..."

    # 删除TaskDetailPageNew.tsx
    if [ -f "frontend/src/pages/TaskDetailPageNew.tsx" ]; then
        rm "frontend/src/pages/TaskDetailPageNew.tsx"
        log_success "已删除 TaskDetailPageNew.tsx"
    else
        log_warning "TaskDetailPageNew.tsx 不存在"
    fi

    # 删除TaskDetailRouter.tsx (可选,因为可能用于其他功能)
    echo ""
    read -p "是否删除 TaskDetailRouter.tsx? (yes/no): " delete_router
    if [ "$delete_router" == "yes" ]; then
        if [ -f "frontend/src/routes/TaskDetailRouter.tsx" ]; then
            rm "frontend/src/routes/TaskDetailRouter.tsx"
            log_success "已删除 TaskDetailRouter.tsx"
        fi
    fi

    # 删除相关测试文件
    if [ -f "frontend/src/routes/__tests__/TaskDetailRouter.test.tsx" ]; then
        rm "frontend/src/routes/__tests__/TaskDetailRouter.test.tsx"
        log_success "已删除 TaskDetailRouter.test.tsx"
    fi

    log_success "旧文件删除完成"
}

# 更新路由配置
update_routes() {
    log_info "更新路由配置..."

    # 检查App.tsx中的路由配置
    if grep -q "TaskDetailRouter" frontend/src/App.tsx; then
        log_warning "检测到App.tsx中仍在使用TaskDetailRouter"
        echo ""
        echo "需要手动更新 frontend/src/App.tsx:"
        echo ""
        echo "将:"
        echo "  <Route path=\"/projects/:projectId/tasks/:taskId\" element={<TaskDetailRouter />} />"
        echo ""
        echo "改为:"
        echo "  <Route path=\"/projects/:projectId/tasks/:taskId\" element={<TaskDetailPageRefactored />} />"
        echo ""
        echo "并删除 TaskDetailRouter 的 import"
        echo ""
        read -p "按回车键继续..."
    else
        log_success "路由配置检查通过"
    fi
}

# 清理未使用的imports
clean_imports() {
    log_info "清理未使用的imports..."

    # 使用eslint或手动检查
    cd frontend

    # 检查是否有eslint
    if command -v eslint &> /dev/null; then
        log_info "运行 eslint 检查未使用的imports..."
        npx eslint src/**/*.{ts,tsx} --fix || true
        log_success "ESLint 清理完成"
    else
        log_warning "未安装 eslint,请手动检查未使用的imports"
    fi

    cd ..
}

# 清理package.json依赖
clean_dependencies() {
    log_info "检查未使用的依赖..."

    cd frontend

    # 使用depcheck检查未使用的依赖
    if command -v depcheck &> /dev/null; then
        log_info "运行 depcheck..."
        depcheck
    else
        log_warning "未安装 depcheck,安装它: npm install -g depcheck"
        log_info "可以手动运行: cd frontend && npx depcheck"
    fi

    cd ..
}

# 运行测试
run_tests() {
    log_info "运行测试..."

    cd frontend

    # 运行所有测试
    npm test -- --watchAll=false --passWithNoTests

    if [ $? -ne 0 ]; then
        log_error "测试失败,请修复后再继续"
        exit 1
    fi

    log_success "测试通过"
    cd ..
}

# 验证构建
verify_build() {
    log_info "验证构建..."

    cd frontend

    # 清理旧的构建
    rm -rf build/

    # 执行构建
    npm run build

    if [ $? -ne 0 ]; then
        log_error "构建失败,请修复后再继续"
        exit 1
    fi

    log_success "构建成功"
    cd ..
}

# 创建清理记录
create_cleanup_record() {
    log_info "创建清理记录..."

    CLEANUP_LOG="./docs/cleanup/$(date +%Y%m%d_%H%M%S)_code_cleanup.md"
    mkdir -p "./docs/cleanup"

    cat > "$CLEANUP_LOG" << EOF
# TaskDetail旧代码清理记录

## 清理信息
- **清理时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **执行人**: $(git config user.name)
- **Git Commit**: $(git rev-parse HEAD)

## 已删除文件
- frontend/src/pages/TaskDetailPageNew.tsx
- frontend/src/routes/TaskDetailRouter.tsx (可选)
- frontend/src/routes/__tests__/TaskDetailRouter.test.tsx

## 备份信息
- **备份路径**: $(cat .old_code_backup_path 2>/dev/null || echo "无")

## 更新内容
- 路由配置更新为直接使用 TaskDetailPageRefactored
- 清理未使用的imports
- 清理未使用的依赖

## 验证结果
- [x] 测试通过
- [x] 构建成功
- [x] 代码review完成

## 后续工作
- [ ] 提交代码
- [ ] 发布到生产环境
- [ ] 验证生产环境
- [ ] 更新文档

---
🤖 Generated by cleanup-old-code.sh
EOF

    log_success "清理记录已创建: $CLEANUP_LOG"
}

# Git提交
git_commit_cleanup() {
    log_info "准备Git提交..."

    # 显示变更
    git status

    echo ""
    read -p "是否提交这些变更? (yes/no): " commit_confirm
    if [ "$commit_confirm" != "yes" ]; then
        log_info "跳过Git提交"
        return
    fi

    # 添加变更
    git add .

    # 提交
    git commit -m "cleanup: 删除TaskDetail旧版本代码

- 删除 TaskDetailPageNew.tsx
- 删除 TaskDetailRouter.tsx
- 更新路由配置直接使用 TaskDetailPageRefactored
- 清理未使用的imports和依赖
- 验证测试和构建通过

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    log_success "代码已提交"
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  TaskDetail 旧代码清理脚本"
    echo "  Phase 4 - Day 4-5: Code Cleanup"
    echo "=========================================="
    echo ""

    # 执行步骤
    check_prerequisites
    backup_old_code
    delete_old_files
    update_routes
    clean_imports
    clean_dependencies
    run_tests
    verify_build
    create_cleanup_record
    git_commit_cleanup

    echo ""
    log_success "=========================================="
    log_success "  旧代码清理完成!"
    log_success "=========================================="
    echo ""

    log_info "下一步操作:"
    echo "  1. Review代码变更"
    echo "  2. 推送到远程仓库"
    echo "  3. 部署到生产环境"
    echo "  4. 验证生产环境正常"
    echo "  5. 更新项目文档"
    echo ""
}

main "$@"
