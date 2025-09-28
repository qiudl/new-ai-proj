#!/bin/bash

# 安全策略配置脚本
# 配置防火墙、fail2ban、SSH安全设置等

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 更新系统包
update_system() {
    log "更新系统包..."
    apt-get update
    apt-get upgrade -y
}

# 配置UFW防火墙
setup_firewall() {
    log "配置UFW防火墙..."
    
    # 安装ufw（如果未安装）
    apt-get install -y ufw
    
    # 重置防火墙规则
    ufw --force reset
    
    # 默认策略：拒绝所有入站，允许所有出站
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许SSH连接（端口22）
    ufw allow 22/tcp comment 'SSH'
    
    # 允许HTTP和HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # 允许应用端口（可根据需要调整）
    ufw allow 8080/tcp comment 'Application API'
    
    # 限制SSH连接频率（防止暴力破解）
    ufw limit 22/tcp
    
    # 启用防火墙
    ufw --force enable
    
    # 显示防火墙状态
    ufw status verbose
}

# 安装和配置fail2ban
setup_fail2ban() {
    log "安装和配置fail2ban..."
    
    # 安装fail2ban
    apt-get install -y fail2ban
    
    # 创建本地配置文件
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# 禁止时间（秒）
bantime = 3600

# 查找时间窗口（秒）
findtime = 600

# 最大尝试次数
maxretry = 5

# 忽略的IP地址（添加你的管理IP）
ignoreip = 127.0.0.1/8 ::1

# 后端存储
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1800

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

    # 创建nginx过滤器
    cat > /etc/fail2ban/filter.d/nginx-botsearch.conf << 'EOF'
[Definition]
failregex = ^<HOST>.*GET.*(\.php|\.asp|\.exe|\.pl|\.cgi|\.scgi)
ignoreregex =
EOF

    # 启动和启用fail2ban
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    # 显示fail2ban状态
    fail2ban-client status
}

# 加固SSH配置
harden_ssh() {
    log "加固SSH配置..."
    
    # 备份原配置
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # 创建新的SSH配置
    cat > /etc/ssh/sshd_config << 'EOF'
# SSH服务器配置 - 安全加固版本

# 基本设置
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# 日志设置
SyslogFacility AUTH
LogLevel INFO

# 认证设置
LoginGraceTime 60
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 2

# 密钥认证
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# 密码认证（建议禁用，使用密钥认证）
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Kerberos和GSSAPI
KerberosAuthentication no
GSSAPIAuthentication no

# 网络设置
X11Forwarding no
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2

# 环境设置
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server

# 用户和组限制
AllowUsers aiproject
DenyUsers root

# 其他安全设置
PermitUserEnvironment no
Compression no
UseDNS no
EOF

    # 重启SSH服务
    systemctl restart sshd
    log "SSH配置已更新并重启服务"
}

# 配置自动安全更新
setup_auto_updates() {
    log "配置自动安全更新..."
    
    # 安装unattended-upgrades
    apt-get install -y unattended-upgrades
    
    # 配置自动更新
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // "vim";
    // "libc6-dev";
    // "libc6";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    # 启动自动更新服务
    systemctl enable unattended-upgrades
    systemctl start unattended-upgrades
}

# 配置系统审计
setup_auditing() {
    log "配置系统审计..."
    
    # 安装auditd
    apt-get install -y auditd audispd-plugins
    
    # 基本审计规则
    cat > /etc/audit/rules.d/audit.rules << 'EOF'
# 删除所有现有规则
-D

# 设置缓冲区大小
-b 8192

# 监控关键文件修改
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k identity
-w /etc/ssh/sshd_config -p wa -k sshd

# 监控系统调用
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -S stime -k time-change
-a always,exit -F arch=b64 -S clock_settime -k time-change
-a always,exit -F arch=b32 -S clock_settime -k time-change

# 监控网络配置变更
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k system-locale
-a always,exit -F arch=b32 -S sethostname -S setdomainname -k system-locale

# 监控登录事件
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/log/tallylog -p wa -k logins

# 监控权限修改
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -k perm_mod
-a always,exit -F arch=b32 -S chmod -S fchmod -S fchmodat -k perm_mod

# 锁定规则
-e 2
EOF

    # 启动auditd
    systemctl enable auditd
    systemctl restart auditd
}

