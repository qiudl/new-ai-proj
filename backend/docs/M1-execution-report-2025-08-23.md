# M1 执行记录与验收清单 (2025-08-23)

## 执行记录
- 启动容器：`make db.up` → ai-db Healthy, ai-prisma Started
- Prisma：`make prisma.pull`、`make prisma.generate` 成功；18 个模型；生成 @prisma/client v5.16.1
- 迁移：compose 的 migrate 服务报错（容器内未挂载 /migrations 文件）；已改用 `make db.psql` 直接写入基础角色（保留幂等性）
- 基础角色现状：`admin/manager/user` 已存在（另有 `viewer`）

## 后续动作（平台管理员创建）
使用一次性会话变量 (GUC) 安全传参：
- app.admin_username = {{ADMIN_USERNAME}}
- app.admin_email = {{ADMIN_EMAIL}}
- app.admin_password_hash = {{ADMIN_PASSWORD_HASH}}

执行命令（示例，不会在日志打印明文）：
```bash
export ADMIN_USERNAME={{ADMIN_USERNAME}}
export ADMIN_EMAIL={{ADMIN_EMAIL}}
# 以 bcrypt 为例：
export ADMIN_PASSWORD_HASH=$(node -e "(async()=>{const bcrypt=require('bcryptjs');const p=process.env.PW||'';const salt=await bcrypt.genSalt(12);console.log(await bcrypt.hash(p,salt));})()" PW='{{PLAINTEXT_PASSWORD}}')
make db.psql CMD="SET app.admin_username TO :'ADMIN_USERNAME'; SET app.admin_email TO :'ADMIN_EMAIL'; SET app.admin_password_hash TO :'ADMIN_PASSWORD_HASH'; DO $$ BEGIN IF current_setting('app.admin_username', true) IS NOT NULL THEN NULL; END IF; END $$;"
```

注：建议把密码明文换成交互式输入或使用秘密管理工具获取。

## 验收检查清单
- [x] Docker Postgres 与 Prisma 容器运行正常（ai-db Healthy, ai-prisma Started）
- [x] 已成功执行 `prisma db pull`（Prisma schema 与数据库一致）
- [x] 已成功执行 `prisma generate`（客户端可用）
- [x] 基础角色已存在：`admin`、`manager`、`user`（以及 `viewer` 如设计需要）
- [ ] 通过 SQL 或脚本创建平台管理员（使用会话 GUC，不落盘秘密）
- [ ] 验证管理员账户能登录（或存在于 users 表中，状态 active）
- [ ] 将过程产出与命令记录到任务文档，分配给 ai-pm
