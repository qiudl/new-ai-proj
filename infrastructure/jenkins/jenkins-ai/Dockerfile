# AI增强的Jenkins镜像
# 专为AI并行开发优化

FROM jenkins/jenkins:lts-jdk17

USER root

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y \
        curl \
        gnupg2 \
        ca-certificates \
        lsb-release \
        python3 \
        python3-pip \
        nodejs \
        npm \
        jq \
        vim \
        git \
        wget \
    && rm -rf /var/lib/apt/lists/*

# 安装Docker CLI
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(. /etc/os-release; echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# 安装Claude Code CLI (模拟)
# 注意：实际部署时需要替换为真实的安装方法
RUN mkdir -p /usr/local/bin \
    && echo '#!/bin/bash\necho "Claude Code CLI placeholder - replace with actual installation"' > /usr/local/bin/claude \
    && chmod +x /usr/local/bin/claude

# 安装Python依赖 (用于AI脚本)
RUN pip3 install --no-cache-dir \
        requests \
        psycopg2-binary \
        pyyaml \
        click \
        asyncio \
        aiohttp

# 安装Jenkins插件
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# 复制配置文件
COPY casc/ /usr/share/jenkins/ref/casc_configs/
COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/
COPY jobs/ /usr/share/jenkins/ref/jobs/

# 复制AI开发脚本
COPY ai-scripts/ /usr/share/jenkins/ref/ai-scripts/
RUN chmod +x /usr/share/jenkins/ref/ai-scripts/*.sh

# 设置环境变量
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc_configs/jenkins.yaml
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Xmx2g -Xms1g"

USER jenkins

# 健康检查脚本
COPY healthcheck.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/healthcheck.sh
USER jenkins

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh