#!/bin/bash

# 自动化脚本：为腾讯云服务器添加新的SSH部署密钥
# 作者: Claude Agent
# 日期: $(date +%Y-%m-%d)

set -e

# 配置变量
SERVER_HOST="152.136.104.251"
SERVER_USER="ubuntu"
NEW_PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDAx22ZhbQXnIuafne0n1YX01234F2uY752lqkseu0Jp2CX6AsQtg5+W8I87xATsaHXGIn6PoS1/bs4Au56xD69ZZ59+Q6e4IedVHqbKPowTqhWa2XfOVS1k9YZgvoqqctBJZ5HNy+i5A3P83XUDFREJl9n2DetIOUnBcGXzGlqnYEMCiougQzbyWRN9KK/hO/euLmQQv05uuD+F8m/KTP81sDdTosNKhq4rUFB3ZGSVVY9xJWJMcboxRlUJgVfPjT4C0hh1IeDHofUeUfBLRrqswFKmRZLAbnhkIHH9excLxPmAh8ZDDx+QzJi/O/tkvmbKEYgW/cU/QRePe6aQi/PTZ4AoYAcACrXHQ6+RWtkEa4125cyACBuS2a+enJ868ML7eGP2dsH8KJrr7vBsSguOv4mcJ3iSpG5nP6fmV0NRFfUZxAOiMgDzz6nNZOvjmRjaQt/3SewSLjkENXe0Qinve0hZDG9kAe9Vv4BqCJ4tyHaRUtvRc4ONDSf+8dF22vvVzoZIAIYBrFkixjUs6S2EmjGwpiJnnJowBKzVkyHantJik+SkNuQZGwrgwIOuj44uH6SSglC4X6fAT8JjfeQAUQ+6mMvcmemURdliUkeBZSflT7kIwL1OrJJPAukGGnbcrfivxOQBuk2MbgUVou1jQM22hCcaQk4dBiwWHQ8KQ== github-actions-deploy-20250929"

echo "🔑 开始为服务器添加新的SSH部署密钥..."
echo "服务器: $SERVER_USER@$SERVER_HOST"
echo "请准备输入服务器密码"

echo -e "\n=== 第一步：备份现有authorized_keys ==="
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
    # 创建SSH目录（如果不存在）
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    
    # 备份现有的authorized_keys文件
    if [ -f ~/.ssh/authorized_keys ]; then
        cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ 已备份现有的authorized_keys文件"
    else
        echo "ℹ️ 未发现现有的authorized_keys文件，将创建新的"
    fi
EOF

echo -e "\n=== 第二步：添加新的公钥 ==="
ssh $SERVER_USER@$SERVER_HOST << EOF
    # 添加新的公钥到authorized_keys
    echo "$NEW_PUBLIC_KEY" >> ~/.ssh/authorized_keys
    
    # 设置正确的权限
    chmod 600 ~/.ssh/authorized_keys
    chmod 700 ~/.ssh
    
    # 去重复的密钥
    sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp
    mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys
    
    echo "✅ 新的SSH密钥已添加"
    echo "📊 当前authorized_keys文件包含 \$(wc -l < ~/.ssh/authorized_keys) 个密钥"
EOF

echo -e "\n=== 第三步：验证SSH密钥配置 ==="
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
    echo "=== SSH目录权限 ==="
    ls -la ~/.ssh/
    
    echo -e "\n=== authorized_keys内容预览 ==="
    echo "文件行数: $(wc -l < ~/.ssh/authorized_keys)"
    echo "最后一行（新添加的密钥）:"
    tail -1 ~/.ssh/authorized_keys | cut -c1-80
    echo "..."
EOF

echo -e "\n✅ SSH密钥添加完成！"
echo "🔧 接下来更新GitHub Secret并测试连接..."