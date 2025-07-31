#!/bin/bash

# Quick Fix for Frontend Authentication Issues
# This script will help resolve authentication problems

echo "🔧 Fixing Frontend Authentication Issues..."

# 1. Check if services are running
echo "1. Checking service status..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(nginx_proxy|go_backend|react_frontend|postgres_db)"

# 2. Generate fresh token for testing
echo -e "\n2. Generating fresh authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qiudl","password":"123456"}')

if echo "$TOKEN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token')
    USER_DATA=$(echo "$TOKEN_RESPONSE" | jq -c '.data.user')
    
    echo "✅ Authentication successful!"
    echo "👤 User: $(echo "$USER_DATA" | jq -r '.username')"
    echo "🎫 Token generated successfully"
    
    # 3. Test API endpoints
    echo -e "\n3. Testing API endpoints..."
    
    # Test user profile
    PROFILE_RESPONSE=$(curl -s http://localhost/api/v1/users/profile \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$PROFILE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ User profile endpoint working"
    else
        echo "❌ User profile endpoint failed"
    fi
    
    # Test projects endpoint
    PROJECT_RESPONSE=$(curl -s http://localhost/api/v1/projects/1 \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$PROJECT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "✅ Projects endpoint working"
    else
        echo "❌ Projects endpoint failed"
    fi
    
    # 4. Generate browser commands
    echo -e "\n4. Browser Console Commands:"
    echo "Run these commands in your browser console (F12 -> Console):"
    echo ""
    echo "// Clear old authentication data"
    echo "localStorage.clear(); sessionStorage.clear();"
    echo ""
    echo "// Set new authentication data"
    echo "localStorage.setItem('token', '$TOKEN');"
    echo "localStorage.setItem('currentUser', '$USER_DATA');"
    echo ""
    echo "// Reload the page"
    echo "window.location.reload();"
    echo ""
    
    # 5. Create a simple HTML page for easy copy-paste
    cat > /tmp/auth_fix.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Frontend Auth Fix</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .code-block { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; margin: 10px 0; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; cursor: pointer; margin: 5px; }
        button:hover { background: #005a87; }
    </style>
</head>
<body>
    <h1>Frontend Authentication Fix</h1>
    <p>Click the button below to fix authentication issues:</p>
    
    <button onclick="fixAuth()">Fix Authentication</button>
    <button onclick="clearAuth()">Clear Authentication</button>
    
    <div class="code-block">
        <h3>Manual Commands (copy to console):</h3>
        <pre id="commands">
localStorage.clear(); sessionStorage.clear();
localStorage.setItem('token', '$TOKEN');
localStorage.setItem('currentUser', '$USER_DATA');
window.location.reload();
        </pre>
    </div>
    
    <script>
        function fixAuth() {
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('token', '$TOKEN');
            localStorage.setItem('currentUser', '$USER_DATA');
            alert('Authentication fixed! Reloading page...');
            window.location.reload();
        }
        
        function clearAuth() {
            localStorage.clear();
            sessionStorage.clear();
            alert('Authentication cleared! Reloading page...');
            window.location.reload();
        }
    </script>
</body>
</html>
EOF
    
    echo "6. Quick fix page created at: file:///tmp/auth_fix.html"
    echo "   You can open this file in your browser for easy authentication fixing."
    
else
    echo "❌ Authentication failed. Please check:"
    echo "   - Backend service is running"
    echo "   - Database has valid user credentials"
    echo "   - Network connectivity"
    echo ""
    echo "Response: $TOKEN_RESPONSE"
fi

echo -e "\n🏁 Authentication fix script completed!"
