#!/usr/bin/env bash
set -euo pipefail

# Configure a Jenkins Pipeline job via Jenkins REST API (local Jenkins).
# This script supports creating an optional folder and a pipeline-from-SCM job.
# It uses only environment variables (no secrets in arguments).
#
# Required env:
#   JENK_URL   (e.g., http://localhost:8181)
#   JENK_USER  (Jenkins username)
#   JENK_TOKEN (API token for the user)
#   JOB_NAME   (e.g., ai-executor)
#   GIT_URL    (e.g., https://github.com/you/your-repo.git)
# Optional env:
#   JOB_FOLDER        (e.g., AI or Team/Project for nested folders)
#   GIT_BRANCH        (default: main)
#   JENKINSFILE_PATH  (default: Jenkinsfile)
#   DESCRIPTION       (default: "AI executor pipeline")
#   CRON_EXPR         (empty by default; set to enable periodic trigger, e.g., H * * * *)
#   VERBOSE=1         (print debug info)
#
# Example:
#   export JENK_URL=http://localhost:8181
#   export JENK_USER=admin
#   export JENK_TOKEN=***
#   export JOB_FOLDER=AI
#   export JOB_NAME=ai-executor
#   export GIT_URL=https://github.com/you/new-ai-proj.git
#   ./scripts/jenkins_api_config/configure_job.sh

req_env() {
  local n="$1"; if [[ -z "${!n:-}" ]]; then echo "[ERR] Missing env: $n" >&2; exit 1; fi
}

JENK_URL="${JENK_URL:-}"; req_env JENK_URL
JENK_USER="${JENK_USER:-}"; req_env JENK_USER
JENK_TOKEN="${JENK_TOKEN:-}"; req_env JENK_TOKEN
JOB_NAME="${JOB_NAME:-}"; req_env JOB_NAME
GIT_URL="${GIT_URL:-}"; req_env GIT_URL
GIT_BRANCH="${GIT_BRANCH:-main}"
JENKINSFILE_PATH="${JENKINSFILE_PATH:-Jenkinsfile}"
DESCRIPTION="${DESCRIPTION:-AI executor pipeline}"
JOB_FOLDER="${JOB_FOLDER:-}"
CRON_EXPR="${CRON_EXPR:-}"

# Utilities
urlencode() { python3 - "$1" << 'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1]))
PY
}

get_crumb() {
  local crumb_json
  crumb_json=$(curl -fsSL -u "$JENK_USER:$JENK_TOKEN" "$JENK_URL/crumbIssuer/api/json" || true)
  if [[ -z "$crumb_json" ]]; then echo ""; return 0; fi
  if command -v jq >/dev/null 2>&1; then echo "$crumb_json" | jq -r '.crumb // empty';
  else echo "$crumb_json" | sed -n 's/.*"crumb"\s*:\s*"\([^"]*\)".*/\1/p'; fi
}

add_hdrs() {
  local crumb="$1"; shift
  local args=("-H" "Content-Type: application/xml; charset=UTF-8" "-H" "Accept: application/xml")
  if [[ -n "$crumb" ]]; then args+=("-H" "Jenkins-Crumb: $crumb"); fi
  printf '%s ' "${args[@]}"
}

# Build /job/... path for folder creation and job endpoints
build_job_path() {
  local folder_path="$1"; local name="$2"
  local out=""
  if [[ -n "$folder_path" ]]; then
    IFS='/' read -r -a parts <<< "$folder_path"
    for p in "${parts[@]}"; do [[ -z "$p" ]] && continue; out+="/job/$(urlencode "$p")"; done
  fi
  out+="/job/$(urlencode "$name")"
  echo "$out"
}

# 1) Create folder(s) if requested
CRUMB=$(get_crumb || true)
HDRS=( $(add_hdrs "$CRUMB") )

if [[ -n "$JOB_FOLDER" ]]; then
  # Create nested folders progressively under JENK_URL
  IFS='/' read -r -a parts <<< "$JOB_FOLDER"
  local_path=""  # slash-joined path like "AI/Sub"
  parent_endpoint=""  # /job/AI/job/Sub (for createItem parent)
  for part in "${parts[@]}"; do
    [[ -z "$part" ]] && continue
    # Build current folder API path and parent endpoint
    current_path=$(build_job_path "$local_path" "$part") # /job/.../job/part
    parent_endpoint="${parent_endpoint}${current_path%/job/$(urlencode "$part")}" # parent without /job/part
    # Check if folder exists
    if curl -fsS -u "$JENK_USER:$JENK_TOKEN" "$JENK_URL${current_path}/api/json" >/dev/null 2>&1; then
      [[ "${VERBOSE:-0}" != "0" ]] && echo "[INFO] Folder exists: ${local_path:+$local_path/}$part"
    else
      [[ "${VERBOSE:-0}" != "0" ]] && echo "[INFO] Creating folder: ${local_path:+$local_path/}$part"
      CREATE_FOLDER_URL="$JENK_URL${parent_endpoint}/createItem?name=$(urlencode "$part")&mode=com.cloudbees.hudson.plugins.folder.Folder"
      [[ "${VERBOSE:-0}" != "0" ]] && echo "[DBG] POST $CREATE_FOLDER_URL"
      CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$JENK_USER:$JENK_TOKEN" -X POST \
        "$CREATE_FOLDER_URL" -H "Content-Type: application/x-www-form-urlencoded" ${CRUMB:+-H "Jenkins-Crumb: $CRUMB"}) || true
      if [[ "$CODE" != "200" && "$CODE" != "201" && "$CODE" != "302" ]]; then
        echo "[ERR] Failed to create folder '$part' (HTTP $CODE)" >&2; exit 2
      fi
    fi
    local_path+="${local_path:+/}$part"
    parent_endpoint="$current_path"
  done
