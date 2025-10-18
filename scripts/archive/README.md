# 归档脚本

本目录存放已归档的旧版脚本，保留作为历史参考。

## 📁 目录结构

### legacy-deploy/ - 旧版部署脚本
已被 `deploy-to-production.sh` 替代的旧版部署脚本。

**包含**:
- deploy.sh - 旧版通用部署
- deploy-to-server.sh - 旧版服务器部署
- deploy-production.sh - 简化部署脚本
- deploy-production-rsync.sh - rsync 部署
- deploy-full-release.sh - 完整发布脚本
- deploy-cloudflare.sh - Cloudflare 部署
- rollback.sh - 回滚脚本
- rollback-production.sh - 生产回滚
- release-to-main.sh - 发布到主分支

**推荐使用**: `../deploy-to-production.sh`

---

### legacy-tunnel/ - 旧版隧道脚本
已被 `tunnel.sh` 替代的旧版SSH隧道管理脚本。

**包含**:
- ssh-tunnel-manager.sh - 完整隧道管理器（端口15433）
- db-tunnel.sh - 简单隧道脚本
- monitor-tunnel.sh - 隧道监控
- autossh-tunnel.sh - autossh 自动重连版本
- start-ssh-tunnel.sh - 简单启动脚本

**推荐使用**: `../tunnel.sh`（统一端口5433）

---

### legacy-dev/ - 旧版开发脚本
已被 `dev.sh` 替代的旧版开发环境启动脚本。

**包含**:
- dev-start.sh - 旧版开发启动
- start-parallel-dev.sh - 并行开发启动

**推荐使用**: `../dev.sh`

---

### tools/ - 工具脚本
系统配置和维护工具，不常用但保留。

**包含**:
- backup.sh - 通用备份工具
- setup-ssl.sh - SSL证书配置
- setup-launchd.sh - macOS 服务配置
- setup-systemd.sh - Linux systemd 配置
- add_ssh_key_to_server.sh - SSH密钥配置
- monitor-replication.sh - 数据库复制监控
- verify-consistency.sh - 数据一致性验证

---

### tests/ - 测试脚本
用于测试的数据生成和验证脚本。

**包含**:
- generate-test-data.sh - 生成测试数据
- test-data-validation.sh - 测试数据验证

---

### fixes/ - 一次性修复脚本
历史Bug修复脚本，已执行完成，保留作为记录。

**包含**:
- fix-antd-v5-deprecations.sh - 修复Ant Design v5废弃警告
- cleanup-old-code.sh - 清理旧代码
- cleanup-mcp-processes.sh - 清理MCP进程
- apply-connectivity-fix.sh - 连接性修复

---

## ⚠️ 注意事项

1. **归档脚本可能已过时**，使用前请检查兼容性
2. **推荐使用主目录的新版脚本**，功能更完善、更安全
3. **如需参考旧脚本**，请查看对应归档目录
4. **不建议在生产环境使用归档脚本**

---

**最后更新**: 2025-10-15
**维护者**: AI项目开发团队
