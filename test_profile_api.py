#!/usr/bin/env python3
"""
个人资料管理接口测试脚本
测试完善后的个人资料管理API功能
"""

import requests
import json
import sys
import os

# API基础配置
API_BASE = "http://localhost:8080/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzU2MzEwNjM0LCJpYXQiOjE3MjQ3NzQ2MzR9.BrEXTxBxfqY5Z2K1HTXRRLkL6LwRXkJ-7S6Y9GZKiE4"

def get_headers():
    """获取请求头"""
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def test_get_profile():
    """测试获取个人资料"""
    print("🔍 Testing GET /users/profile...")
    try:
        response = requests.get(f"{API_BASE}/users/profile", headers=get_headers())
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    print()

def test_update_profile():
    """测试更新个人资料"""
    print("📝 Testing PUT /users/profile...")
    try:
        update_data = {
            "username": "admin_updated",
            "profile": {
                "name": "管理员用户",
                "phone": "138-0000-1234",
                "department": "技术部"
            }
        }
        response = requests.put(
            f"{API_BASE}/users/profile", 
            json=update_data, 
            headers=get_headers()
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    print()

def test_change_password():
    """测试修改密码"""
    print("🔐 Testing POST /users/profile/change-password...")
    try:
        password_data = {
            "current_password": "admin123",
            "new_password": "admin123456",
            "confirm_password": "admin123456"
        }
        response = requests.post(
            f"{API_BASE}/users/profile/change-password", 
            json=password_data, 
            headers=get_headers()
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    print()

def test_get_statistics():
    """测试获取用户统计"""
    print("📊 Testing GET /users/profile/statistics...")
    try:
        response = requests.get(f"{API_BASE}/users/profile/statistics", headers=get_headers())
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    print()

def main():
    """主测试函数"""
    print("🚀 开始测试个人资料管理接口...\n")
    
    # 测试各个接口
    test_get_profile()
    test_update_profile()
    test_change_password() 
    test_get_statistics()
    
    print("✨ 测试完成!")

if __name__ == "__main__":
    main()
