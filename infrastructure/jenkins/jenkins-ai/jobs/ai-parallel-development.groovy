// AI并行开发Pipeline Job DSL
// 定义AI专家协作的任务流水线

// AI任务协调器主任务
pipelineJob('AI-Task-Coordinator') {
    description('AI并行开发任务协调器 - 管理多AI专家的任务分配和执行')
    
    parameters {
        stringParam('PROJECT_ID', '1', 'Project ID in the task system')
        stringParam('TARGET_TASKS', '', 'Comma-separated task IDs to process (empty for auto-discovery)')
        choiceParam('AI_AGENTS', ['frontend,backend,devops', 'frontend,backend', 'backend,devops', 'all'], 'AI agents to activate')
        choiceParam('EXECUTION_MODE', ['parallel', 'sequential', 'dependency'], 'Task execution mode')
        booleanParam('DRY_RUN', false, 'Preview mode - analyze tasks without execution')
        booleanParam('FORCE_RESTART', false, 'Force restart interrupted tasks')
    }
    
    definition {
        cps {
            script('''
@Library('ai-development-lib') _

pipeline {
    agent any
    
    environment {
        AI_BACKEND_URL = "${env.AI_BACKEND_URL}"
        AI_MCP_URL = "${env.AI_MCP_URL}"
        PROJECT_ID = "${params.PROJECT_ID}"
        WORKSPACE_DIR = "/workspace"
        AI_LOG_LEVEL = "INFO"
    }
    
    stages {
        stage('Initialize AI Environment') {
            steps {
                script {
                    echo "🚀 初始化AI并行开发环境..."
                    
                    // 检查系统状态
                    sh '''
                        echo "检查后端API连接..."
                        curl -f ${AI_BACKEND_URL}/health || exit 1
                        
                        echo "检查MCP Bridge连接..."
                        curl -f ${AI_MCP_URL}/health || exit 1
                        
                        echo "检查数据库连接..."
                        python3 /var/jenkins_home/ai-scripts/check_db.py
                    '''
                    
                    // 获取项目任务信息
                    def taskInfo = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/get_project_tasks.py \\
                                --project-id ${params.PROJECT_ID} \\
                                --target-tasks "${params.TARGET_TASKS}"
                        """,
                        returnStdout: true
                    ).trim()
                    
                    env.TASK_INFO = taskInfo
                    echo "任务信息: ${taskInfo}"
                }
            }
        }
        
        stage('Analyze Task Dependencies') {
            steps {
                script {
                    echo "🔍 分析任务依赖关系..."
                    
                    def dependencyGraph = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/analyze_dependencies.py \\
                                --task-info '${env.TASK_INFO}' \\
                                --execution-mode ${params.EXECUTION_MODE}
                        """,
                        returnStdout: true
                    ).trim()
                    
                    env.DEPENDENCY_GRAPH = dependencyGraph
                    echo "依赖图: ${dependencyGraph}"
                    
                    // 生成执行计划
                    def executionPlan = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/generate_execution_plan.py \\
                                --dependency-graph '${env.DEPENDENCY_GRAPH}' \\
                                --ai-agents "${params.AI_AGENTS}" \\
                                --dry-run ${params.DRY_RUN}
                        """,
                        returnStdout: true
                    ).trim()
                    
                    env.EXECUTION_PLAN = executionPlan
                    echo "执行计划: ${executionPlan}"
                }
            }
        }
        
        stage('Launch AI Agents') {
            when {
                not { params.DRY_RUN }
            }
            parallel {
                stage('Frontend AI Agent') {
                    when {
                        expression { params.AI_AGENTS.contains('frontend') }
                    }
                    steps {
                        build job: 'AI-Frontend-Agent', parameters: [
                            string(name: 'EXECUTION_PLAN', value: env.EXECUTION_PLAN),
                            string(name: 'PROJECT_ID', value: params.PROJECT_ID),
                            booleanParam(name: 'FORCE_RESTART', value: params.FORCE_RESTART)
                        ]
                    }
                }
                
                stage('Backend AI Agent') {
                    when {
                        expression { params.AI_AGENTS.contains('backend') }
                    }
                    steps {
                        build job: 'AI-Backend-Agent', parameters: [
                            string(name: 'EXECUTION_PLAN', value: env.EXECUTION_PLAN),
                            string(name: 'PROJECT_ID', value: params.PROJECT_ID),
                            booleanParam(name: 'FORCE_RESTART', value: params.FORCE_RESTART)
                        ]
                    }
                }
                
                stage('DevOps AI Agent') {
                    when {
                        expression { params.AI_AGENTS.contains('devops') }
                    }
                    steps {
                        build job: 'AI-DevOps-Agent', parameters: [
                            string(name: 'EXECUTION_PLAN', value: env.EXECUTION_PLAN),
                            string(name: 'PROJECT_ID', value: params.PROJECT_ID),
                            booleanParam(name: 'FORCE_RESTART', value: params.FORCE_RESTART)
                        ]
                    }
                }
            }
        }
        
        stage('Monitor and Coordinate') {
            when {
                not { params.DRY_RUN }
            }
            steps {
                script {
                    echo "📊 监控AI Agent执行进度..."
                    
                    // 实时监控AI Agent状态
                    timeout(time: 60, unit: 'MINUTES') {
                        sh '''
                            python3 /var/jenkins_home/ai-scripts/monitor_agents.py \\
                                --execution-plan "${EXECUTION_PLAN}" \\
                                --project-id ${PROJECT_ID} \\
                                --check-interval 30
                        '''
                    }
                }
            }
        }
        
        stage('Aggregate Results') {
            steps {
                script {
                    echo "📋 汇总AI开发结果..."
                    
                    def results = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/aggregate_results.py \\
                                --project-id ${params.PROJECT_ID} \\
                                --execution-plan '${env.EXECUTION_PLAN}'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "汇总结果: ${results}"
                    
                    // 保存结果到工件
                    writeFile file: 'ai-development-results.json', text: results
                    archiveArtifacts artifacts: 'ai-development-results.json', allowEmptyArchive: false
                }
            }
        }
    }
    
    post {
        always {
            script {
                // 清理临时文件
                sh 'rm -f /tmp/ai-*'
                
                // 发送通知
                def status = currentBuild.currentResult
                def message = """
                🤖 AI并行开发任务完成
                
                项目ID: ${params.PROJECT_ID}
                执行模式: ${params.EXECUTION_MODE}
                AI专家: ${params.AI_AGENTS}
                状态: ${status}
                
                查看详情: ${BUILD_URL}
                """
                
                // Slack通知 (如果配置了)
                try {
                    slackSend(
                        channel: '#ai-development',
                        message: message,
                        color: status == 'SUCCESS' ? 'good' : 'danger'
                    )
                } catch (Exception e) {
                    echo "Slack通知失败: ${e.message}"
                }
            }
        }
        
        success {
            echo "✅ AI并行开发任务成功完成"
        }
        
        failure {
            echo "❌ AI并行开发任务执行失败"
            
            // 保存失败日志
            sh '''
                echo "保存失败日志到工件..."
                mkdir -p failure-logs
                cp /var/jenkins_home/logs/jenkins.log failure-logs/ || true
                python3 /var/jenkins_home/ai-scripts/collect_failure_logs.py \\
                    --project-id ${PROJECT_ID} \\
                    --output-dir failure-logs
            '''
            archiveArtifacts artifacts: 'failure-logs/**', allowEmptyArchive: true
        }
    }
}
            ''')
        }
    }
}

