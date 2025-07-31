 - 每月1号凌晨4点执行"$'\n'
    cron_content+="0 4 1 * * cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT monthly >> $PROJECT_ROOT/backups/logs/monthly_backup.log 2>&1"$'\n'
    cron_content+=""$'\n'
    
    # 备份清理任务（每天凌晨5点）
    cron_content+="# 备份清理 - 每天凌晨5点执行备份轮转"$'\n'
    cron_content+="0 5 * * * cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT rotation >> $PROJECT_ROOT/backups/logs/cleanup_backup.log 2>&1"$'\n'
    cron_content+=""$'\n'
    
    # 健康检查任务（可选，每6小时）
    cron_content+="# 备份健康检查 - 每6小时执行一次（可选）"$'\n'
    cron_content+="# 0 */6 * * * cd $PROJECT_ROOT && $SCRIPT_DIR/health_check.sh >> $PROJECT_ROOT/backups/logs/health_check.log 2>&1"$'\n'
    cron_content+=""$'\n'
    
    # 日志清理任务（每周日凌晨6点）
    cron_content+="# 日志清理 - 每周日凌晨6点清理30天前的日志"$'\n'
    cron_content+="0 6 * * 0 find $PROJECT_ROOT/backups/logs -name '*.log' -mtime +30 -delete 2>/dev/null"$'\n'
    cron_content+=""$'\n'
    
    echo "$cron_content"
}

# 安装定时任务
install_cron_jobs() {
    log_step "安装备份定时任务..."
    
    # 生成新的定时任务内容
    local new_cron_jobs=$(generate_backup_cron_jobs)
    
    # 获取当前crontab内容（排除已存在的备份任务）
    local current_cron=""
    if crontab -l 2>/dev/null; then
        current_cron=$(crontab -l 2>/dev/null | grep -v -E "(backup|# 数据库自动备份|# ============)")
    fi
    
    # 合并内容
    local combined_cron=""
    if [[ -n "$current_cron" ]]; then
        combined_cron="$current_cron"$'\n'$'\n'"$new_cron_jobs"
    else
        combined_cron="$new_cron_jobs"
    fi
    
    # 写入临时文件
    local temp_cron_file=$(mktemp)
    echo "$combined_cron" > "$temp_cron_file"
    
    # 安装新的crontab
    if crontab "$temp_cron_file"; then
        log_success "备份定时任务安装成功"
        rm -f "$temp_cron_file"
        return 0
    else
        log_error "备份定时任务安装失败"
        rm -f "$temp_cron_file"
        return 1
    fi
}

# 卸载备份定时任务
uninstall_cron_jobs() {
    log_step "卸载备份定时任务..."
    
    if ! crontab -l 2>/dev/null | grep -q "backup"; then
        log_info "没有找到备份相关的定时任务"
        return 0
    fi
    
    # 获取当前crontab内容（排除备份任务）
    local filtered_cron=$(crontab -l 2>/dev/null | grep -v -E "(backup|# 数据库自动备份|# =============)" | grep -v "^$")
    
    if [[ -n "$filtered_cron" ]]; then
        # 写入临时文件
        local temp_cron_file=$(mktemp)
        echo "$filtered_cron" > "$temp_cron_file"
        
        # 安装过滤后的crontab
        if crontab "$temp_cron_file"; then
            log_success "备份定时任务卸载成功"
            rm -f "$temp_cron_file"
        else
            log_error "备份定时任务卸载失败"
            rm -f "$temp_cron_file"
            return 1
        fi
    else
        # 清空crontab
        if crontab -r 2>/dev/null; then
            log_success "备份定时任务卸载成功（crontab已清空）"
        else
            log_warning "crontab清空可能失败"
        fi
    fi
}

