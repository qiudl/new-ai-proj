# 子任务 #341：后端：为 /work-notes 路由增加路由映射层单元测试，确保长期一致性

- 策略：构造 dummy ApplicationInterface，注册 work-notes 路由，仅断言 8 条路由是否注册。
- 文件：backend/routes/work_notes_routes_test.go
- 执行：容器内 go test 仅跑该用例（PASS）。
- 价值：为 /work-notes 路由映射提供长期防回归保障。