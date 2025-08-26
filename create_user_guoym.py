#!/usr/bin/env python3
"""
创建系统管理员用户 guoym 的脚本
使用项目的后端API进行用户创建
"""

import requests
import json
import sys

# API配置
BASE_URL = "http://localhost:8081"
API_V1 = f"{BASE_URL}/api/v1"

def get_admin_token():
    """获取admin用户的JWT token"""
    try:
        response = requests.post(
            f"{API_V1}/auth/dev-quick-login",
            json={"username": "admin"},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data = response.json()
        
        if data.get("success"):
            return data["data"]["token"]
        else:
            print(f"登录失败: {data}")
            return None
    except Exception as e:
        print(f"登录请求失败: {e}")
        return None

def create_user(token, user_data):
    """创建用户"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    try:
        # 尝试管理员路由
        response = requests.post(
            f"{API_V1}/admin/users",
            json=user_data,
            headers=headers
        )
        
        if response.status_code == 403 or response.status_code == 401:
            print("管理员路由权限不足，尝试系统路由...")
            # 尝试系统路由
            response = requests.post(
                f"{API_V1}/system/users",
                json=user_data,
                headers=headers
            )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP错误: {e}")
        print(f"响应内容: {response.text}")
        return None
    except Exception as e:
        print(f"创建用户请求失败: {e}")
        return None

def main():
    print("正在创建系统管理员用户 guoym...")
    
    # 1. 获取admin token
    print("1. 获取admin用户登录token...")
    token = get_admin_token()
    if not token:
        print("无法获取admin token，退出")
        sys.exit(1)
    print(f"✓ 获得token: {token[:50]}...")
    
    # 2. 创建用户数据
    user_data = {
        "username": "guoym",
        "email": "guoym@example.com", 
        "password": "gym123",
        "user_type": "system",
        "role": "admin",
        "profile": {
            "name": "郭咏明"
        }
    }
    
    print("2. 创建用户...")
    print(f"用户数据: {json.dumps(user_data, indent=2, ensure_ascii=False)}")
    
    # 3. 调用API创建用户
    result = create_user(token, user_data)
    if result:
        print("✓ 用户创建成功!")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("✗ 用户创建失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