// Frontend AI专家任务
pipelineJob('AI-Frontend-Agent') {
    description('前端AI专家 - 负责React/TypeScript前端开发')
    
    parameters {
        stringParam('EXECUTION_PLAN', '', 'Execution plan from coordinator')
        stringParam('PROJECT_ID', '1', 'Project ID')
        booleanParam('FORCE_RESTART', false, 'Force restart')
    }
    
    definition {
        cps {
            script('''
pipeline {
    agent any
    
    environment {
        AI_AGENT_TYPE = "frontend"
        CLAUDE_CONFIG = "/var/jenkins_home/.claude"
        WORKSPACE_DIR = "/workspace/frontend"
    }
    
    stages {
        stage('Setup Frontend Environment') {
            steps {
                dir('${WORKSPACE_DIR}') {
                    sh '''
                        echo "🎨 设置前端AI开发环境..."
                        
                        # 检查Node.js环境
                        node --version
                        npm --version
                        
                        # 安装依赖 (如果需要)
                        if [ -f package.json ]; then
                            npm install --silent
                        fi
                        
                        # 检查TypeScript配置
                        if [ -f tsconfig.json ]; then
                            echo "TypeScript配置就绪"
                        fi
                    '''
                }
            }
        }
        
        stage('Execute Frontend Tasks') {
            steps {
                script {
                    def tasks = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/extract_agent_tasks.py \\
                                --execution-plan '${params.EXECUTION_PLAN}' \\
                                --agent-type frontend
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (tasks) {
                        echo "前端任务: ${tasks}"
                        
                        dir('${WORKSPACE_DIR}') {
                            sh """
                                echo "🚀 执行前端AI开发任务..."
                                
                                # 使用Claude Code执行任务
                                python3 /var/jenkins_home/ai-scripts/execute_claude_tasks.py \\
                                    --agent-type frontend \\
                                    --tasks '${tasks}' \\
                                    --project-id ${params.PROJECT_ID} \\
                                    --workspace-dir ${WORKSPACE_DIR}
                            """
                        }
                    } else {
                        echo "无前端任务需要执行"
                    }
                }
            }
        }
        
        stage('Frontend Quality Check') {
            steps {
                dir('${WORKSPACE_DIR}') {
                    sh '''
                        echo "🔍 执行前端质量检查..."
                        
                        # TypeScript类型检查
                        if [ -f tsconfig.json ]; then
                            npx tsc --noEmit --skipLibCheck
                        fi
                        
                        # ESLint检查
                        if [ -f .eslintrc.js ] || [ -f .eslintrc.json ]; then
                            npx eslint src --ext .ts,.tsx --max-warnings 0
                        fi
                        
                        # 构建测试
                        if [ -f package.json ]; then
                            npm run build || true
                        fi
                    '''
                }
            }
        }
    }
    
    post {
        always {
            dir('${WORKSPACE_DIR}') {
                sh '''
                    echo "保存前端开发结果..."
                    
                    # 收集构建产物
                    if [ -d build ]; then
                        tar -czf frontend-build.tar.gz build/
                    fi
                    
                    # 收集日志
                    if [ -f npm-debug.log ]; then
                        cp npm-debug.log ${WORKSPACE}/
                    fi
                '''
            }
            
            archiveArtifacts artifacts: 'frontend-build.tar.gz', allowEmptyArchive: true
        }
    }
}
            ''')
        }
    }
}

