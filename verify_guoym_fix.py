#!/usr/bin/env python3
"""
验证guoym用户登录修复的脚本（无依赖版本）
"""

import json
import base64

def decode_jwt_payload(token):
    """手动解码JWT token的payload部分"""
    try:
        # JWT格式：header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            return {"error": "Invalid JWT format"}
        
        # 解码payload部分（第二部分）
        payload = parts[1]
        # 添加padding如果需要
        missing_padding = len(payload) % 4
        if missing_padding:
            payload += '=' * (4 - missing_padding)
        
        # base64解码
        decoded_bytes = base64.urlsafe_b64decode(payload)
        payload_json = json.loads(decoded_bytes.decode('utf-8'))
        
        return payload_json
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=== JWT Token 验证 ===")
    
    # 读取新的token
    with open('/Users/johnqiu/coding/www/projects/new-ai-proj/.env.mcp-token', 'r') as f:
        content = f.read()
        for line in content.split('\n'):
            if line.startswith('MCP_SYSTEM_TOKEN='):
                token = line.split('=', 1)[1]
                break
    
    print(f"Token: {token[:50]}...")
    
    # 解码token
    payload = decode_jwt_payload(token)
    print(f"\nToken Payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    # 验证用户身份
    username = payload.get('username', 'UNKNOWN')
    user_id = payload.get('user_id', 'UNKNOWN')
    role = payload.get('role', 'UNKNOWN')
    
    print(f"\n=== 验证结果 ===")
    print(f"用户名: {username}")
    print(f"用户ID: {user_id}")
    print(f"角色: {role}")
    
    if username == 'guoym':
        print("✅ 修复成功！用户身份正确识别为 guoym")
    else:
        print(f"❌ 修复失败！用户身份仍为 {username}")

if __name__ == "__main__":
    main()