fi

# 2) Prepare Pipeline-from-SCM config.xml
CONFIG_XML=$(cat <<XML
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>${DESCRIPTION}</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${GIT_URL}</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>${GIT_BRANCH}</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <extensions/>
    </scm>
    <scriptPath>${JENKINSFILE_PATH}</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers>
    ${CRON_EXPR:+<hudson.triggers.TimerTrigger><spec>${CRON_EXPR}</spec></hudson.triggers.TimerTrigger>}
  </triggers>
  <disabled>false</disabled>
</flow-definition>
XML
)

# 3) Create or update Pipeline job
PARENT_PATH=""
if [[ -n "$JOB_FOLDER" ]]; then
  # Build parent folder path for createItem endpoint
  IFS='/' read -r -a parts <<< "$JOB_FOLDER"
  for p in "${parts[@]}"; do [[ -z "$p" ]] && continue; PARENT_PATH+="/job/$(urlencode "$p")"; done
fi
JOB_PATH=$(build_job_path "$JOB_FOLDER" "$JOB_NAME")

# Try create; if not created, try update (print diagnostics)
CREATE_URL="$JENK_URL${PARENT_PATH}/createItem?name=$(urlencode "$JOB_NAME")"
if [[ "${VERBOSE:-0}" != "0" ]]; then
  echo "[DBG] Creating job at: $CREATE_URL"
fi
CREATE_BODY_FILE=$(mktemp)
echo "$CONFIG_XML" > "$CREATE_BODY_FILE"
CREATE_RESP_FILE=$(mktemp)
CREATE_CODE=$(curl -s -o "$CREATE_RESP_FILE" -w "%{http_code}" -u "$JENK_USER:$JENK_TOKEN" "${HDRS[@]}" -X POST \
  "$CREATE_URL" --data-binary @"$CREATE_BODY_FILE") || true
if [[ "$CREATE_CODE" == "200" || "$CREATE_CODE" == "201" || "$CREATE_CODE" == "302" ]]; then
  echo "[OK] Job created: ${JOB_FOLDER:+$JOB_FOLDER/}$JOB_NAME"
else
  echo "[WARN] Create returned HTTP $CREATE_CODE; response:" >&2
  sed -e 's/.*/[JENKINS] &/' "$CREATE_RESP_FILE" >&2 || true

  # Fallback A: create minimal Pipeline job via mode=WorkflowJob, then update config.xml
  echo "[INFO] Fallback A: create minimal Pipeline job via mode=WorkflowJob..."
  FALLBACK_CREATE_URL="$JENK_URL${PARENT_PATH}/createItem?name=$(urlencode "$JOB_NAME")&mode=org.jenkinsci.plugins.workflow.job.WorkflowJob"
  FALLBACK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$JENK_USER:$JENK_TOKEN" -X POST \
    "$FALLBACK_CREATE_URL" -H "Content-Type: application/x-www-form-urlencoded" ${CRUMB:+-H "Jenkins-Crumb: $CRUMB"}) || true
  if [[ "$FALLBACK_CODE" == "200" || "$FALLBACK_CODE" == "201" || "$FALLBACK_CODE" == "302" ]]; then
    echo "[OK] Minimal Pipeline job created. Updating config.xml..."
    UPDATE_RESP_FILE=$(mktemp)
    UPDATE_URL="$JENK_URL${JOB_PATH}/config.xml"
    UPDATE_CODE=$(curl -s -o "$UPDATE_RESP_FILE" -w "%{http_code}" -u "$JENK_USER:$JENK_TOKEN" "${HDRS[@]}" -X POST \
      "$UPDATE_URL" --data-binary @"$CREATE_BODY_FILE") || true
    if [[ "$UPDATE_CODE" == "200" ]]; then
      echo "[OK] Job updated: ${JOB_FOLDER:+$JOB_FOLDER/}$JOB_NAME"
    else
      echo "[ERR] Update config.xml failed (HTTP $UPDATE_CODE)." >&2
      sed -e 's/.*/[JENKINS] &/' "$UPDATE_RESP_FILE" >&2 || true
      exit 2
    fi
  else
    echo "[ERR] Fallback A create failed (HTTP $FALLBACK_CODE). Aborting." >&2
    exit 2
  fi
fi
rm -f "$CREATE_BODY_FILE" "$CREATE_RESP_FILE" ${UPDATE_RESP_FILE:-} 2>/dev/null || true

echo "[OK] Jenkins job ready: ${JOB_FOLDER:+$JOB_FOLDER/}$JOB_NAME"

