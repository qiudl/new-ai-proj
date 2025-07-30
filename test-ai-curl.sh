#!/bin/bash

# Test AI task generation with curl
curl -X POST "http://localhost/api/v1/system/ai-tasks/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzU0NDExMTk5LCJuYmYiOjE3NTM4MDYzOTksImlhdCI6MTc1MzgwNjM5OX0.TIQ37QAHTyAUbqYZG0_Ue9S63YAVmeWFQr618SMgroo" \
  -d '{
    "provider": "deepseek",
    "input_text": "开发一个用户登录功能",
    "project_id": 39,
    "options": {
      "max_tasks": 5,
      "enable_duplicate_check": true,
      "enable_dependency_analysis": false
    }
  }' \
  -v