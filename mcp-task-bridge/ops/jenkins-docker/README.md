# Jenkins Docker Agent 配置

## 当前状态 ✅
- **Jenkins**: 运行在 http://localhost:8080 
- **Docker in Docker (dind)**: 运行在 tcp://dind:2375 (内部) 和 tcp://localhost:2375 (外部)
- **状态**: Jenkins 控制器已启动，但需要手动配置 Docker Cloud

## 手动配置 Docker Cloud

由于 JCasC 配置遇到问题，请按以下步骤手动配置：

### 1. 登录 Jenkins
- 访问: http://localhost:8080
- 用户名/密码：你在 `.env` 文件中设置的 `JENKINS_ADMIN_ID` 和 `JENKINS_ADMIN_PASSWORD`

### 2. 配置 Docker Cloud
1. 进入 **Manage Jenkins** → **Manage Nodes and Clouds** → **Configure Clouds**
2. 点击 **Add a new cloud** → **Docker**
3. 配置如下：
   - **Name**: `docker`
   - **Docker Host URI**: `tcp://dind:2375`
   - 点击 **Test Connection** 验证连接

### 3. 添加 Docker Agent Templates
点击 **Docker Agent templates** → **Add Docker Template**：

#### 基础 Agent 模板:
- **Labels**: `docker`
- **Docker Image**: `jenkins/inbound-agent:alpine-jdk17`
- **Instance Capacity**: `10`
- **Remote File System Root**: `/home/jenkins/agent`
- **Connect method**: `Connect with JNLP`
- **User**: `jenkins`
- **Pull strategy**: `Pull once and update latest`

#### Docker CLI Agent 模板 (需要先构建镜像):
```bash
# 如果网络正常，构建 Docker CLI agent 镜像
docker build -t local/jenkins-docker-cli-agent:latest -f ops/jenkins-docker/agent/Dockerfile .

# 将镜像推送到 dind (可选)
DID=$(docker compose -f ops/jenkins-docker/docker-compose.yml ps -q dind)
docker save local/jenkins-docker-cli-agent:latest | docker exec -i "$DID" docker load
```

- **Labels**: `docker-cli`
- **Docker Image**: `local/jenkins-docker-cli-agent:latest`
- **Instance Capacity**: `5`
- **Remote File System Root**: `/home/jenkins/agent`
- **Connect method**: `Connect with JNLP`
- **User**: `jenkins`
- **Environment Variables**: `DOCKER_HOST=tcp://dind:2375`

## 测试流水线

### 基础测试 (label: docker)
```groovy
pipeline {
  agent { label 'docker' }
  options { timestamps() }
  stages {
    stage('Test') {
      steps { 
        sh 'echo "Hello from Docker agent"'
        sh 'uname -a && java -version'
      }
    }
  }
}
```

### Docker CLI 测试 (label: docker-cli) 
```groovy
pipeline {
  agent { label 'docker-cli' }
  options { timestamps() }
  stages {
    stage('Docker Test') {
      steps {
        sh 'docker version'
        sh 'docker run --rm alpine:3.19 echo "Hello from Docker in Jenkins"'
      }
    }
  }
}
```

## 故障排除

### Jenkins 启动失败
- 检查日志: `docker compose -f ops/jenkins-docker/docker-compose.yml logs jenkins`
- 检查环境变量: 确保 `.env` 文件存在且包含有效的管理员凭据

### Docker 连接问题
- 验证 dind 容器运行: `docker compose -f ops/jenkins-docker/docker-compose.yml ps`
- 测试 Docker API: `curl http://localhost:2375/version`

### Agent 启动失败
- 检查镜像是否存在: `docker images | grep jenkins`
- 检查 dind 日志: `docker compose -f ops/jenkins-docker/docker-compose.yml logs dind`

## 服务管理命令

```bash
# 启动服务
docker compose -f ops/jenkins-docker/docker-compose.yml up -d

# 停止服务
docker compose -f ops/jenkins-docker/docker-compose.yml down

# 查看状态
docker compose -f ops/jenkins-docker/docker-compose.yml ps

# 查看日志
docker compose -f ops/jenkins-docker/docker-compose.yml logs -f jenkins
```
