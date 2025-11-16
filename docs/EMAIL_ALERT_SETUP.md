# 邮件告警配置指南

**版本**: v1.0
**更新日期**: 2025-11-15
**功能**: 磁盘监控邮件告警配置

---

## 概述

磁盘监控脚本已集成邮件告警功能，当磁盘使用率超过80%时，会自动发送邮件到 `qiudl@zhiyuncai.com`。

---

## 配置步骤

### 1. 创建SMTP配置文件

在生产服务器上创建SMTP配置文件：

```bash
ssh ubuntu@152.136.104.251

# 复制配置模板
cd /opt/ai-project
cp .env.smtp.example .env.smtp

# 编辑配置文件
vi .env.smtp
```

### 2. 填写SMTP配置

根据使用的邮箱服务填写配置：

#### 腾讯企业邮箱 (推荐)

```bash
SMTP_SERVER="smtp.exmail.qq.com"
SMTP_PORT="465"
SMTP_USER="qiudl@joylodging.com"
SMTP_PASSWORD="39oS7nX7oQFeWFtg"  # 使用授权码,不是登录密码
FROM_NAME="ai-proj system"
```

**获取授权码**:
1. 登录腾讯企业邮箱: https://exmail.qq.com/
2. 设置 → 客户端设置
3. 启用SMTP服务
4. 生成授权码

#### 阿里企业邮箱

```bash
SMTP_SERVER="smtp.qiye.aliyun.com"
SMTP_PORT="465"
SMTP_USER="ops@zhiyuncai.com"
SMTP_PASSWORD="your-password"
FROM_NAME="AI项目监控系统"
```

#### Gmail

```bash
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"  # 需要开启两步验证并生成应用专用密码
FROM_NAME="AI Project Monitor"
```

### 3. 设置文件权限

```bash
# 保护配置文件,仅所有者可读
chmod 600 /opt/ai-project/.env.smtp
```

### 4. 测试邮件发送

```bash
# 手动测试邮件发送
/opt/ai-project/current/scripts/send-email.sh \
  "测试邮件" \
  "这是一封测试邮件,如果收到说明配置正确" \
  "qiudl@zhiyuncai.com"
```

**预期输出**:
```
正在发送邮件...
  发件人: ops@zhiyuncai.com
  收件人: qiudl@zhiyuncai.com
  主题: 测试邮件
✅ 邮件发送成功
```

---

## 告警邮件格式

当磁盘使用率超过80%时,会收到以下格式的邮件:

**主题**: `[告警] proj.joylodging.com 磁盘空间不足 (85%)`

**正文**:
```
服务器磁盘空间告警

服务器: proj.joylodging.com
告警时间: 2025-11-15 22:30:00 CST
告警级别: 警告

磁盘使用情况:
- 使用率: 85%
- 可用空间: 9G
- 总空间: 59G
- 告警阈值: 80%

建议操作:
1. 登录服务器检查磁盘使用情况: df -h
2. 清理Docker无用镜像: docker system prune -af
3. 清理旧的releases目录
4. 检查日志文件大小

自动清理任务将在每周日凌晨2点执行。

---
此邮件由磁盘监控系统自动发送
监控脚本: /opt/ai-project/current/scripts/monitor-disk-space.sh
日志文件: /opt/ai-project/logs/disk-monitor.log
```

---

## 告警规则

| 规则 | 说明 |
|------|------|
| **触发阈值** | 磁盘使用率 ≥ 80% |
| **检查频率** | 每小时一次 (cron: 0 * * * *) |
| **重复告警** | 每小时最多一次 (避免邮件轰炸) |
| **恢复通知** | 当使用率降到80%以下时,记录恢复日志 |
| **收件人** | qiudl@zhiyuncai.com |

---

## 故障排除

### 问题1: 邮件发送失败

**症状**: 日志显示"邮件发送失败"

**排查步骤**:

1. **检查配置文件是否存在**:
   ```bash
   ls -l /opt/ai-project/.env.smtp
   ```

