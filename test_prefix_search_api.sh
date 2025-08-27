#!/bin/bash

# Test script for the new prefix search API

BASE_URL="http://localhost:8080/api/v1"

echo "Testing Prefix Search API..."

# Test 1: Basic prefix search
echo "=== Test 1: Basic name prefix search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=test" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 2: Document-specific prefix search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=doc&type=document&limit=10" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 3: Task prefix search with path matching ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=task&type=task&include_path=true&sort_by=relevance&sort_order=desc" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 4: Project name prefix search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=proj&type=project&sort_by=name&sort_order=asc" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 5: User prefix search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=admin&type=user&limit=5" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 6: Cross-type prefix search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=ai&include_name=true&include_path=true&limit=20&sort_by=relevance" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 7: Error case - missing prefix parameter ==="
curl -X GET "${BASE_URL}/search/prefix" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo -e "\n=== Test 8: Path-only search ==="
curl -X GET "${BASE_URL}/search/prefix?prefix=/docs&include_name=false&include_path=true" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" | jq .

echo "Testing completed!"