# 验证定时任务
verify_cron_jobs() {
    log_step "验证定时任务安装..."
    
    local cron_content=$(crontab -l 2>/dev/null)
    
    if [[ -z "$cron_content" ]]; then
        log_error "没有找到任何定时任务"
        return 1
    fi
    
    # 检查必要的备份任务
    local required_jobs=("daily" "weekly" "monthly" "rotation")
    local missing_jobs=()
    
    for job in "${required_jobs[@]}"; do
        if ! echo "$cron_content" | grep -q "$job"; then
            missing_jobs+=("$job")
        fi
    done
    
    if [[ ${#missing_jobs[@]} -eq 0 ]]; then
        log_success "所有必要的备份定时任务都已安装"
        
        # 显示安装的任务
        echo
        echo "已安装的备份定时任务:"
        echo "===================="
        crontab -l | grep -E "(backup|#.*备份)" || echo "无法显示任务详情"
        echo
        
        return 0
    else
        log_error "缺少定时任务: ${missing_jobs[*]}"
        return 1
    fi
}

# =============================================================================
# 交互式配置函数 (Interactive Configuration Functions)
# =============================================================================

# 显示定时任务配置选项
show_cron_menu() {
    echo "=============================================="
    echo "       数据库备份定时任务配置工具"
    echo "=============================================="
    echo
    echo "请选择操作："
    echo "  1) 查看当前定时任务"
    echo "  2) 安装备份定时任务"
    echo "  3) 卸载备份定时任务"
    echo "  4) 重新安装定时任务"
    echo "  5) 验证定时任务"
    echo "  6) 测试备份脚本"
    echo "  7) 查看备份日志"
    echo "  8) 自定义定时任务"
    echo "  0) 退出"
    echo
}

# 测试备份脚本
test_backup_scripts() {
    log_step "测试备份脚本..."
    
    echo "测试选项："
    echo "1) 测试日备份脚本"
    echo "2) 测试手动备份脚本"
    echo "3) 测试所有脚本"
    echo
    
    read -p "请选择测试选项 (1-3): " test_choice
    echo
    
    case $test_choice in
        1)
            log_info "测试自动备份脚本（日备份）..."
            if cd "$PROJECT_ROOT" && "$AUTO_BACKUP_SCRIPT" daily; then
                log_success "自动备份脚本测试成功"
            else
                log_error "自动备份脚本测试失败"
                return 1
            fi
            ;;
        2)
            if [[ -f "$MANUAL_BACKUP_SCRIPT" ]]; then
                log_info "测试手动备份脚本..."
                if cd "$PROJECT_ROOT" && "$MANUAL_BACKUP_SCRIPT" full; then
                    log_success "手动备份脚本测试成功"
                else
                    log_error "手动备份脚本测试失败"
                    return 1
                fi
            else
                log_warning "手动备份脚本不存在，跳过测试"
            fi
            ;;
        3)
            log_info "测试所有备份脚本..."
            
            # 测试自动备份
            if cd "$PROJECT_ROOT" && "$AUTO_BACKUP_SCRIPT" daily; then
                log_success "自动备份脚本测试成功"
            else
                log_error "自动备份脚本测试失败"
                return 1
            fi
            
            # 测试手动备份
            if [[ -f "$MANUAL_BACKUP_SCRIPT" ]]; then
                if cd "$PROJECT_ROOT" && "$MANUAL_BACKUP_SCRIPT" full; then
                    log_success "手动备份脚本测试成功"
                else
                    log_error "手动备份脚本测试失败"
                    return 1
                fi
            fi
            
            log_success "所有备份脚本测试完成"
            ;;
        *)
            log_warning "无效选择"
            return 1
            ;;
    esac
}

