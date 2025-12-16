// AI Project Management System - Jenkins CI/CD Pipeline
// 配置说明: 请在 Jenkins 中配置以下凭据
// - aliyun-acr: 阿里云 ACR 凭据 (用户名/密码)
// - prod-server-ssh: 生产服务器 SSH 密钥
// - gogs-credentials: Gogs 仓库凭据 (可选)

pipeline {
    agent any

    environment {
        // 版本信息
        VERSION = "${BUILD_NUMBER}"

        // 阿里云 ACR 配置
        ACR_REGISTRY = 'crpi-yrjk9aq7uty4hchw.cn-hangzhou.personal.cr.aliyuncs.com'
        ACR_NAMESPACE = 'ops-tool2026'
        BACKEND_IMAGE = "${ACR_REGISTRY}/${ACR_NAMESPACE}/ai-proj-backend"
        FRONTEND_IMAGE = "${ACR_REGISTRY}/${ACR_NAMESPACE}/ai-proj-frontend"

        // 部署服务器配置
        PROD_SERVER = '152.136.104.251'
        PROD_USER = 'ubuntu'
        DEPLOY_PATH = '/home/ubuntu/apps/ai-proj'

        // Node/Go 版本
        NODE_VERSION = '20'
        GO_VERSION = '1.23'

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
                        credentialsId: 'gogs-credentials'
                    ]]
                ])

                script {
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                }

                echo "Building version: ${VERSION}"
                echo "Commit message: ${env.GIT_COMMIT_MSG}"
            }
        }

        stage('Parallel Build') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            script {
                                // 使用 Go 容器构建
                                docker.image("golang:${GO_VERSION}-alpine").inside('-v /go/pkg/mod:/go/pkg/mod') {
                                    sh '''
                                        export GOPROXY=https://goproxy.cn,direct
                                        go mod download
                                        CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
                                            -ldflags="-w -s -X main.Version=${VERSION}" \
                                            -o main .
                                    '''
                                }
                            }

                            // 打包后端
                            sh '''
                                tar -czf ../backend-${VERSION}.tar.gz \
                                    main Dockerfile migrations/ config/
                            '''
                        }
                    }
                }

                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            script {
                                // 使用 Node 容器构建
                                docker.image("node:${NODE_VERSION}-alpine").inside {
                                    sh '''
                                        npm config set registry https://registry.npmmirror.com
                                        npm ci

                                        export REACT_APP_API_URL=http://${PROD_SERVER}:8080/api/v1
                                        export REACT_APP_ENV=production
                                        export GENERATE_SOURCEMAP=false
                                        export NODE_ENV=production

                                        npm run build
                                    '''
                                }
                            }

                            // 打包前端
                            sh '''
                                tar -czf ../frontend-${VERSION}.tar.gz \
                                    build/ nginx.conf Dockerfile.prod
                            '''
                        }
                    }
                }
            }
        }

        stage('Test') {
            when {
                expression { !params.SKIP_TESTS }
            }
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            script {
                                docker.image("golang:${GO_VERSION}-alpine").inside {
                                    sh '''
                                        export GOPROXY=https://goproxy.cn,direct
                                        go test -v -race ./... -coverprofile=coverage.out
                                    '''
                                }
                            }
                        }
                    }
                    post {
                        always {
                            publishCoverage adapters: [coberturaAdapter(path: 'backend/coverage.out')]
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            script {
                                docker.image("node:${NODE_VERSION}-alpine").inside {
                                    sh '''
                                        npm config set registry https://registry.npmmirror.com
                                        npm ci
                                        npm test -- --coverage --watchAll=false
                                    '''
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.FORCE_DEPLOY }
                }
            }
            parallel {
                stage('Backend Docker') {
                    steps {
                        script {
                            sh """
                                docker build \
                                    -f deploy/tencent-cloud/Dockerfile.backend \
                                    -t ${BACKEND_IMAGE}:${VERSION} \
                                    -t ${BACKEND_IMAGE}:latest \
                                    .
                            """
                        }
                    }
                }

                stage('Frontend Docker') {
                    steps {
                        script {
                            sh """
                                docker build \
                                    -f deploy/tencent-cloud/Dockerfile.frontend \
                                    -t ${FRONTEND_IMAGE}:${VERSION} \
                                    -t ${FRONTEND_IMAGE}:latest \
                                    --build-arg REACT_APP_API_URL=https://proj.joylodging.com/api \
                                    .
                            """
                        }
                    }
                }
            }
        }

        stage('Push to ACR') {
            when {
                anyOf {
                    branch 'main'
                    expression { params.FORCE_DEPLOY }
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aliyun-acr',
                    usernameVariable: 'ACR_USER',
                    passwordVariable: 'ACR_PASS'
                )]) {
                    sh """
                        echo "\${ACR_PASS}" | docker login -u "\${ACR_USER}" --password-stdin ${ACR_REGISTRY}

                        docker push ${BACKEND_IMAGE}:${VERSION}
                        docker push ${BACKEND_IMAGE}:latest

                        docker push ${FRONTEND_IMAGE}:${VERSION}
                        docker push ${FRONTEND_IMAGE}:latest

                        docker logout ${ACR_REGISTRY}
                    """
                }
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
                    sshagent(['prod-server-ssh']) {
                        withCredentials([usernamePassword(
                            credentialsId: 'aliyun-acr',
                            usernameVariable: 'ACR_USER',
                            passwordVariable: 'ACR_PASS'
                        )]) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_SERVER} << DEPLOY_SCRIPT
                                    set -e

                                    echo "=== Deploying version ${VERSION} ==="

                                    # 登录 ACR
                                    echo "Logging into ACR..."
                                    echo "${ACR_PASS}" | docker login -u "${ACR_USER}" --password-stdin ${ACR_REGISTRY}

                                    # 拉取新镜像
                                    echo "Pulling new images..."
                                    docker pull ${BACKEND_IMAGE}:${VERSION}
                                    docker pull ${FRONTEND_IMAGE}:${VERSION}

                                    # 进入部署目录
                                    cd ${DEPLOY_PATH}

                                    # 更新 docker-compose 中的镜像版本
                                    export IMAGE_TAG=${VERSION}
                                    export BACKEND_IMAGE=${BACKEND_IMAGE}
                                    export FRONTEND_IMAGE=${FRONTEND_IMAGE}

                                    # 重启服务
                                    echo "Restarting services..."
                                    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
                                    docker-compose -f docker-compose.prod.yml up -d

                                    # 等待服务启动
                                    sleep 15

                                    # 清理旧镜像
                                    echo "Cleaning up old images..."
                                    docker image prune -f

                                    echo "=== Deployment completed: Build #${VERSION} ==="
DEPLOY_SCRIPT
                            """
                        }
                    }
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
                                curl -f -s --max-time 10 https://proj.joylodging.com/api/v1/health
                            """
                            echo "Health check passed!"
                            break
                        } catch (Exception e) {
                            if (i == maxRetries - 1) {
                                echo "Warning: Health check failed after ${maxRetries} attempts"
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
