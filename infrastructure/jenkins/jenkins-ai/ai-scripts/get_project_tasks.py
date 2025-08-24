#!/usr/bin/env python3
"""
获取项目任务信息脚本
用于Jenkins AI开发流水线
"""

import os
import sys
import json
import requests
import argparse
from typing import Dict, List, Optional

class TaskManager:
    def __init__(self, api_url: str, api_token: Optional[str] = None):
        self.api_url = api_url.rstrip('/')
        self.session = requests.Session()
        
        if api_token:
            self.session.headers.update({
                'Authorization': f'Bearer {api_token}'
            })
    
    def get_project_info(self, project_id: int) -> Dict:
        """获取项目基本信息"""
        try:
            response = self.session.get(f'{self.api_url}/projects/{project_id}')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"ERROR: 获取项目信息失败: {e}")
            sys.exit(1)
    
    def get_project_tasks(self, project_id: int, status_filter: Optional[List[str]] = None) -> List[Dict]:
        """获取项目任务列表"""
        try:
            params = {
                'page_size': 100,
                'sort_by': 'updated_at',
                'sort_order': 'desc'
            }
            
            if status_filter:
                params['status'] = ','.join(status_filter)
            
            response = self.session.get(
                f'{self.api_url}/projects/{project_id}/tasks',
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get('data', [])
        except Exception as e:
            print(f"ERROR: 获取任务列表失败: {e}")
            sys.exit(1)
    
    def get_task_details(self, project_id: int, task_id: int) -> Dict:
        """获取任务详细信息"""
        try:
            response = self.session.get(f'{self.api_url}/projects/{project_id}/tasks/{task_id}')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"WARNING: 获取任务 {task_id} 详情失败: {e}")
            return {}
    
    def analyze_task_complexity(self, task: Dict) -> str:
        """分析任务复杂度"""
        # 基于任务描述长度、自定义字段等判断复杂度
        description_length = len(task.get('description', ''))
        estimated_hours = task.get('custom_fields', {}).get('estimated_hours', 1)
        
        if estimated_hours >= 8 or description_length > 1000:
            return 'high'
        elif estimated_hours >= 4 or description_length > 500:
            return 'medium'
        else:
            return 'low'
    
    def categorize_task(self, task: Dict) -> str:
        """根据任务内容分类"""
        title = task.get('title', '').lower()
        description = task.get('description', '').lower()
        tags = task.get('custom_fields', {}).get('tags', [])
        
        # 前端相关关键词
        frontend_keywords = ['前端', 'frontend', 'react', 'vue', 'typescript', 'ui', 'component', '组件', '界面']
        # 后端相关关键词
        backend_keywords = ['后端', 'backend', 'api', 'database', 'go', 'golang', 'sql', 'server', '数据库']
        # DevOps相关关键词
        devops_keywords = ['devops', 'docker', 'deploy', 'ci/cd', 'jenkins', 'infrastructure', '部署', '运维']
        
        text_content = f"{title} {description} {' '.join(tags)}"
        
        if any(keyword in text_content for keyword in frontend_keywords):
            return 'frontend'
        elif any(keyword in text_content for keyword in backend_keywords):
            return 'backend'
        elif any(keyword in text_content for keyword in devops_keywords):
            return 'devops'
        else:
            return 'general'
    
    def get_task_dependencies(self, task: Dict) -> List[int]:
        """获取任务依赖关系"""
        # 这里可以扩展为从任务关系表获取依赖信息
        parent_id = task.get('parent_id')
        return [parent_id] if parent_id else []

def main():
    parser = argparse.ArgumentParser(description='获取项目任务信息')
    parser.add_argument('--project-id', type=int, required=True, help='项目ID')
    parser.add_argument('--target-tasks', type=str, default='', help='指定任务ID列表（逗号分隔）')
    parser.add_argument('--status-filter', type=str, default='todo,in_progress,planning', 
                        help='任务状态过滤（逗号分隔）')
    parser.add_argument('--output-format', choices=['json', 'summary'], default='json', 
                        help='输出格式')
    
    args = parser.parse_args()
    
    # 获取API配置
    api_url = os.getenv('AI_BACKEND_URL', 'http://localhost:8081/api/v1')
    api_token = os.getenv('AI_BACKEND_TOKEN')
    
    # 初始化任务管理器
    task_manager = TaskManager(api_url, api_token)
    
    try:
        # 获取项目信息
        project_info = task_manager.get_project_info(args.project_id)
        
        # 获取任务列表
        if args.target_tasks:
            # 指定任务ID
            task_ids = [int(id.strip()) for id in args.target_tasks.split(',')]
            tasks = []
            for task_id in task_ids:
                task_detail = task_manager.get_task_details(args.project_id, task_id)
                if task_detail:
                    tasks.append(task_detail)
        else:
            # 获取所有符合状态的任务
            status_list = args.status_filter.split(',') if args.status_filter else None
            tasks = task_manager.get_project_tasks(args.project_id, status_list)
        
        # 分析和增强任务信息
        enhanced_tasks = []
        for task in tasks:
            enhanced_task = {
                'id': task.get('id'),
                'title': task.get('title'),
                'description': task.get('description', ''),
                'status': task.get('status'),
                'priority': task.get('priority', 'medium'),
                'parent_id': task.get('parent_id'),
                'custom_fields': task.get('custom_fields', {}),
                
                # AI分析结果
                'ai_category': task_manager.categorize_task(task),
                'ai_complexity': task_manager.analyze_task_complexity(task),
                'ai_dependencies': task_manager.get_task_dependencies(task),
                'ai_estimated_hours': task.get('custom_fields', {}).get('estimated_hours', 1)
            }
            enhanced_tasks.append(enhanced_task)
        
        # 构建输出结果
        result = {
            'project': {
                'id': project_info.get('id'),
                'name': project_info.get('name'),
                'status': project_info.get('status')
            },
            'tasks': enhanced_tasks,
            'summary': {
                'total_tasks': len(enhanced_tasks),
                'frontend_tasks': len([t for t in enhanced_tasks if t['ai_category'] == 'frontend']),
                'backend_tasks': len([t for t in enhanced_tasks if t['ai_category'] == 'backend']),
                'devops_tasks': len([t for t in enhanced_tasks if t['ai_category'] == 'devops']),
                'general_tasks': len([t for t in enhanced_tasks if t['ai_category'] == 'general']),
                'total_estimated_hours': sum(t['ai_estimated_hours'] for t in enhanced_tasks)
            }
        }
        
        # 输出结果
        if args.output_format == 'json':
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            # 摘要格式
            print(f"项目: {result['project']['name']} (ID: {result['project']['id']})")
            print(f"总任务数: {result['summary']['total_tasks']}")
            print(f"前端任务: {result['summary']['frontend_tasks']}")
            print(f"后端任务: {result['summary']['backend_tasks']}")
            print(f"DevOps任务: {result['summary']['devops_tasks']}")
            print(f"通用任务: {result['summary']['general_tasks']}")
            print(f"预估总工时: {result['summary']['total_estimated_hours']} 小时")
    
    except Exception as e:
        print(f"ERROR: 执行失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()