# 查看备份日志
view_backup_logs() {
    log_step "查看备份日志..."
    
    local log_dir="$PROJECT_ROOT/backups/logs"
    
    if [[ ! -d "$log_dir" ]]; then
        log_warning "日志目录不存在: $log_dir"
        return 1
    fi
    
    echo "可用的日志文件："
    echo "=================="
    
    local log_files=($(find "$log_dir" -name "*.log" -type f | sort -r | head -10))
    
    if [[ ${#log_files[@]} -eq 0 ]]; then
        log_info "没有找到日志文件"
        return 1
    fi
    
    for i in "${!log_files[@]}"; do
        local file="${log_files[i]}"
        local file_size=$(du -h "$file" | cut -f1)
        local mod_time=$(stat -f%Sm -t"%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c%y "$file" | cut -d'.' -f1)
        
        echo "$((i+1))) $(basename "$file") - $file_size - $mod_time"
    done
    
    echo
    read -p "请选择要查看的日志文件 (1-${#log_files[@]}): " log_choice
    
    if [[ "$log_choice" =~ ^[0-9]+$ ]] && [[ $log_choice -ge 1 ]] && [[ $log_choice -le ${#log_files[@]} ]]; then
        local selected_log="${log_files[$((log_choice-1))]}"
        
        echo
        echo "查看日志文件: $(basename "$selected_log")"
        echo "======================================"
        
        # 显示最后50行
        if command -v tail >/dev/null 2>&1; then
            tail -50 "$selected_log"
        else
            cat "$selected_log"
        fi
    else
        log_warning "无效选择"
    fi
}

# 自定义定时任务配置
custom_cron_configuration() {
    log_step "自定义定时任务配置..."
    
    echo "当前默认定时任务配置："
    echo "======================"
    echo "日备份: 每天凌晨2点 (0 2 * * *)"
    echo "周备份: 每周日凌晨3点 (0 3 * * 0)"
    echo "月备份: 每月1号凌晨4点 (0 4 1 * *)"
    echo "清理任务: 每天凌晨5点 (0 5 * * *)"
    echo
    
    if get_user_confirmation "是否要自定义这些时间设置？"; then
        echo
        echo "请输入新的定时设置（使用cron格式：分 时 日 月 星期）："
        echo
        
        read -p "日备份时间 [默认: 0 2 * * *]: " daily_cron
        daily_cron=${daily_cron:-"0 2 * * *"}
        
        read -p "周备份时间 [默认: 0 3 * * 0]: " weekly_cron
        weekly_cron=${weekly_cron:-"0 3 * * 0"}
        
        read -p "月备份时间 [默认: 0 4 1 * *]: " monthly_cron
        monthly_cron=${monthly_cron:-"0 4 1 * *"}
        
        read -p "清理任务时间 [默认: 0 5 * * *]: " cleanup_cron
        cleanup_cron=${cleanup_cron:-"0 5 * * *"}
        
        # 生成自定义的定时任务
        local custom_cron_content=""
        custom_cron_content+="# =============================================="$'\n'
        custom_cron_content+="# 数据库自动备份定时任务（自定义配置）"$'\n'
        custom_cron_content+="# 由 $(basename "$0") 生成于 $(date)"$'\n'
        custom_cron_content+="# =============================================="$'\n'
        custom_cron_content+=""$'\n'
        custom_cron_content+="PATH=/usr/local/bin:/usr/bin:/bin"$'\n'
        custom_cron_content+="SHELL=/bin/bash"$'\n'
        custom_cron_content+=""$'\n'
        custom_cron_content+="# 日备份"$'\n'
        custom_cron_content+="$daily_cron cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT daily >> $PROJECT_ROOT/backups/logs/daily_backup.log 2>&1"$'\n'
        custom_cron_content+=""$'\n'
        custom_cron_content+="# 周备份"$'\n'
        custom_cron_content+="$weekly_cron cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT weekly >> $PROJECT_ROOT/backups/logs/weekly_backup.log 2>&1"$'\n'
        custom_cron_content+=""$'\n'
        custom_cron_content+="# 月备份"$'\n'
        custom_cron_content+="$monthly_cron cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT monthly >> $PROJECT_ROOT/backups/logs/monthly_backup.log 2>&1"$'\n'
        custom_cron_content+=""$'\n'
        custom_cron_content+="# 备份清理"$'\n'
        custom_cron_content+="$cleanup_cron cd $PROJECT_ROOT && $AUTO_BACKUP_SCRIPT rotation >> $PROJECT_ROOT/backups/logs/cleanup_backup.log 2>&1"$'\n'
        
        echo
        echo "将要安装的自定义定时任务："
        echo "=========================="
        echo "$custom_cron_content"
        echo
        
        if get_user_confirmation "确认安装这些自定义定时任务？"; then
            # 获取当前crontab内容（排除已存在的备份任务）
            local current_cron=""
            if crontab -l 2>/dev/null; then
                current_cron=$(crontab -l 2>/dev/null | grep -v -E "(backup|# 数据库自动备份|# ============)")
            fi
            
            # 合并内容
            local combined_cron=""
            if [[ -n "$current_cron" ]]; then
                combined_cron="$current_cron"$'\n'$'\n'"$custom_cron_content"
            else
                combined_cron="$custom_cron_content"
            fi
            
            # 写入临时文件并安装
            local temp_cron_file=$(mktemp)
            echo "$combined_cron" > "$temp_cron_file"
            
            if crontab "$temp_cron_file"; then
                log_success "自定义定时任务安装成功"
                rm -f "$temp_cron_file"
            else
                log_error "自定义定时任务安装失败"
                rm -f "$temp_cron_file"
                return 1
            fi
        else
            log_info "自定义配置已取消"
        fi
    else
        log_info "保持默认配置"
    fi
}

# =============================================================================
# 主程序函数 (Main Program Functions)
# =============================================================================

# 初始化
initialize() {
    log_step "初始化定时任务配置系统..."
    
    check_system_environment
    create_directories
    
    log_success "系统初始化完成"
    echo
}

# 主执行函数
main() {
    # 记录脚本启动
    mkdir -p "$(dirname "$CRON_LOG")"
    log_info "Cron setup script started"
    
    initialize
    
    # 如果有命令行参数，直接执行对应操作
    if [[ $# -gt 0 ]]; then
        case "$1" in
            "install")
                if backup_current_cron; then
                    log_info "当前crontab已备份"
                fi
                
                if install_cron_jobs; then
                    verify_cron_jobs
                fi
                ;;
            "uninstall")
                if backup_current_cron; then
                    log_info "当前crontab已备份"
                fi
                
                uninstall_cron_jobs
                ;;
            "show"|"list")
                show_current_cron_jobs
                ;;
            "verify")
                verify_cron_jobs
                ;;
            "test")
                test_backup_scripts
                ;;
            "logs")
                view_backup_logs
                ;;
            "help"|"-h"|"--help")
                echo "定时任务配置工具 v2.0"
                echo
                echo "用法: $0 [选项]"
                echo
                echo "选项:"
                echo "  install    - 安装备份定时任务"
                echo "  uninstall  - 卸载备份定时任务"
                echo "  show       - 显示当前定时任务"
                echo "  verify     - 验证定时任务"
                echo "  test       - 测试备份脚本"
                echo "  logs       - 查看备份日志"
                echo "  help       - 显示此帮助"
                echo
                echo "示例:"
                echo "  $0 install    # 安装定时任务"
                echo "  $0 show       # 查看当前任务"
                echo "  $0 test       # 测试脚本"
                ;;
            *)
                log_error "未知选项: $1"
                echo "使用 '$0 help' 查看可用选项"
                exit 1
                ;;
        esac
        return
    fi
    
    # 交互式模式
    while true; do
        show_cron_menu
        read -p "请输入选择 (0-8): " choice
        echo
        
        case $choice in
            1)
                show_current_cron_jobs
                ;;
            2)
                if backup_current_cron; then
                    log_info "当前crontab已备份"
                    echo
                fi
                
                if get_user_confirmation "确认安装备份定时任务？"; then
                    if install_cron_jobs; then
                        verify_cron_jobs
                    fi
                else
                    log_info "安装操作已取消"
                fi
                ;;
            3)
                if get_user_confirmation "确认卸载所有备份定时任务？" "N"; then
                    if backup_current_cron; then
                        log_info "当前crontab已备份"
                        echo
                    fi
                    uninstall_cron_jobs
                else
                    log_info "卸载操作已取消"
                fi
                ;;
            4)
                if get_user_confirmation "确认重新安装定时任务？这将覆盖现有的备份任务"; then
                    if backup_current_cron; then
                        log_info "当前crontab已备份"
                        echo
                    fi
                    
                    uninstall_cron_jobs
                    echo
                    
                    if install_cron_jobs; then
                        verify_cron_jobs
                    fi
                else
                    log_info "重新安装操作已取消"
                fi
                ;;
            5)
                verify_cron_jobs
                ;;
            6)
                test_backup_scripts
                ;;
            7)
                view_backup_logs
                ;;
            8)
                custom_cron_configuration
                ;;
            0)
                log_info "退出定时任务配置工具"
                break
                ;;
            *)
                log_warning "无效选择，请重新输入"
                ;;
        esac
        
        if [[ "$choice" != "0" ]]; then
            echo
            read -p "按 Enter 键继续..."
            echo
        fi
    done
    
    log_info "Cron setup script ended"
}

# 脚本退出时的清理工作
cleanup_on_exit() {
    log_info "Cron setup script cleanup"
}

# 捕获退出信号
trap cleanup_on_exit EXIT

# 执行主程序
main "$@"