// Backend AI专家任务
pipelineJob('AI-Backend-Agent') {
    description('后端AI专家 - 负责Go后端API开发')
    
    parameters {
        stringParam('EXECUTION_PLAN', '', 'Execution plan from coordinator')
        stringParam('PROJECT_ID', '1', 'Project ID')
        booleanParam('FORCE_RESTART', false, 'Force restart')
    }
    
    definition {
        cps {
            script('''
pipeline {
    agent any
    
    environment {
        AI_AGENT_TYPE = "backend"
        WORKSPACE_DIR = "/workspace/backend"
        GOPATH = "/go"
        GO111MODULE = "on"
    }
    
    stages {
        stage('Setup Backend Environment') {
            steps {
                dir('${WORKSPACE_DIR}') {
                    sh '''
                        echo "🔧 设置后端AI开发环境..."
                        
                        # 检查Go环境
                        go version
                        
                        # 下载依赖
                        if [ -f go.mod ]; then
                            go mod download
                            go mod tidy
                        fi
                        
                        # 检查数据库连接
                        python3 /var/jenkins_home/ai-scripts/check_db.py
                    '''
                }
            }
        }
        
        stage('Execute Backend Tasks') {
            steps {
                script {
                    def tasks = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/extract_agent_tasks.py \\
                                --execution-plan '${params.EXECUTION_PLAN}' \\
                                --agent-type backend
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (tasks) {
                        echo "后端任务: ${tasks}"
                        
                        dir('${WORKSPACE_DIR}') {
                            sh """
                                echo "🚀 执行后端AI开发任务..."
                                
                                # 使用Claude Code执行任务
                                python3 /var/jenkins_home/ai-scripts/execute_claude_tasks.py \\
                                    --agent-type backend \\
                                    --tasks '${tasks}' \\
                                    --project-id ${params.PROJECT_ID} \\
                                    --workspace-dir ${WORKSPACE_DIR}
                            """
                        }
                    } else {
                        echo "无后端任务需要执行"
                    }
                }
            }
        }
        
        stage('Backend Quality Check') {
            steps {
                dir('${WORKSPACE_DIR}') {
                    sh '''
                        echo "🔍 执行后端质量检查..."
                        
                        # Go代码格式检查
                        go fmt ./...
                        
                        # Go代码静态分析
                        go vet ./...
                        
                        # 构建测试
                        go build -v ./...
                        
                        # 运行单元测试
                        go test -v ./... || true
                    '''
                }
            }
        }
    }
    
    post {
        always {
            dir('${WORKSPACE_DIR}') {
                sh '''
                    echo "保存后端开发结果..."
                    
                    # 收集测试结果
                    go test -json ./... > test-results.json || true
                    
                    # 收集覆盖率报告
                    go test -coverprofile=coverage.out ./... || true
                    if [ -f coverage.out ]; then
                        go tool cover -html=coverage.out -o coverage.html
                    fi
                '''
            }
            
            archiveArtifacts artifacts: 'test-results.json,coverage.*', allowEmptyArchive: true
        }
    }
}
            ''')
        }
    }
}

