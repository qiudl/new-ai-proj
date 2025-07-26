    echo "选项:"
    echo "  --help, -h        显示帮助信息"
    echo "  --startup         仅演示系统启动"
    echo "  --api             仅演示基础API"
    echo "  --timer           仅演示计时器功能"
    echo "  --audit           仅演示审计日志"
    echo "  --users           仅演示用户管理"
    echo "  --frontend        仅演示前端功能"
    echo "  --stats           仅演示性能统计"
    echo "  --quick           快速演示（跳过等待）"
    echo ""
    echo "示例:"
    echo "  $0                # 运行完整演示"
    echo "  $0 --timer        # 仅演示计时器功能"
    echo "  $0 --quick        # 快速演示模式"
    echo ""
}

# 处理命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --startup)
        check_prerequisites
        demo_system_startup
        ;;
    --api)
        demo_basic_api
        ;;
    --timer)
        demo_timer_functionality
        ;;
    --audit)
        demo_audit_logs
        ;;
    --users)
        demo_user_management
        ;;
    --frontend)
        demo_frontend_features
        ;;
    --stats)
        demo_performance_stats
        ;;
    --quick)
        print_info "快速演示模式启用"
        check_prerequisites
        demo_basic_api
        demo_frontend_features
        print_success "快速演示完成"
        ;;
    "")
        run_complete_demo
        ;;
    *)
        print_error "未知选项: $1"
        show_help
        exit 1
        ;;
esac
