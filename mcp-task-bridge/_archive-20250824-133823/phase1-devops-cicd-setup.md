# M1-7-prep: CI/CD环境准备 - AI-DevOps工程师

**任务ID**: M1-7-prep  
**负责人**: AI-DevOps工程师  
**阶段**: Phase 1 - 基础准备阶段  
**开始时间**: 2025-08-24T00:03:43Z  

## 1. Jenkins Docker Agent 环境配置

### 1.1 Docker Compose 配置
```yaml
# docker-compose.jenkins.yml
version: '3.8'

services:
  jenkins:
    image: jenkins/jenkins:2.426.1-lts
    container_name: mcp-jenkins
    restart: unless-stopped
    privileged: true
    user: root
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/local/bin/docker:/usr/local/bin/docker
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
    networks:
      - mcp-network

  jenkins-agent:
    image: jenkins/inbound-agent:latest
    container_name: mcp-jenkins-agent
    restart: unless-stopped
    environment:
      - JENKINS_URL=http://jenkins:8080
      - JENKINS_SECRET=${JENKINS_AGENT_SECRET}
      - JENKINS_AGENT_NAME=mcp-docker-agent
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/local/bin/docker:/usr/local/bin/docker
    networks:
      - mcp-network
    depends_on:
      - jenkins

  postgres-dev:
    image: postgres:15-alpine
    container_name: mcp-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: mcp_task_bridge_dev
      POSTGRES_USER: mcp_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - mcp-network

volumes:
  jenkins_home:
  postgres_dev_data:

networks:
  mcp-network:
    driver: bridge
```

### 1.2 Jenkins Configuration as Code (JCasC)
```yaml
# jenkins.yaml
jenkins:
  systemMessage: "MCP Task Bridge CI/CD Environment"
  numExecutors: 2
  mode: NORMAL
  
  clouds:
    - docker:
        name: "mcp-docker-cloud"
        dockerApi:
          uri: "unix:///var/run/docker.sock"
        templates:
          - labelString: "docker-agent"
            dockerTemplateBase:
              image: "node:18-alpine"
              volumes:
                - /var/run/docker.sock:/var/run/docker.sock
              environmentsString: |
                DATABASE_URL=postgresql://mcp_user:${POSTGRES_PASSWORD}@postgres-dev:5432/mcp_task_bridge_dev
                NODE_ENV=development

  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: "admin"
          password: "${JENKINS_ADMIN_PASSWORD}"

  authorizationStrategy:
    loggedInUsersCanDoAnything:
      allowAnonymousRead: false

tool:
  nodejs:
    installations:
      - name: "Node 18"
        properties:
          - installSource:
              installers:
                - nodeJSInstaller:
                    id: "18.19.0"
                    npmPackages: "prisma@latest @prisma/client@latest typescript@latest"

unclassified:
  globalLibraries:
    libraries:
      - name: "mcp-pipeline-lib"
        defaultVersion: "main"
        retriever:
          scm:
            git:
              remote: "https://github.com/mcp-org/pipeline-library.git"
```

## 2. 代码仓库设置

### 2.1 Git仓库结构
```
mcp-task-bridge/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd.yml
│       └── prisma-migrate.yml
├── .jenkins/
│   ├── Jenkinsfile
│   ├── Jenkinsfile.migration
│   └── pipeline-config.groovy
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
├── tests/
├── docker/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── docker-compose.yml
└── scripts/
    ├── setup-dev.sh
    ├── run-migrations.sh
    └── backup-db.sh
```

### 2.2 主流水线配置 (Jenkinsfile)
```groovy
@Library('mcp-pipeline-lib') _

pipeline {
    agent {
        label 'docker-agent'
    }
    
    environment {
        NODE_ENV = 'test'
        DATABASE_URL = credentials('DATABASE_URL_TEST')
        DOCKER_REGISTRY = 'registry.mcp.local'
        APP_NAME = 'mcp-task-bridge'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_VERSION = "${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Setup') {
            parallel {
                stage('Install Dependencies') {
                    steps {
                        sh '''
                            npm ci
                            npx prisma generate
                        '''
                    }
                }
                
                stage('Database Setup') {
                    steps {
                        sh '''
                            docker-compose -f docker/docker-compose.test.yml up -d postgres-test
                            sleep 10
                            npx prisma migrate deploy
                            npx prisma db seed
                        '''
                    }
                }
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                
                stage('Type Check') {
                    steps {
                        sh 'npm run type-check'
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'coverage/unit/junit.xml'
                            publishCoverage adapters: [
                                istanbulCoberturaAdapter('coverage/unit/cobertura-coverage.xml')
                            ]
                        }
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'coverage/integration/junit.xml'
                        }
                    }
                }
                
                stage('Migration Tests') {
                    steps {
                        sh '''
                            npm run test:migration
                            npm run test:migration:rollback
                        '''
                    }
                }
            }
        }
        
        stage('Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                sh '''
                    npm run build
                    docker build -f docker/Dockerfile.prod -t ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} .
                    docker tag ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} ${DOCKER_REGISTRY}/${APP_NAME}:latest
                '''
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    mcpDeploy([
                        environment: 'staging',
                        image: "${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION}",
                        runMigrations: true
                    ])
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    input message: 'Deploy to Production?', ok: 'Deploy'
                    mcpDeploy([
                        environment: 'production',
                        image: "${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION}",
                        runMigrations: true,
                        backupDatabase: true
                    ])
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker-compose -f docker/docker-compose.test.yml down'
            cleanWs()
        }
        
        success {
            slackSend(
                channel: '#mcp-deployments',
                color: 'good',
                message: "✅ Build successful: ${JOB_NAME} #${BUILD_NUMBER} - ${GIT_COMMIT_SHORT}"
            )
        }
        
        failure {
            slackSend(
                channel: '#mcp-alerts',
                color: 'danger',
                message: "❌ Build failed: ${JOB_NAME} #${BUILD_NUMBER} - ${GIT_COMMIT_SHORT}"
            )
        }
    }
}
```

