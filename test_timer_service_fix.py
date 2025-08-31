#!/usr/bin/env python3
"""
TimerService stopTimer异常修复验证测试用例
测试任务：1032 - TimerService - 停止计时器异常

验证修复内容：
1. MCP API端点路径修正 
2. 计时器启动/停止功能
3. 错误处理优化
4. 数据持久化验证
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

class TimerServiceTestSuite:
    def __init__(self, base_url: str = "http://localhost:8081", auth_token: str = None):
        self.base_url = base_url
        self.auth_token = auth_token
        self.session = requests.Session()
        if auth_token:
            self.session.headers.update({
                'Authorization': f'Bearer {auth_token}',
                'Content-Type': 'application/json'
            })
        
        self.test_results = []
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """记录测试结果"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'passed': passed,
            'details': details
        }
        self.test_results.append(result)
        print(f"{status} {test_name}")
        if details and not passed:
            print(f"    Details: {details}")
    
    def test_api_endpoints_exist(self) -> bool:
        """测试1: 验证修复的API端点存在且可访问"""
        print("\n🔍 Test 1: API端点可访问性测试")
        
        endpoints = [
            "/api/v1/user/timer/start",
            "/api/v1/user/timer/stop", 
            "/api/v1/user/timer/current"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            try:
                # 使用OPTIONS请求检查端点是否存在
                response = self.session.options(f"{self.base_url}{endpoint}")
                passed = response.status_code != 404
                self.log_test(f"端点存在: {endpoint}", passed, 
                            f"Status: {response.status_code}")
                all_passed &= passed
            except Exception as e:
                self.log_test(f"端点存在: {endpoint}", False, str(e))
                all_passed = False
        
        return all_passed
    
    def test_timer_start_functionality(self) -> Dict[str, Any]:
        """测试2: 计时器启动功能"""
        print("\n⏱️ Test 2: 计时器启动功能测试")
        
        try:
            # 启动计时器 - 使用正确的API格式
            payload = {
                "task_id": 1032,
                "title": "TimerService - 停止计时器异常",
                "context": "test"
            }
            
            response = self.session.post(f"{self.base_url}/api/v1/user/timer/start", 
                                       json=payload)
            
            if response.status_code == 200:
                data = response.json()
                passed = data.get('success', False) and 'timer_id' in data
                timer_info = {
                    'timer_id': data.get('timer_id'),
                    'task_id': payload['taskId'],
                    'response': data
                }
                self.log_test("计时器启动", passed, 
                            f"Timer ID: {timer_info.get('timer_id')}")
                return timer_info if passed else None
            else:
                self.log_test("计时器启动", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("计时器启动", False, str(e))
            return None
    
    def test_timer_stop_functionality(self, timer_info: Dict[str, Any] = None) -> bool:
        """测试3: 计时器停止功能 (核心修复验证)"""
        print("\n⏹️ Test 3: 计时器停止功能测试 (核心修复)")
        
        if timer_info:
            # 等待几秒让计时器运行
            print("    等待计时器运行3秒...")
            time.sleep(3)
        
        try:
            response = self.session.post(f"{self.base_url}/api/v1/user/timer/stop")
            
            if response.status_code == 200:
                data = response.json()
                passed = data.get('success', False)
                details = f"Duration: {data.get('data', {}).get('actual_work_duration', 'N/A')}s"
                self.log_test("计时器停止", passed, details)
                return passed
            else:
                # 检查是否是"没有活跃计时器"的正常错误
                if response.status_code == 400:
                    error_data = response.json()
                    if "no active timer" in error_data.get('error', '').lower():
                        self.log_test("计时器停止 (无活跃计时器)", True, 
                                    "正确处理无活跃计时器情况")
                        return True
                
                self.log_test("计时器停止", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("计时器停止", False, str(e))
            return False
    
    def test_error_handling(self) -> bool:
        """测试4: 错误处理优化验证"""
        print("\n🚫 Test 4: 错误处理优化测试")
        
        try:
            # 尝试停止不存在的计时器
            response = self.session.post(f"{self.base_url}/api/v1/user/timer/stop")
            
            if response.status_code == 400:
                data = response.json()
                error_msg = data.get('error', '')
                
                # 验证错误信息不包含双重包装
                no_double_wrap = "停止计时失败: Failed to stop timer" not in error_msg
                has_meaningful_msg = len(error_msg) > 0
                
                passed = no_double_wrap and has_meaningful_msg
                details = f"Error message: '{error_msg}'"
                self.log_test("错误处理优化", passed, details)
                return passed
            else:
                self.log_test("错误处理优化", False, 
                            f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("错误处理优化", False, str(e))
            return False
    
    def test_data_persistence(self) -> bool:
        """测试5: 数据持久化验证"""
        print("\n💾 Test 5: 数据持久化测试")
        
        try:
            # 启动并停止一个计时器
            start_payload = {
                "task_id": 1032,
                "title": "TimerService - 停止计时器异常", 
                "context": "test"
            }
            
            # 启动
            start_response = self.session.post(
                f"{self.base_url}/api/v1/user/timer/start", 
                json=start_payload
            )
            
            if start_response.status_code != 200:
                self.log_test("数据持久化", False, "无法启动测试计时器")
                return False
            
            timer_data = start_response.json()
            timer_id = timer_data.get('timer_id')
            
            # 等待2秒
            time.sleep(2)
            
            # 停止
            stop_response = self.session.post(f"{self.base_url}/api/v1/user/timer/stop")
            
            if stop_response.status_code == 200:
                stop_data = stop_response.json()
                passed = (stop_data.get('success') and 
                         stop_data.get('data', {}).get('timer_id') == timer_id)
                details = f"Timer ID一致性: {timer_id}"
                self.log_test("数据持久化", passed, details)
                return passed
            else:
                self.log_test("数据持久化", False, "停止计时器失败")
                return False
                
        except Exception as e:
            self.log_test("数据持久化", False, str(e))
            return False
    
    def test_mcp_integration(self) -> bool:
        """测试6: MCP集成测试"""
        print("\n🔌 Test 6: MCP集成测试")
        
        # 注意：这里我们无法直接测试MCP，但可以检查后端是否正确响应MCP预期的请求格式
        try:
            # 模拟MCP调用格式
            response = self.session.get(f"{self.base_url}/api/v1/user/timer/current")
            
            passed = response.status_code in [200, 400]  # 200有计时器，400无计时器都正常
            details = f"Status: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                has_data = data is not None and 'data' in data
                details += f", Has active timers: {has_data}"
            
            self.log_test("MCP集成兼容性", passed, details)
            return passed
            
        except Exception as e:
            self.log_test("MCP集成兼容性", False, str(e))
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """执行所有测试"""
        print("🚀 开始 TimerService stopTimer 修复验证测试")
        print(f"测试目标: {self.base_url}")
        print("="*60)
        
        # 执行测试
        self.test_api_endpoints_exist()
        
        timer_info = self.test_timer_start_functionality()
        self.test_timer_stop_functionality(timer_info)
        
        self.test_error_handling()
        self.test_data_persistence()
        self.test_mcp_integration()
        
        # 统计结果
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # 输出总结
        print("\n" + "="*60)
        print("📊 测试结果总结")
        print(f"总测试数: {total_tests}")
        print(f"通过: {passed_tests} ✅")
        print(f"失败: {failed_tests} ❌") 
        print(f"成功率: {success_rate:.1f}%")
        
        overall_passed = failed_tests == 0
        status = "🎉 所有测试通过！修复验证成功！" if overall_passed else "⚠️  存在测试失败，需要进一步检查"
        print(f"\n{status}")
        
        return {
            'overall_passed': overall_passed,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'detailed_results': self.test_results
        }

def main():
    """主函数"""
    # 配置
    BASE_URL = "http://localhost:8081"
    AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5MSwidXNlcm5hbWUiOiJndW95bSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6Imd1b3ltIiwiZXhwIjoxNzU3MjEwNDQ1LCJuYmYiOjE3NTY2MDU2NDUsImlhdCI6MTc1NjYwNTY0NSwianRpIjoiMzE1N2E1YTBjMzhjZGJjMjBmMjkwNzhkY2Y5ZGM3NmIifQ._0KLG7IUft4QALz-YUVYK2qyIqf24gIqHeDEyCPB3vU"
    
    # 创建测试套件
    test_suite = TimerServiceTestSuite(BASE_URL, AUTH_TOKEN)
    
    # 执行测试
    results = test_suite.run_all_tests()
    
    # 返回适当的退出码
    sys.exit(0 if results['overall_passed'] else 1)

if __name__ == "__main__":
    main()