2. **验证SMTP配置**:
   ```bash
   cat /opt/ai-project/.env.smtp
   ```

3. **测试SMTP连接**:
   ```bash
   curl -v --url "smtps://smtp.exmail.qq.com:465" \
     --mail-from "ops@zhiyuncai.com" \
     --mail-rcpt "qiudl@zhiyuncai.com" \
     --user "ops@zhiyuncai.com:password"
   ```

4. **检查curl是否安装**:
   ```bash
   curl --version
   ```

### 问题2: 未收到邮件

**可能原因**:

1. **邮箱被过滤到垃圾箱**: 检查垃圾邮件文件夹
2. **SMTP授权码错误**: 重新生成授权码
3. **SMTP服务器地址错误**: 确认邮箱服务商的SMTP设置
4. **防火墙阻止**: 检查服务器出站端口465/587是否开放

**测试命令**:
```bash
# 检查端口连通性
telnet smtp.exmail.qq.com 465
```

### 问题3: 权限错误

**症状**: `Permission denied: /opt/ai-project/.env.smtp`

**解决方案**:
```bash
chmod 600 /opt/ai-project/.env.smtp
chown ubuntu:ubuntu /opt/ai-project/.env.smtp
```

---

## 高级配置

### 修改收件人

编辑监控脚本的配置部分:

```bash
vi /opt/ai-project/current/scripts/monitor-disk-space.sh

# 找到以下行并修改
ALERT_EMAIL="qiudl@zhiyuncai.com"

# 改为
ALERT_EMAIL="new-email@example.com"
```

### 添加多个收件人

修改邮件发送脚本支持多收件人:

```bash
# 在send-email.sh中修改
TO_EMAIL="qiudl@zhiyuncai.com,admin@example.com"
```

### 调整告警阈值

```bash
vi /opt/ai-project/current/scripts/monitor-disk-space.sh

# 修改阈值(默认80%)
THRESHOLD=85  # 改为85%
```

### 自定义告警频率

修改cron配置:

```bash
crontab -e

# 改为每30分钟检查一次
*/30 * * * * /opt/ai-project/current/scripts/monitor-disk-space.sh >> /opt/ai-project/logs/disk-monitor.log 2>&1
```

---

## 安全建议

1. **使用授权码**: 不要在配置文件中使用邮箱登录密码,使用专门的SMTP授权码
2. **限制文件权限**: 确保`.env.smtp`文件权限为600 (仅所有者可读写)
3. **定期更换密码**: 每3个月更换一次SMTP授权码
4. **监控日志**: 定期检查`/opt/ai-project/logs/disk-monitor.log`确保邮件正常发送

---

## 相关文件

| 文件路径 | 说明 |
|---------|------|
| `/opt/ai-project/current/scripts/monitor-disk-space.sh` | 磁盘监控脚本 |
| `/opt/ai-project/current/scripts/send-email.sh` | 邮件发送脚本 |
| `/opt/ai-project/.env.smtp` | SMTP配置文件 (需创建) |
| `/opt/ai-project/.env.smtp.example` | 配置文件模板 |
| `/opt/ai-project/logs/disk-monitor.log` | 监控日志 |

---

## 日志位置

- **监控日志**: `/opt/ai-project/logs/disk-monitor.log`
- **系统日志**: 通过`journalctl -t disk-monitor`查看

---

## 快速命令参考

```bash
# 查看最近的监控日志
tail -f /opt/ai-project/logs/disk-monitor.log

# 手动触发监控检查
/opt/ai-project/current/scripts/monitor-disk-space.sh

# 测试邮件发送
/opt/ai-project/current/scripts/send-email.sh "测试" "测试内容" "qiudl@zhiyuncai.com"

# 查看cron任务
crontab -l | grep monitor-disk

# 查看当前磁盘使用率
df -h /
```

---

**最后更新**: 2025-11-15
**维护人员**: DevOps Team
**联系方式**: qiudl@zhiyuncai.com
