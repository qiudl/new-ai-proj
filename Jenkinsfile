// AI Project Management System - Jenkins CI/CD Pipeline
// 配置说明: 请在 Jenkins 中配置以下凭据
// - docker-registry-url: Docker 仓库地址
// - docker-registry-credentials: Docker 仓库凭据
// - github-ssh-key: GitHub SSH 密钥
// - prod-server-ssh-key: 生产服务器 SSH 密钥
// - prod-server-ip: 生产服务器 IP (Secret text)

pipeline {
    agent any

    environment {
        // 版本信息
        VERSION = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"

        // Docker 镜像配置
        DOCKER_REGISTRY = credentials('docker-registry-url')
        BACKEND_IMAGE = "${DOCKER_REGISTRY}/ai-proj-backend"
        FRONTEND_IMAGE = "${DOCKER_REGISTRY}/ai-proj-frontend"

        // 部署服务器配置 (从 Jenkins 凭据获取)
        PROD_SERVER = credentials('prod-server-ip')
        PROD_USER = 'ubuntu'
        DEPLOY_PATH = '/home/ubuntu/apps/new-ai-proj'

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
                        url: 'git@github.com:qiudl/new-ai-proj.git',
                        credentialsId: 'github-ssh-key'
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
                        dir('backend') {
                            script {
                                def backendImage = docker.build(
                                    "${BACKEND_IMAGE}:${VERSION}",
                                    "--target production -f Dockerfile ."
                                )

                                docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                                    backendImage.push()
                                    backendImage.push('latest')
                                }
                            }
                        }
                    }
                }

                stage('Frontend Docker') {
                    steps {
                        dir('frontend') {
                            script {
                                def frontendImage = docker.build(
                                    "${FRONTEND_IMAGE}:${VERSION}",
                                    "--build-arg REACT_APP_API_URL=http://${PROD_SERVER}:8080/api/v1 -f Dockerfile.prod ."
                                )

                                docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                                    frontendImage.push()
                                    frontendImage.push('latest')
                                }
                            }
                        }
                    }
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
                    def deployEnv = params.DEPLOY_ENV ?: 'staging'

                    sshagent(['prod-server-ssh-key']) {
                        // 上传部署包
                        sh """
                            scp -o StrictHostKeyChecking=no \
                                backend-${VERSION}.tar.gz \
                                frontend-${VERSION}.tar.gz \
                                docker-compose.prod.yml \
                                ${PROD_USER}@${PROD_SERVER}:~/
                        """

                        // 执行部署
                        sh """
                            ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_SERVER} << 'DEPLOY_SCRIPT'
                                set -e

                                RELEASE_DIR="${DEPLOY_PATH}/releases/release_\$(date +%Y%m%d_%H%M%S)"
                                mkdir -p \$RELEASE_DIR

                                # 解压部署包
                                tar -xzf ~/backend-${VERSION}.tar.gz -C \$RELEASE_DIR/
                                tar -xzf ~/frontend-${VERSION}.tar.gz -C \$RELEASE_DIR/
                                cp ~/docker-compose.prod.yml \$RELEASE_DIR/docker-compose.yml

                                # 复制环境配置
                                cp ${DEPLOY_PATH}/shared/config/.env.production \$RELEASE_DIR/.env 2>/dev/null || true

                                # 备份并切换版本
                                if [ -L ${DEPLOY_PATH}/current ]; then
                                    cp -P ${DEPLOY_PATH}/current ${DEPLOY_PATH}/previous 2>/dev/null || true
                                fi
                                ln -sfn \$RELEASE_DIR ${DEPLOY_PATH}/current

                                # 重启服务
                                cd ${DEPLOY_PATH}/current
                                docker compose down --remove-orphans || true
                                docker compose up -d --build

                                # 等待服务启动
                                sleep 30

                                # 清理旧版本
                                cd ${DEPLOY_PATH}/releases
                                ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true
                                rm -f ~/backend-*.tar.gz ~/frontend-*.tar.gz

                                echo "Deployment completed successfully!"
DEPLOY_SCRIPT
                        """
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
                    def maxRetries = 10
                    def retryInterval = 10

                    for (int i = 0; i < maxRetries; i++) {
                        try {
                            sh """
                                curl -f -s --max-time 10 http://${PROD_SERVER}:8080/api/v1/health
                            """
                            echo "Health check passed!"
                            break
                        } catch (Exception e) {
                            if (i == maxRetries - 1) {
                                error "Health check failed after ${maxRetries} attempts"
                            }
                            echo "Health check attempt ${i + 1}/${maxRetries} failed, retrying in ${retryInterval}s..."
                            sleep(retryInterval)
                        }
                    }
                }
            }
        }

        stage('Rollback') {
            when {
                expression { currentBuild.result == 'FAILURE' }
            }
            steps {
                script {
                    sshagent(['prod-server-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_SERVER} << 'ROLLBACK_SCRIPT'
                                if [ -L ${DEPLOY_PATH}/previous ]; then
                                    echo "Rolling back to previous version..."
                                    mv ${DEPLOY_PATH}/current ${DEPLOY_PATH}/failed
                                    mv ${DEPLOY_PATH}/previous ${DEPLOY_PATH}/current
                                    cd ${DEPLOY_PATH}/current
                                    docker compose up -d --build
                                    echo "Rollback completed"
                                else
                                    echo "No previous version available for rollback"
                                fi
ROLLBACK_SCRIPT
                        """
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