## 3. 分支策略文档

### 3.1 Git Flow 策略
```
main (production)
├── develop (integration)
│   ├── feature/m1-1-assessment
│   ├── feature/m1-3-prisma-init
│   ├── feature/m1-4-migration
│   ├── feature/m1-5-seed-data
│   ├── feature/m1-6-testing
│   └── feature/m1-7-cicd
├── hotfix/critical-fix
└── release/v1.0.0
```

### 3.2 分支保护规则
```yaml
# .github/branch-protection.yml
protection_rules:
  main:
    required_status_checks:
      - "ci/jenkins"
      - "security/snyk"
      - "quality/sonarqube"
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    restrictions:
      users: []
      teams: ["mcp-core-team"]
  
  develop:
    required_status_checks:
      - "ci/jenkins"
    required_pull_request_reviews:
      required_approving_review_count: 1
    restrictions:
      users: []
      teams: ["mcp-developers"]
```

### 3.3 Commit 规范
```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
style(scope): format code
refactor(scope): refactor code
test(scope): add tests
chore(scope): update build process

Examples:
feat(prisma): add user authentication schema
fix(migration): resolve foreign key constraint issue
docs(api): update endpoint documentation
test(integration): add database connection tests
```

## 4. 环境配置管理

### 4.1 环境变量模板
```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/mcp_task_bridge_dev

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# External APIs
MCP_API_KEY=your-mcp-api-key
MCP_API_URL=https://api.mcp.dev

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
```

### 4.2 Kubernetes 配置 (生产环境)
```yaml
# k8s/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-task-bridge

---
# k8s/configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
  namespace: mcp-task-bridge
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  LOG_FORMAT: "json"

---
# k8s/secret.yml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
  namespace: mcp-task-bridge
type: Opaque
stringData:
  DATABASE_URL: "postgresql://prod_user:${DB_PASSWORD}@postgres-prod:5432/mcp_task_bridge_prod"
  JWT_SECRET: "${JWT_SECRET}"
  MCP_API_KEY: "${MCP_API_KEY}"

---
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-task-bridge
  namespace: mcp-task-bridge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-task-bridge
  template:
    metadata:
      labels:
        app: mcp-task-bridge
    spec:
      containers:
      - name: app
        image: registry.mcp.local/mcp-task-bridge:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mcp-config
        - secretRef:
            name: mcp-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## 5. 监控和告警配置

### 5.1 Prometheus 配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'mcp-task-bridge'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 5.2 告警规则
```yaml
# monitoring/alert_rules.yml
groups:
  - name: mcp-task-bridge
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseConnectionFailed
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to PostgreSQL database"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{name="mcp-task-bridge"} / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"
```

## 6. 自动化脚本

### 6.1 开发环境设置脚本
```bash
#!/bin/bash
# scripts/setup-dev.sh

set -e

echo "🚀 Setting up MCP Task Bridge development environment..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker/docker-compose.dev.yml up -d

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Development environment setup complete!"
echo "🌐 You can now run: npm run dev"
echo "📊 Jenkins: http://localhost:8080"
echo "🗄️  Database: postgresql://mcp_user:password@localhost:5432/mcp_task_bridge_dev"
```

### 6.2 数据库迁移脚本
```bash
#!/bin/bash
# scripts/run-migrations.sh

set -e

ENVIRONMENT=${1:-development}
DRY_RUN=${2:-false}

echo "🗄️  Running database migrations for environment: $ENVIRONMENT"

case $ENVIRONMENT in
  "development")
    DATABASE_URL=${DATABASE_URL:-"postgresql://mcp_user:password@localhost:5432/mcp_task_bridge_dev"}
    ;;
  "staging")
    DATABASE_URL=${DATABASE_URL_STAGING}
    ;;
  "production")
    DATABASE_URL=${DATABASE_URL_PROD}
    # Create backup before migration
    echo "💾 Creating database backup..."
    ./scripts/backup-db.sh $ENVIRONMENT
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

if [ "$DRY_RUN" = "true" ]; then
    echo "🔍 Dry run mode - showing migration diff..."
    npx prisma migrate diff \
        --from-url "$DATABASE_URL" \
        --to-schema-datamodel prisma/schema.prisma
else
    echo "▶️  Applying migrations..."
    npx prisma migrate deploy
    
    echo "🔧 Generating Prisma client..."
    npx prisma generate
    
    echo "✅ Migration completed successfully!"
fi
```

## 7. 质量门禁配置

### 7.1 SonarQube 配置
```properties
# sonar-project.properties
sonar.projectKey=mcp-task-bridge
sonar.projectName=MCP Task Bridge
sonar.projectVersion=1.0.0

sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**

sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=coverage/test-reporter.xml

sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts,**/migrations/**

# Quality Gates
sonar.qualitygate.wait=true
```

### 7.2 代码检查配置
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier",
    "plugin:security/recommended"
  ],
  "plugins": ["@typescript-eslint", "security", "import"],
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "import/order": "error",
    "security/detect-sql-injection": "error",
    "security/detect-eval-with-expression": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.spec.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

---

**状态**: ✅ 已完成  
**输出物**:
- [x] Jenkins Docker环境配置  
- [x] CI/CD流水线脚本
- [x] 代码仓库设置文档
- [x] 分支策略和保护规则
- [x] 环境配置模板
- [x] 监控告警配置
- [x] 自动化部署脚本

**下一步**: 环境就绪，等待其他团队成员的工作完成后进行集成
