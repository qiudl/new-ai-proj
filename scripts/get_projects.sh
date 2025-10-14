#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk5ODk1ODIsIm5iZiI6MTc1OTM4NDc4MiwiaWF0IjoxNzU5Mzg0NzgyLCJqdGkiOiI1NzE5ZWQ1MGU0YmEzYTEyNWYyZjdiMmY4MzU0NGQ0ZCJ9.HV1y8vttyNVfu_KX2xp8v9dxN6nPzNP_TPPbh-hkmnU"

echo "Listing projects..."
curl -s -X GET "http://localhost:8080/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.data[] | {id, name}'

echo ""
echo "Getting task 2498 details..."
curl -s -X GET "http://localhost:8080/api/v1/tasks/2498" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '{id:.data.id, title:.data.title, project_id:.data.project_id}'