# 设置文件权限
secure_file_permissions() {
    log "设置安全文件权限..."
    
    # 设置重要文件权限
    chmod 600 /etc/ssh/sshd_config
    chmod 644 /etc/passwd
    chmod 644 /etc/group
    chmod 640 /etc/shadow
    chown root:shadow /etc/shadow
    chmod 440 /etc/sudoers
    
    # 设置项目目录权限
    if [[ -d "/opt/ai-project" ]]; then
        chown -R aiproject:aiproject /opt/ai-project
        find /opt/ai-project -type d -exec chmod 755 {} \;
        find /opt/ai-project -type f -exec chmod 644 {} \;
        
        # 脚本文件需要执行权限
        find /opt/ai-project -name "*.sh" -exec chmod 755 {} \;
    fi
}

# 配置系统资源限制
setup_system_limits() {
    log "配置系统资源限制..."
    
    cat >> /etc/security/limits.conf << 'EOF'
# AI项目资源限制
aiproject soft nofile 65536
aiproject hard nofile 65536
aiproject soft nproc 4096
aiproject hard nproc 4096

# 防止fork bomb
* hard nproc 4096
EOF

    # 配置systemd用户限制
    mkdir -p /etc/systemd/user.conf.d
    cat > /etc/systemd/user.conf.d/limits.conf << 'EOF'
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=4096
EOF
}

# 配置内核安全参数
setup_kernel_security() {
    log "配置内核安全参数..."
    
    cat > /etc/sysctl.d/99-security.conf << 'EOF'
# 网络安全
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.tcp_syncookies = 1

# IPv6安全
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# 进程安全
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1

# 内存保护
vm.mmap_min_addr = 4096
EOF

    # 应用内核参数
    sysctl -p /etc/sysctl.d/99-security.conf
}

# 安装安全扫描工具
install_security_tools() {
    log "安装安全扫描工具..."
    
    # 安装必要的安全工具
    apt-get install -y \
        rkhunter \
        chkrootkit \
        lynis \
        clamav \
        clamav-daemon
    
    # 配置rkhunter
    rkhunter --update
    rkhunter --propupd
    
    # 更新ClamAV病毒库
    systemctl stop clamav-freshclam
    freshclam
    systemctl start clamav-freshclam
    systemctl enable clamav-freshclam
}

# 创建安全检查脚本
create_security_check_script() {
    log "创建安全检查脚本..."
    
    cat > /usr/local/bin/security-check.sh << 'EOF'
#!/bin/bash

# 安全检查脚本
LOG_FILE="/var/log/security-check.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "开始安全检查..."

# 检查fail2ban状态
log "检查fail2ban状态..."
fail2ban-client status

# 检查防火墙状态
log "检查防火墙状态..."
ufw status

# 检查可疑进程
log "检查可疑进程..."
ps aux | awk '{print $1,$2,$11}' | sort | uniq

# 检查网络连接
log "检查网络连接..."
netstat -tuln

# 检查最近登录
log "检查最近登录..."
last -10

# 检查sudo使用记录
log "检查sudo使用记录..."
grep sudo /var/log/auth.log | tail -10

# 检查系统负载
log "检查系统负载..."
uptime
df -h
free -h

log "安全检查完成"
EOF

    chmod +x /usr/local/bin/security-check.sh
}

# 设置定时任务
setup_cron_jobs() {
    log "设置安全相关定时任务..."
    
    # 为root用户添加定时任务
    (crontab -l 2>/dev/null; cat << 'EOF'
# 安全检查（每天凌晨2点）
0 2 * * * /usr/local/bin/security-check.sh

# rkhunter检查（每周日凌晨3点）
0 3 * * 0 /usr/bin/rkhunter --check --skip-keypress --report-warnings-only

# 系统更新检查（每天凌晨1点）
0 1 * * * /usr/bin/apt update && /usr/bin/unattended-upgrade
EOF
    ) | crontab -
}

# 主函数
main() {
    log "开始配置服务器安全策略..."
    
    check_root
    update_system
    setup_firewall
    setup_fail2ban
    harden_ssh
    setup_auto_updates
    setup_auditing
    secure_file_permissions
    setup_system_limits
    setup_kernel_security
    install_security_tools
    create_security_check_script
    setup_cron_jobs
    
    log "安全配置完成！"
    log "重要提醒："
    log "1. SSH root登录已禁用，请确保aiproject用户可以正常登录"
    log "2. 防火墙已启用，只开放了必要端口"
    log "3. fail2ban已配置，会自动封禁恶意IP"
    log "4. 请定期检查 /var/log/security-check.log 文件"
    log "5. 建议配置SSH密钥认证并禁用密码登录"
}

# 运行主函数
main "$@"