#!/bin/bash

# 备份管理脚本

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
BACKUP_DIR="$PROJECT_DIR/backups"

show_help() {
    echo "📋 数据库备份管理工具"
    echo "====================="
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  list      - 列出所有备份文件"
    echo "  status    - 显示备份系统状态"
    echo "  backup    - 立即执行一次备份"
    echo "  restore   - 从备份恢复数据库"
    echo "  clean     - 清理超过7天的旧备份"
    echo "  logs      - 查看备份日志"
    echo "  help      - 显示此帮助信息"
}

list_backups() {
    echo "📂 当前备份文件列表:"
    echo "===================="
    if ls "$BACKUP_DIR"/*_dbbackup.sql >/dev/null 2>&1; then
        ls -lah "$BACKUP_DIR"/*_dbbackup.sql | awk '{print $9 " (" $5 ") - " $6 " " $7 " " $8}'
        echo ""
        echo "📊 统计信息:"
        BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*_dbbackup.sql 2>/dev/null | wc -l)
        TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        echo "- 备份文件数: $BACKUP_COUNT"
        echo "- 总占用空间: $TOTAL_SIZE"
    else
        echo "暂无备份文件"
    fi
}

show_status() {
    echo "🔍 备份系统状态:"
    echo "================"
    
    # 检查crontab
    if crontab -l 2>/dev/null | grep -q "auto-backup.sh"; then
        echo "✅ 定时任务: 已设置 (每天6点、12点、18点)"
    else
        echo "❌ 定时任务: 未设置"
    fi
    
    # 检查备份脚本
    if [[ -x "$PROJECT_DIR/scripts/auto-backup.sh" ]]; then
        echo "✅ 备份脚本: 可执行"
    else
        echo "❌ 备份脚本: 不存在或不可执行"
    fi
    
    # 检查Docker容器
    cd "$PROJECT_DIR"
    if docker-compose ps | grep -q "postgres_db.*Up"; then
        echo "✅ 数据库容器: 运行中"
    else
        echo "❌ 数据库容器: 未运行"
    fi
    
    # 最新备份信息
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*_dbbackup.sql 2>/dev/null | head -1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        BACKUP_TIME=$(stat -f %Sm -t "%Y-%m-%d %H:%M:%S" "$LATEST_BACKUP")
        BACKUP_SIZE=$(ls -lh "$LATEST_BACKUP" | awk '{print $5}')
        echo "📅 最新备份: $BACKUP_TIME ($BACKUP_SIZE)"
    else
        echo "📅 最新备份: 无"
    fi
}

run_backup() {
    echo "🚀 执行立即备份..."
    "$PROJECT_DIR/scripts/auto-backup.sh"
}

restore_backup() {
    echo "🔄 数据库恢复工具"
    echo "=================="
    
    if ! ls "$BACKUP_DIR"/*_dbbackup.sql >/dev/null 2>&1; then
        echo "❌ 没有找到备份文件"
        exit 1
    fi
    
    echo "可用的备份文件:"
    ls -1 "$BACKUP_DIR"/*_dbbackup.sql | nl
    echo ""
    read -p "请选择要恢复的备份文件编号: " choice
    
    BACKUP_FILE=$(ls -1 "$BACKUP_DIR"/*_dbbackup.sql | sed -n "${choice}p")
    
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "❌ 无效的选择"
        exit 1
    fi
    
    echo "⚠️  即将从以下备份恢复数据库:"
    echo "   $BACKUP_FILE"
    echo ""
    read -p "此操作将覆盖当前数据库，确认继续吗? (y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "❌ 操作已取消"
        exit 1
    fi
    
    echo "🔄 正在恢复数据库..."
    cd "$PROJECT_DIR"
    
    # 停止应用
    docker-compose stop backend frontend
    
    # 重建数据库
    docker-compose exec -T db psql -U user -d main_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    # 恢复数据
    if cat "$BACKUP_FILE" | docker-compose exec -T db psql -U user -d main_db; then
        echo "✅ 数据库恢复成功"
        
        # 重启应用
        docker-compose start backend frontend
        echo "✅ 应用已重启"
    else
        echo "❌ 数据库恢复失败"
        exit 1
    fi
}

clean_old_backups() {
    echo "🧹 清理旧备份文件..."
    find "$BACKUP_DIR" -name "*_dbbackup.sql" -mtime +7 -delete 2>/dev/null || true
    echo "✅ 清理完成"
    list_backups
}

show_logs() {
    echo "📋 备份日志 (最近20行):"
    echo "====================="
    if [[ -f "$PROJECT_DIR/logs/backup.log" ]]; then
        tail -20 "$PROJECT_DIR/logs/backup.log"
    else
        echo "暂无日志文件"
    fi
}

# 主程序
case "${1:-help}" in
    list)
        list_backups
        ;;
    status)
        show_status
        ;;
    backup)
        run_backup
        ;;
    restore)
        restore_backup
        ;;
    clean)
        clean_old_backups
        ;;
    logs)
        show_logs
        ;;
    help|*)
        show_help
        ;;
esac