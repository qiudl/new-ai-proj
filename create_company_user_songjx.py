#!/usr/bin/env python3
"""
为北京欢乐宿公司创建企业用户 songjx 的脚本
使用项目的后端API进行公司和用户创建
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

def create_company(token, company_data):
    """创建公司"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.post(
            f"{API_V1}/companies",
            json=company_data,
            headers=headers
        )
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP错误: {e}")
        print(f"响应内容: {response.text}")
        return None
    except Exception as e:
        print(f"创建公司请求失败: {e}")
        return None

def create_company_user(token, company_id, user_data):
    """为公司创建用户"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.post(
            f"{API_V1}/companies/{company_id}/users",
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
        print(f"创建公司用户请求失败: {e}")
        return None

def main():
    print("正在为北京欢乐宿公司创建企业用户 songjx...")
    
    # 1. 获取admin token
    print("1. 获取admin用户登录token...")
    token = get_admin_token()
    if not token:
        print("无法获取admin token，退出")
        sys.exit(1)
    print(f"✓ 获得token: {token[:50]}...")
    
    # 2. 创建公司数据
    company_data = {
        "name": "北京欢乐宿公司",
        "code": "BJHLS",
        "description": "北京欢乐宿公司 - 企业客户",
        "address": "北京市",
        "phone": "",
        "email": "contact@bjhls.com",
        "website": "",
        "industry": "服务业",
        "company_size": "中型企业",
        "status": "active"
    }
    
    print("2. 创建公司...")
    print(f"公司数据: {json.dumps(company_data, indent=2, ensure_ascii=False)}")
    
    # 3. 调用API创建公司
    company_result = create_company(token, company_data)
    if not company_result or not company_result.get("success"):
        print("✗ 公司创建失败")
        sys.exit(1)
    
    company_id = company_result["data"]["id"]
    print(f"✓ 公司创建成功! 公司ID: {company_id}")
    print(json.dumps(company_result, indent=2, ensure_ascii=False))
    
    # 4. 创建用户数据
    user_data = {
        "username": "songjx",
        "email": "songjx@bjhls.com",
        "password": "123456",
        "user_type": "company",
        "role": "user",
        "profile": {
            "name": "宋建新",
            "department": "技术部",
            "position": "技术总监"
        }
    }
    
    print("4. 创建企业用户...")
    print(f"用户数据: {json.dumps(user_data, indent=2, ensure_ascii=False)}")
    
    # 5. 调用API创建公司用户
    user_result = create_company_user(token, company_id, user_data)
    if user_result and user_result.get("success"):
        print("✓ 企业用户创建成功!")
        print(json.dumps(user_result, indent=2, ensure_ascii=False))
        print("\n=== 创建完成 ===")
        print(f"公司: {company_data['name']} (ID: {company_id})")
        print(f"用户: {user_data['username']} ({user_data['profile']['name']})")
        print(f"密码: {user_data['password']}")
    else:
        print("✗ 企业用户创建失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
