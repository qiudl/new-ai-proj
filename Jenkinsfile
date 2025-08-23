pipeline {
  agent {
    docker {
      image 'python:3.11-slim'
      args '-u 0:0' // run as root to install psql client
    }
  }
  environment {
    // Provide these in Jenkins as environment or credentials bindings
    DB_URL = credentials('AI_TASKS_DB_URL') // e.g. postgresql://ai:***@postgres:5432/ai_tasks
    TASK_API_BASE = credentials('TASK_API_BASE') // e.g. https://your-task-system.example.com/api
    TASK_API_TOKEN = credentials('TASK_API_TOKEN') // Bearer token or api key
  }
  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
  }
  triggers {
    // 每日 09:30 触发（Jenkins master 时区）
    cron('30 9 * * *')
  }
  stages {
    stage('Prepare') {
      steps {
        sh 'python --version'
        sh 'apt-get update && apt-get install -y --no-install-recommends postgresql-client curl jq && rm -rf /var/lib/apt/lists/*'
        sh 'pip install --no-cache-dir -r requirements.txt || true'
      }
    }
    stage('Migrate Up') {
      steps {
        sh 'test -n "$DB_URL" || (echo "DB_URL not set" && exit 1)'
        sh 'psql "$DB_URL" -f db/migrations/V20250821_1500__create_dictionaries.sql'
        sh 'psql "$DB_URL" -f db/migrations/V20250821_1501__seed_dictionaries.sql'
        sh 'psql "$DB_URL" -f db/migrations/V20250822_1100__create_analytics_events.sql'
        sh 'psql "$DB_URL" -f db/migrations/V20250822_1101__analytics_views.sql'
      }
    }
    stage('Sync Attributes from Descriptions') {
      steps {
        sh 'python scripts/sync_from_descriptions.py --db-url "$DB_URL" --api-base "$TASK_API_BASE" --api-token "$TASK_API_TOKEN" --dry-run=false'
      }
    }
    stage('Smoke Verify') {
      steps {
        sh 'psql "$DB_URL" -c "SELECT key,name FROM task_categories;"'
        sh 'psql "$DB_URL" -c "SELECT key,level FROM task_risk_levels;"'
      }
    }
    stage('Generate Execution Plan') {
      steps {
        sh 'python scripts/generate_execution_plan.py --db-url "$DB_URL" --api-base "$TASK_API_BASE" --api-token "$TASK_API_TOKEN" --out artifacts/ai_execution_plan.json'
        sh 'mkdir -p logs && cp artifacts/ai_execution_plan.json logs/ai_execution_plan.json'
      }
    }
    stage('Daily Work Notes') {
      when {
        triggeredBy 'TimerTrigger'
      }
      steps {
        sh 'chmod +x scripts/daily_work_notes.sh'
        sh 'BASE_URL="${TASK_API_BASE}/v1" AUTH_HEADER="Bearer ${TASK_API_TOKEN}" PROJECT_ID=1 scripts/daily_work_notes.sh'
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'logs/**', allowEmptyArchive: true
    }
  }
}

