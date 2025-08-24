FROM jenkins/jenkins:lts-jdk17

USER root
# 可选：为控制器安装 docker CLI（某些维护任务/脚本会用到；流水线建议使用 Docker Agent）
RUN apt-get update \
    && apt-get install -y curl gnupg2 ca-certificates lsb-release \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(. /etc/os-release; echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# 安装插件
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# 拷贝 JCasC 配置与初始化脚本
COPY casc/ /usr/share/jenkins/ref/casc_configs/
COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/

USER jenkins

