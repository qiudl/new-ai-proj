#!/usr/bin/env python3
"""
MCP SSE连接测试脚本（Python版本）
用于测试和验证MCP服务器的SSE连接
"""

import os
import sys
import json
import time
import requests
from typing import Dict, Any, Optional

# 配置
API_KEY = os.getenv('MCP_API_KEY', 'mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06')
SERVER_URL = os.getenv('MCP_SERVER_URL', 'https://152.136.104.251')
HTTP_SERVER_URL = os.getenv('MCP_HTTP_SERVER_URL', 'http://152.136.104.251')

# ANSI颜色码
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_colored(text: str, color: str):
    """打印带颜色的文本"""
    print(f"{color}{text}{Colors.NC}")

def test_health(url: str, name: str) -> bool:
    """测试健康检查端点"""
    print_colored(f"\n测试 {name} 健康检查...", Colors.YELLOW)

    headers = {
        'X-API-Key': API_KEY
    }

    try:
        response = requests.get(
            f"{url}/mcp/health",
            headers=headers,
            verify=False,  # 忽略SSL证书验证（仅用于测试）
            timeout=10
        )

        print(f"HTTP状态码: {response.status_code}")

        if response.status_code == 200:
            print_colored(f"✓ 健康检查成功", Colors.GREEN)
            try:
                data = response.json()
                print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
            except json.JSONDecodeError:
                print(f"响应: {response.text}")
            return True
        else:
            print_colored(f"✗ 健康检查失败", Colors.RED)
            print(f"响应: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print_colored(f"✗ 连接失败: {e}", Colors.RED)
        return False

def test_sse_connection(url: str, name: str) -> bool:
    """测试SSE连接"""
    print_colored(f"\n测试 {name} SSE连接...", Colors.YELLOW)

    headers = {
        'Accept': 'text/event-stream',
        'X-API-Key': API_KEY,
        'Cache-Control': 'no-cache'
    }

    try:
        response = requests.get(
            f"{url}/mcp/sse",
            headers=headers,
            verify=False,
            stream=True,
            timeout=5
        )

        print(f"HTTP状态码: {response.status_code}")

        if response.status_code == 200:
            print_colored("✓ SSE连接建立成功", Colors.GREEN)
            print("接收到的事件流（前5行）：")

            line_count = 0
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    print(f"  {decoded_line}")
                    line_count += 1
                    if line_count >= 5:
                        break

            print_colored("✓ SSE连接测试完成", Colors.GREEN)
            return True
        else:
            print_colored(f"✗ SSE连接失败", Colors.RED)
            print(f"响应: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print_colored("✗ 连接超时", Colors.RED)
        return False
    except requests.exceptions.RequestException as e:
        print_colored(f"✗ 连接失败: {e}", Colors.RED)
        return False

def test_message_endpoint(url: str, name: str, session_id: str = "test-session") -> bool:
    """测试消息端点"""
    print_colored(f"\n测试 {name} 消息端点...", Colors.YELLOW)

    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list"
    }

    try:
        response = requests.post(
            f"{url}/mcp/message?sessionId={session_id}",
            headers=headers,
            json=payload,
            verify=False,
            timeout=10
        )

        print(f"HTTP状态码: {response.status_code}")
        print(f"响应: {response.text[:200]}...")  # 只显示前200个字符

        if response.status_code in [200, 404]:  # 404是预期的（没有session）
            print_colored("✓ 消息端点可访问", Colors.GREEN)
            return True
        else:
            print_colored(f"✗ 消息端点测试失败", Colors.RED)
            return False

    except requests.exceptions.RequestException as e:
        print_colored(f"✗ 连接失败: {e}", Colors.RED)
        return False

def run_diagnostics():
    """运行诊断检查"""
    print_colored("\n--- 诊断信息 ---", Colors.BLUE)

    # 检查网络连接
    print_colored("\n网络连接测试:", Colors.YELLOW)
    try:
        response = requests.get("https://www.google.com", timeout=3)
        print_colored("✓ 网络连接正常", Colors.GREEN)
    except:
        print_colored("✗ 网络连接可能存在问题", Colors.RED)

    # 检查服务器可达性
    print_colored("\n服务器可达性测试:", Colors.YELLOW)
    import socket

    for port in [80, 443, 3100]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('152.136.104.251', port))
        sock.close()

        if result == 0:
            print_colored(f"✓ 端口 {port} 开放", Colors.GREEN)
        else:
            print_colored(f"✗ 端口 {port} 无法连接", Colors.RED)

def main():
    """主函数"""
    # 禁用SSL警告
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    print_colored("=== MCP SSE连接测试（Python版本） ===\n", Colors.BLUE)

    print_colored("配置信息:", Colors.BLUE)
    print(f"  API Key: {API_KEY[:20]}...")
    print(f"  HTTPS服务器: {SERVER_URL}")
    print(f"  HTTP服务器: {HTTP_SERVER_URL}\n")

    # 测试结果汇总
    results = {
        'https_health': False,
        'https_sse': False,
        'http_health': False,
        'http_sse': False
    }

    # 测试HTTPS端点
    print_colored("--- 测试HTTPS端点 ---", Colors.BLUE)
    results['https_health'] = test_health(SERVER_URL, "HTTPS")
    results['https_sse'] = test_sse_connection(SERVER_URL, "HTTPS")

    # 测试HTTP端点
    print_colored("\n--- 测试HTTP端点 ---", Colors.BLUE)
    results['http_health'] = test_health(HTTP_SERVER_URL, "HTTP")
    results['http_sse'] = test_sse_connection(HTTP_SERVER_URL, "HTTP")

    # 运行诊断
    run_diagnostics()

    # 打印总结
    print_colored("\n=== 测试结果汇总 ===", Colors.BLUE)
    print("\nHTTPS端点:")
    print(f"  健康检查: {'✓ 通过' if results['https_health'] else '✗ 失败'}")
    print(f"  SSE连接: {'✓ 通过' if results['https_sse'] else '✗ 失败'}")

    print("\nHTTP端点:")
    print(f"  健康检查: {'✓ 通过' if results['http_health'] else '✗ 失败'}")
    print(f"  SSE连接: {'✓ 通过' if results['http_sse'] else '✗ 失败'}")

    # 判断整体状态
    all_passed = all(results.values())
    some_passed = any(results.values())

    if all_passed:
        print_colored("\n✓ 所有测试通过！MCP服务器运行正常", Colors.GREEN)
        return 0
    elif some_passed:
        print_colored("\n⚠ 部分测试通过，请检查失败的端点", Colors.YELLOW)
        return 1
    else:
        print_colored("\n✗ 所有测试失败，请检查服务器配置", Colors.RED)
        print("\n请检查:")
        print("  1. MCP服务容器是否正常运行")
        print("  2. Nginx配置是否正确")
        print("  3. 防火墙设置")
        print("  4. API Key是否有效")
        print("  5. 网络连接")
        return 2

if __name__ == '__main__':
    sys.exit(main())
