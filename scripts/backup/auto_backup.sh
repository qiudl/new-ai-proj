    echo "用法: $0 [backup_type] [options]"
    echo
    echo "备份类型:"
    echo "  daily     - 执行日备份（默认）"
    echo "  weekly    - 执行周备份（仅周日或强制模式）"
    echo "  monthly   - 执行月备份（仅月初或强制模式）"
    echo "  all       - 执行所有类型备份"
    echo "  rotation  - 仅执行备份轮转（清理旧备份）"
    echo
    echo "选项:"
    echo "  force     - 强制执行备份（忽略时间限制）"
    echo "  help      - 显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0                    # 执行日备份"
    echo "  $0 weekly             # 执行周备份（仅周日）"
    echo "  $0 weekly force       # 强制执行周备份"
    echo "  $0 monthly force      # 强制执行月备份"
    echo "  $0 all                # 执行所有备份"
    echo "  $0 rotation           # 仅清理旧备份"
    echo
    echo "定时任务示例 (crontab):"
    echo "  # 每天凌晨2点执行日备份"
    echo "  0 2 * * * /path/to/auto_backup.sh daily"
    echo "  # 每周日凌晨3点执行周备份"
    echo "  0 3 * * 0 /path/to/auto_backup.sh weekly"
    echo "  # 每月1号凌晨4点执行月备份"
    echo "  0 4 1 * * /path/to/auto_backup.sh monthly"
}

# 处理命令行参数
if [[ "$1" == "help" ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 执行主程序
main "$@"