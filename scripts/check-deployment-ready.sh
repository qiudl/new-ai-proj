#!/bin/bash

# 部署就绪检查脚本
# 检查所有必需的配置和依赖项是否就绪

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/opt/new-ai-proj"
REQUIRED_SECRETS=(
    "TENCENT_CLOUD_HOST"
    "TENCENT_CLOUD_USER" 
    "TENCENT_CLOUD_SSH_KEY"
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
    "JWT_SECRET"
    "DOMAIN"
)

OPTIONAL_SECRETS=(
    "DINGTALK_WEBHOOK"
    "TENCENT_CLOUD_SECRET_ID"
    "TENCENT_CLOUD_SECRET_KEY"
    "SSL_EMAIL"
)

echo -e "${BLUE}🔍 检查部署就绪状态...${NC}"

# 函数：检查命令是否存在
check_command() {
    local cmd=$1
    if command -v $cmd >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $cmd 已安装${NC}"
        return 0
    else
        echo -e "${RED}❌ $cmd 未安装${NC}"
        return 1
    fi
}

# 函数：检查文件是否存在
check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file 存在${NC}"
        return 0
    else
        echo -e "${RED}❌ $file 不存在${NC}"
        return 1
    fi
}

# 函数：检查目录是否存在
check_directory() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir 目录存在${NC}"
        return 0
    else
        echo -e "${RED}❌ $dir 目录不存在${NC}"
        return 1
    fi
}

# 函数：检查端口是否开放
check_port() {
    local port=$1
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用${NC}"
        return 1
    else
        echo -e "${GREEN}✅ 端口 $port 可用${NC}"
        return 0
    fi
}

# 函数：检查环境变量
check_env_var() {
    local var_name=$1
    local is_required=$2
    
    if [ -n "${!var_name}" ]; then
        echo -e "${GREEN}✅ $var_name 已设置${NC}"
        return 0
    else
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}❌ $var_name 未设置（必需）${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $var_name 未设置（可选）${NC}"
            return 0
        fi
    fi
}

# 初始化检查计数器
total_checks=0
passed_checks=0
failed_checks=0

# 检查基本命令
echo -e "\n${BLUE}📋 检查基本命令...${NC}"
commands=("docker" "docker-compose" "git" "curl" "wget")
for cmd in "${commands[@]}"; do
    total_checks=$((total_checks + 1))
    if check_command $cmd; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# 检查Docker服务
echo -e "\n${BLUE}🐳 检查Docker服务...${NC}"
total_checks=$((total_checks + 1))
if systemctl is-active --quiet docker; then
    echo -e "${GREEN}✅ Docker服务运行中${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${RED}❌ Docker服务未运行${NC}"
    failed_checks=$((failed_checks + 1))
fi

# 检查项目文件
echo -e "\n${BLUE}📁 检查项目文件...${NC}"
files=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    ".env.production.template"
    "backend/Dockerfile"
    "frontend/Dockerfile"
)

for file in "${files[@]}"; do
    total_checks=$((total_checks + 1))
    if check_file "$file"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# 检查脚本文件
echo -e "\n${BLUE}📜 检查脚本文件...${NC}"
scripts=(
    "scripts/tencent-cloud-setup.sh"
    "scripts/deploy.sh"
    "scripts/backup.sh"
    "scripts/health-check.sh"
)

for script in "${scripts[@]}"; do
    total_checks=$((total_checks + 1))
    if check_file "$script"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# 检查GitHub Actions工作流
echo -e "\n${BLUE}⚙️ 检查GitHub Actions工作流...${NC}"
workflows=(
    ".github/workflows/ci.yml"
    ".github/workflows/cd.yml"
    ".github/workflows/deploy-tencent-cloud.yml"
)

for workflow in "${workflows[@]}"; do
    total_checks=$((total_checks + 1))
    if check_file "$workflow"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# 检查环境变量（如果.env文件存在）
if [ -f ".env.production" ]; then
    echo -e "\n${BLUE}🔐 检查环境变量...${NC}"
    source .env.production
    
    for var in "${REQUIRED_SECRETS[@]}"; do
        total_checks=$((total_checks + 1))
        if check_env_var "$var" "true"; then
            passed_checks=$((passed_checks + 1))
        else
            failed_checks=$((failed_checks + 1))
        fi
    done
    
    for var in "${OPTIONAL_SECRETS[@]}"; do
        total_checks=$((total_checks + 1))
        check_env_var "$var" "false"
        passed_checks=$((passed_checks + 1))
    done
else
    echo -e "\n${YELLOW}⚠️  .env.production 文件不存在，跳过环境变量检查${NC}"
fi

# 检查网络端口
echo -e "\n${BLUE}🌐 检查网络端口...${NC}"
ports=(80 443 3000 8080 5432)
for port in "${ports[@]}"; do
    total_checks=$((total_checks + 1))
    if check_port $port; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# 检查磁盘空间
echo -e "\n${BLUE}💾 检查磁盘空间...${NC}"
total_checks=$((total_checks + 1))
available_space=$(df / | tail -1 | awk '{print $4}')
required_space=5242880  # 5GB in KB

if [ "$available_space" -gt "$required_space" ]; then
    echo -e "${GREEN}✅ 磁盘空间充足 ($(($available_space / 1024 / 1024))GB 可用)${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${RED}❌ 磁盘空间不足 (需要至少5GB)${NC}"
    failed_checks=$((failed_checks + 1))
fi

# 检查内存
echo -e "\n${BLUE}🧠 检查内存...${NC}"
total_checks=$((total_checks + 1))
available_memory=$(free -m | awk 'NR==2{printf "%d", $7}')
required_memory=2048  # 2GB

if [ "$available_memory" -gt "$required_memory" ]; then
    echo -e "${GREEN}✅ 内存充足 (${available_memory}MB 可用)${NC}"
    passed_checks=$((passed_checks + 1))
else
    echo -e "${RED}❌ 内存不足 (需要至少2GB)${NC}"
    failed_checks=$((failed_checks + 1))
fi

# 显示检查结果摘要
echo -e "\n${BLUE}📊 检查结果摘要${NC}"
echo "=================================="
echo -e "总检查项目: $total_checks"
echo -e "${GREEN}✅ 通过: $passed_checks${NC}"
echo -e "${RED}❌ 失败: $failed_checks${NC}"

# 计算通过率
pass_rate=$((passed_checks * 100 / total_checks))

if [ $failed_checks -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有检查通过！项目已准备好部署。${NC}"
    exit 0
elif [ $pass_rate -ge 80 ]; then
    echo -e "\n${YELLOW}⚠️  大部分检查通过 ($pass_rate%)，但仍有一些问题需要解决。${NC}"
    exit 1
else
    echo -e "\n${RED}❌ 检查失败过多 ($pass_rate%)，请解决问题后再部署。${NC}"
    exit 1
fi