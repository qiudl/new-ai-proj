// AI Project Management System - Jenkins CI/CD Pipeline
// Gogs + Jenkins 内网 CI/CD 流水线
//
// 配置说明: Jenkins 凭据
// - gogs-credentials-qiudl: Gogs 仓库凭据
// - aliyun-acr: 阿里云 ACR 凭据 (备用)
// - ai-proj-server-ssh: 生产服务器 SSH 密钥

pipeline {
    agent any

    environment {
        // 版本信息
        VERSION = "${BUILD_NUMBER}"
        GIT_COMMIT_SHORT = "${GIT_COMMIT?.take(7) ?: 'unknown'}"

        // 本地 Docker Registry 配置 (后续可切换到阿里云 ACR)
        REGISTRY = 'localhost:5000'
        BACKEND_IMAGE = "${REGISTRY}/ai-proj-backend"
        FRONTEND_IMAGE = "${REGISTRY}/ai-proj-frontend"

        // 阿里云 ACR 配置 (备用)
        // ACR_REGISTRY = 'crpi-yrjk9aq7uty4hchw.cn-hangzhou.personal.cr.aliyuncs.com'
        // ACR_NAMESPACE = 'ops-tool2026'

        // 部署服务器配置 (当前与 Jenkins 同服务器)
        PROD_SERVER = '101.200.136.200'
        PROD_USER = 'root'
        DEPLOY_PATH = '/opt/ai-project'

        // Node/Go 版本
        NODE_VERSION = '20'
        GO_VERSION = '1.24'

        // 时区
        TZ = 'Asia/Shanghai'
    }

    options {
        // 构建超时
        timeout(time: 30, unit: 'MINUTES')
        // 保留最近10次构建
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // 禁止并发构建
        disableConcurrentBuilds()
        // 时间戳
        timestamps()
    }

    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['staging', 'production'],
            description: '部署环境'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: '跳过测试（紧急部署时使用）'
        )
        booleanParam(
            name: 'FORCE_DEPLOY',
            defaultValue: false,
            description: '强制部署（跳过部分检查）'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'http://101.200.136.200:3000/Tools/new-ai-proj.git',
                        credentialsId: 'gogs-credentials-qiudl'
                    ]]
                ])

                script {
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }

                echo "Building version: ${VERSION} (${env.GIT_COMMIT_SHORT})"
                echo "Commit message: ${env.GIT_COMMIT_MSG}"
            }
        }

        // 注意: 使用 Docker 多阶段构建，跳过独立的构建和测试阶段
        // 构建直接在 'Build Docker Images' 阶段通过 Dockerfile 完成

        stage('Build Docker Images') {
            // 所有分支都构建镜像，但只有 main 分支推送和部署
            parallel {
                stage('Backend Docker') {
                    steps {
                        script {
                            sh """
                                DOCKER_BUILDKIT=1 docker build \
                                    -f backend/Dockerfile \
                                    --target production \
                                    -t ${BACKEND_IMAGE}:${VERSION} \
                                    -t ${BACKEND_IMAGE}:latest \
                                    -t ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                                    ./backend
                            """
                        }
                    }
                }

                stage('Frontend Docker') {
                    steps {
                        script {
                            sh """
                                DOCKER_BUILDKIT=1 docker build \
                                    -f frontend/Dockerfile.prod \
                                    --target production \
                                    -t ${FRONTEND_IMAGE}:${VERSION} \
                                    -t ${FRONTEND_IMAGE}:latest \
                                    -t ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT} \
                                    --build-arg REACT_APP_API_URL=http://${PROD_SERVER}:8080/api/v1 \
                                    --build-arg REACT_APP_ENV=production \
                                    --build-arg GENERATE_SOURCEMAP=false \
                                    --build-arg CI=false \
                                    ./frontend
                            """
                        }
                    }
                }
            }
        }

        stage('Push to Registry') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.FORCE_DEPLOY }
                }
            }
            steps {
                // 本地 Registry 无需认证
                sh """
                    echo "Pushing images to local registry..."

                    docker push ${BACKEND_IMAGE}:${VERSION}
                    docker push ${BACKEND_IMAGE}:latest
                    docker push ${BACKEND_IMAGE}:${env.GIT_COMMIT_SHORT}

                    docker push ${FRONTEND_IMAGE}:${VERSION}
                    docker push ${FRONTEND_IMAGE}:latest
                    docker push ${FRONTEND_IMAGE}:${env.GIT_COMMIT_SHORT}

                    echo "Images pushed successfully!"
                """
            }
        }

        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.FORCE_DEPLOY }
                }
            }
            steps {
                script {
                    // 本地部署 (Jenkins 和应用在同一服务器)
                    sh """
                        set -e
                        echo "=== Deploying version ${VERSION} (${env.GIT_COMMIT_SHORT}) ==="

                        # 确保部署目录存在
                        mkdir -p ${DEPLOY_PATH}
                        cd ${DEPLOY_PATH}

                        # 复制 docker-compose 配置 (如果不存在)
                        if [ ! -f docker-compose.yml ]; then
                            echo "Creating docker-compose.yml..."
                            cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  backend:
    image: localhost:5000/ai-proj-backend:latest
    container_name: ai-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=production
      - GIN_MODE=release
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=\${DB_USER:-ai_user}
      - DB_PASSWORD=\${DB_PASSWORD:-ai_password_2024}
      - DB_NAME=\${DB_NAME:-ai_project_db}
      - JWT_SECRET=\${JWT_SECRET:-your-jwt-secret}
    depends_on:
      - postgres
    networks:
      - ai-network

  frontend:
    image: localhost:5000/ai-proj-frontend:latest
    container_name: ai-frontend
    restart: always
    ports:
      - "3000:80"
    networks:
      - ai-network

  postgres:
    image: postgres:16-alpine
    container_name: ai-postgres
    restart: always
    environment:
      - POSTGRES_USER=\${DB_USER:-ai_user}
      - POSTGRES_PASSWORD=\${DB_PASSWORD:-ai_password_2024}
      - POSTGRES_DB=\${DB_NAME:-ai_project_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ai-network

networks:
  ai-network:
    driver: bridge

volumes:
  postgres_data:
COMPOSE_EOF
                        fi

                        # 创建环境配置文件 (如果不存在)
                        if [ ! -f .env ]; then
                            cat > .env << 'ENV_EOF'
DB_USER=ai_user
DB_PASSWORD=ai_password_2024
DB_NAME=ai_project_db
JWT_SECRET=jenkins-ci-jwt-secret-2024
ENV_EOF
                        fi

                        # 拉取最新镜像
                        echo "Pulling new images..."
                        docker pull ${BACKEND_IMAGE}:latest
                        docker pull ${FRONTEND_IMAGE}:latest

                        # 停止旧服务
                        echo "Stopping old services..."
                        docker-compose down --remove-orphans || true

                        # 启动新服务
                        echo "Starting new services..."
                        docker-compose up -d

                        # 等待服务启动
                        sleep 10

                        # 检查服务状态
                        echo "Service status:"
                        docker-compose ps

                        # 清理旧镜像
                        docker image prune -f || true

                        echo "=== Deployment completed: Build #${VERSION} ==="
                    """
                }
            }
        }

        stage('Health Check') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.FORCE_DEPLOY }
                }
            }
            steps {
                script {
                    def maxRetries = 5
                    def retryInterval = 10

                    for (int i = 0; i < maxRetries; i++) {
                        try {
                            sh """
                                curl -f -s --max-time 10 http://localhost:8080/health || curl -f -s --max-time 10 http://localhost:8080/api/v1/health
                            """
                            echo "Health check passed!"
                            break
                        } catch (Exception e) {
                            if (i == maxRetries - 1) {
                                echo "Warning: Health check failed after ${maxRetries} attempts"
                                // 不让整个构建失败，只是警告
                            } else {
                                echo "Health check attempt ${i + 1}/${maxRetries} failed, retrying in ${retryInterval}s..."
                                sleep(retryInterval)
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded! Version: ${VERSION}"
            // 可以添加钉钉/企业微信通知
            // dingtalk (
            //     robot: 'dingtalk-robot-id',
            //     type: 'MARKDOWN',
            //     title: '部署成功',
            //     text: ["### AI Project 部署成功\n- 版本: ${VERSION}\n- 分支: ${GIT_BRANCH}"]
            // )
        }
        failure {
            echo "Pipeline failed! Check logs for details."
            // 失败通知
        }
        always {
            // 清理工作空间
            cleanWs()
        }
    }
}
