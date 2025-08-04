## MCP Tasks
- 只能用mcp去创建任务
- 进行任务的创建、查询、编辑、删除等操作都必须用mcp工具
- 只要是任务就分析任务的性质，在id为1的项目中找到本周的根任务，然后在其下创建子任务。在子任务执行中发现有新的问题就创建孙任务
- 规定：不许用api去操作系统。只能用mcp接口

## Debug Logs
- API Interceptor encountered 500 Internal Server Error at GET http://localhost:8080/api/v1/analysis/tags/statistics
- Low priority preload strategy initiated in useSmartPreload.ts
- Console error: Query data cannot be undefined for query key ["dashboard","weekly",34,"2025-08-03","2025-08-09",null]

## Summary
- 总结请用中文