// DevOps AI专家任务
pipelineJob('AI-DevOps-Agent') {
    description('DevOps AI专家 - 负责基础设施和部署')
    
    parameters {
        stringParam('EXECUTION_PLAN', '', 'Execution plan from coordinator')
        stringParam('PROJECT_ID', '1', 'Project ID')
        booleanParam('FORCE_RESTART', false, 'Force restart')
    }
    
    definition {
        cps {
            script('''
pipeline {
    agent any
    
    environment {
        AI_AGENT_TYPE = "devops"
        WORKSPACE_DIR = "/workspace"
        DOCKER_BUILDKIT = "1"
    }
    
    stages {
        stage('Setup DevOps Environment') {
            steps {
                sh '''
                    echo "⚙️ 设置DevOps AI开发环境..."
                    
                    # 检查Docker环境
                    docker --version
                    docker-compose --version
                    
                    # 检查容器状态
                    docker ps
                '''
            }
        }
        
        stage('Execute DevOps Tasks') {
            steps {
                script {
                    def tasks = sh(
                        script: """
                            python3 /var/jenkins_home/ai-scripts/extract_agent_tasks.py \\
                                --execution-plan '${params.EXECUTION_PLAN}' \\
                                --agent-type devops
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (tasks) {
                        echo "DevOps任务: ${tasks}"
                        
                        dir('${WORKSPACE_DIR}') {
                            sh """
                                echo "🚀 执行DevOps AI任务..."
                                
                                # 使用Claude Code执行任务
                                python3 /var/jenkins_home/ai-scripts/execute_claude_tasks.py \\
                                    --agent-type devops \\
                                    --tasks '${tasks}' \\
                                    --project-id ${params.PROJECT_ID} \\
                                    --workspace-dir ${WORKSPACE_DIR}
                            """
                        }
                    } else {
                        echo "无DevOps任务需要执行"
                    }
                }
            }
        }
        
        stage('Infrastructure Validation') {
            steps {
                sh '''
                    echo "🔍 验证基础设施配置..."
                    
                    # 检查Docker Compose配置
                    if [ -f docker-compose.yml ]; then
                        docker-compose config
                    fi
                    
                    # 检查服务健康状态
                    python3 /var/jenkins_home/ai-scripts/check_services_health.py
                '''
            }
        }
    }
    
    post {
        always {
            sh '''
                echo "保存DevOps结果..."
                
                # 收集系统状态
                docker ps > docker-status.txt
                docker images > docker-images.txt
                
                # 收集日志
                docker-compose logs > docker-compose-logs.txt || true
            '''
            
            archiveArtifacts artifacts: 'docker-*.txt', allowEmptyArchive: true
        }
    }
}
            ''')
        }
    }
}