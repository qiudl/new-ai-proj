#!/bin/bash

# 修复weier权限问题 - 在permission_cache_middleware.go中添加superadmin检查

MIDDLEWARE_FILE="backend/middleware/permission_cache_middleware.go"
BACKUP_FILE="backend/middleware/permission_cache_middleware.go.backup"

echo "备份原文件..."
cp "$MIDDLEWARE_FILE" "$BACKUP_FILE"

echo "创建临时修复脚本..."
cat > /tmp/fix_perm.py << 'PYTHON_SCRIPT'
import re

with open('backend/middleware/permission_cache_middleware.go', 'r') as f:
    content = f.read()

# 在 RequireCachedPermission 方法中的 company_user_id 检查之前添加 superadmin 检查
old_pattern = r'(\t\t}\n\t}\n\n)\t// Get company user ID from context'
new_code = r'''\1	// Check for superadmin override first (for system users without company_user_id)
	reqCtx := map[string]interface{}{}
	if v, ok := c.Get("username"); ok {
		reqCtx["username"] = v
	}
	if v, ok := c.Get("user_id"); ok {
		reqCtx["user_id"] = v
	}
	if v, ok := c.Get("user_role"); ok {
		reqCtx["user_role"] = v
	}

	// Check if user is superadmin
	if ok, why := isSuperAdminFromRequestContext(reqCtx); ok {
		log.Printf("[PERMISSION_CACHE] Superadmin bypass for permission %s (%s)", permissionCode, why)
		c.Next()
		return
	}

	// Get company user ID from context'''

content = re.sub(old_pattern, new_code, content, count=1)

with open('backend/middleware/permission_cache_middleware.go', 'w') as f:
    f.write(content)

print("修改完成")
PYTHON_SCRIPT

echo "执行修复..."
python3 /tmp/fix_perm.py

if [ $? -eq 0 ]; then
    echo "✅ 修复成功"
    echo "请检查修改后的文件，然后重新编译和部署后端"
else
    echo "❌ 修复失败，恢复备份"
    cp "$BACKUP_FILE" "$MIDDLEWARE_FILE"
fi

rm -f /tmp/fix_perm.py
