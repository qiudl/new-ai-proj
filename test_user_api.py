#!/usr/bin/env python3
"""
简单的用户管理API测试脚本
测试用户CRUD接口功能
"""
import requests
import json
import sys

# API配置
BASE_URL = "http://localhost:8080/api/v1"
ADMIN_ENDPOINT = f"{BASE_URL}/admin/users"

def get_auth_headers():
    """获取认证头 - 需要先登录获取JWT Token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get('data', {}).get('token')
            return {"Authorization": f"Bearer {token}"}
        else:
            print(f"❌ 登录失败: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"❌ 登录异常: {e}")
        return None

def test_user_list(headers):
    """测试用户列表接口"""
    print("📋 测试用户列表接口...")
    try:
        response = requests.get(ADMIN_ENDPOINT, headers=headers)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 用户列表获取成功: {len(data.get('data', []))} 个用户")
            return True
        else:
            print(f"❌ 用户列表获取失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_user_creation(headers):
    """测试用户创建接口"""
    print("👤 测试用户创建接口...")
    user_data = {
        "username": "test_user_" + str(int(__import__('time').time())),
        "email": f"test_{int(__import__('time').time())}@example.com",
        "password": "test123456",
        "user_type": "system",
        "role": "developer",
        "profile": {
            "name": "测试用户",
            "department": "开发部"
        }
    }
    
    try:
        response = requests.post(ADMIN_ENDPOINT, json=user_data, headers=headers)
        print(f"状态码: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"✅ 用户创建成功: ID={data.get('id')}, 用户名={data.get('username')}")
            return data.get('id')
        else:
            print(f"❌ 用户创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return None

def test_user_detail(headers, user_id):
    """测试用户详情接口"""
    print(f"🔍 测试用户详情接口 (ID: {user_id})...")
    try:
        response = requests.get(f"{ADMIN_ENDPOINT}/{user_id}", headers=headers)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 用户详情获取成功: {data.get('username')} ({data.get('user_type')})")
            return True
        else:
            print(f"❌ 用户详情获取失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_user_update(headers, user_id):
    """测试用户更新接口"""
    print(f"📝 测试用户更新接口 (ID: {user_id})...")
    update_data = {
        "profile": {
            "name": "更新的测试用户",
            "department": "测试部"
        },
        "status": "active"
    }
    
    try:
        response = requests.put(f"{ADMIN_ENDPOINT}/{user_id}", json=update_data, headers=headers)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 用户更新成功: {data.get('username')}")
            return True
        else:
            print(f"❌ 用户更新失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def test_user_stats(headers):
    """测试用户统计接口"""
    print("📊 测试用户统计接口...")
    try:
        response = requests.get(f"{ADMIN_ENDPOINT}/stats", headers=headers)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 用户统计获取成功: 总用户数={data.get('total', 0)}")
            return True
        else:
            print(f"❌ 用户统计获取失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

def main():
    """主测试流程"""
    print("🚀 开始测试用户管理接口...")
    print("-" * 50)
    
    # 获取认证头
    headers = get_auth_headers()
    if not headers:
        print("❌ 无法获取认证信息，测试中止")
        return
    
    print("✅ 认证成功，开始测试...")
    print("-" * 50)
    
    # 测试列表
    test_user_list(headers)
    print("-" * 30)
    
    # 测试统计
    test_user_stats(headers)
    print("-" * 30)
    
    # 测试创建
    user_id = test_user_creation(headers)
    if user_id:
        print("-" * 30)
        
        # 测试详情
        test_user_detail(headers, user_id)
        print("-" * 30)
        
        # 测试更新
        test_user_update(headers, user_id)
        print("-" * 30)
        
        print(f"⚠️ 注意: 测试用户 ID={user_id} 已创建，可手动清理")
    
    print("🎉 用户管理接口测试完成")

if __name__ == "__main__":
    main()
