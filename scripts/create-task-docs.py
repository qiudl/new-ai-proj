#!/usr/bin/env python3
"""
配置驱动的批量任务文档生成脚本
Version: 1.0
Author: Claude Code Assistant

使用方式:
    python3 scripts/create-task-docs.py
    python3 scripts/create-task-docs.py --config custom-config.yaml
    python3 scripts/create-task-docs.py --dry-run
    python3 scripts/create-task-docs.py --task-ids 274,275,276
"""

import os
import sys
import re
import json
import yaml
import argparse
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
import logging
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class BatchResult:
    """批量操作结果"""
    created_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0
    total_count: int = 0
    created_docs: List[Dict] = field(default_factory=list)
    errors: List[Dict] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None

    def add_success(self, doc_info: Dict):
        """添加成功创建的文档"""
        self.created_count += 1
        self.created_docs.append(doc_info)

    def add_skip(self, task_id: int, reason: str):
        """添加跳过的任务"""
        self.skipped_count += 1
        logging.info(f"跳过任务 {task_id}: {reason}")

    def add_error(self, task_id: int, error: str):
        """添加失败的任务"""
        self.failed_count += 1
        self.errors.append({"task_id": task_id, "error": error})
        logging.error(f"任务 {task_id} 处理失败: {error}")

    def finish(self):
        """完成处理"""
        self.end_time = datetime.now()
        self.total_count = self.created_count + self.skipped_count + self.failed_count

    @property
    def duration(self) -> float:
        """处理耗时（秒）"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()


class ConfigDrivenDocumentGenerator:
    """配置驱动的文档生成器"""
    
    def __init__(self, config_path: str = None, dry_run: bool = False):
        self.dry_run = dry_run
        self.config = self._load_config(config_path)
        self.session = requests.Session()
        self.jwt_token = None
        self.result = BatchResult()
        self._setup_logging()
        
    def _load_config(self, config_path: str = None) -> Dict:
        """加载配置文件"""
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), 'task-docs-config.yaml')
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            logging.info(f"配置文件加载成功: {config_path}")
            return config
        except Exception as e:
            logging.error(f"配置文件加载失败: {e}")
            raise
    
    def _setup_logging(self):
        """设置日志"""
        log_level = self.config.get('output', {}).get('log_level', 'info').upper()
        log_format = '%(asctime)s - %(levelname)s - %(message)s'
        
        logging.basicConfig(
            level=getattr(logging, log_level),
            format=log_format,
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        if self.dry_run:
            logging.warning("🧪 DRY RUN 模式 - 不会实际创建文档")
    
    def _authenticate(self) -> bool:
        """JWT认证"""
        auth_config = self.config['api']['auth']
        login_url = f"{self.config['api']['base_url']}/auth/login"
        
        payload = {
            "username": auth_config['username'],
            "password": auth_config['password']
        }
        
        try:
            response = self.session.post(login_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and 'data' in data and 'token' in data['data']:
                self.jwt_token = data['data']['token']
                self.session.headers.update({
                    'Authorization': f'Bearer {self.jwt_token}'
                })
                logging.info("✅ 认证成功")
                return True
            else:
                logging.error("认证失败: 无效的响应格式")
                return False
                
        except Exception as e:
            logging.error(f"认证失败: {e}")
            return False
    
    def _get_tasks(self, task_ids: List[int] = None) -> List[Dict]:
        """获取任务列表"""
        if task_ids:
            return self._get_specific_tasks(task_ids)
        
        # 根据配置过滤获取任务
        filters = self.config.get('filters', {})
        
        # 构建查询参数
        params = {
            'page': 1,
            'page_size': 100,
        }
        
        # 项目ID过滤
        project_ids = filters.get('project_ids', [1])
        all_tasks = []
        
        for project_id in project_ids:
            url = f"{self.config['api']['base_url']}/projects/{project_id}/tasks"
            
            try:
                response = self.session.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('success') and 'data' in data:
                    tasks = data['data'].get('data', [])
                    all_tasks.extend(tasks)
                    logging.info(f"从项目 {project_id} 获取到 {len(tasks)} 个任务")
                
            except Exception as e:
                logging.error(f"获取项目 {project_id} 任务失败: {e}")
        
        # 应用过滤器
        filtered_tasks = self._apply_filters(all_tasks, filters)
        
        logging.info(f"应用过滤器后剩余 {len(filtered_tasks)} 个任务")
        return filtered_tasks
    
    def _get_specific_tasks(self, task_ids: List[int]) -> List[Dict]:
        """获取指定ID的任务"""
        tasks = []
        
        for task_id in task_ids:
            # 这里需要根据任务ID确定所属项目，简化处理，假设都在项目1中
            url = f"{self.config['api']['base_url']}/projects/1/tasks/{task_id}"
            
            try:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                
                if data.get('success') and 'data' in data:
                    tasks.append(data['data'])
                    
            except Exception as e:
                logging.error(f"获取任务 {task_id} 失败: {e}")
        
        return tasks
    
    def _apply_filters(self, tasks: List[Dict], filters: Dict) -> List[Dict]:
        """应用过滤器"""
        filtered_tasks = []
        
        # 日期过滤
        date_range = filters.get('date_range', 'today')
        target_date = self._get_target_date(date_range)
        
        for task in tasks:
            # 日期过滤
            if target_date:
                created_at = task.get('created_at', '')
                if not created_at.startswith(target_date):
                    continue
            
            # 状态过滤
            status_filter = filters.get('status_filter', [])
            if status_filter and task.get('status') not in status_filter:
                continue
            
            # 优先级过滤
            priority_filter = filters.get('priority_filter', [])
            if priority_filter:
                task_priority = task.get('priority', '').lower()
                custom_fields = task.get('custom_fields', {})
                if isinstance(custom_fields, dict):
                    priority = custom_fields.get('priority', task_priority)
                else:
                    priority = task_priority
                
                if priority and priority not in priority_filter:
                    continue
            
            # 任务类型过滤
            task_types = filters.get('task_types', [])
            if task_types:
                title = task.get('title', '').lower()
                if not any(task_type.lower() in title for task_type in task_types):
                    continue
            
            # 描述长度过滤
            min_desc_length = filters.get('min_description_length', 0)
            if min_desc_length > 0:
                description = task.get('description', '')
                if len(description) < min_desc_length:
                    continue
            
            # 排除已有文档的任务
            if filters.get('exclude_with_docs', True):
                if self._task_has_documents(task['id']):
                    self.result.add_skip(task['id'], '已有文档')
                    continue
            
            filtered_tasks.append(task)
        
        return filtered_tasks
    
    def _get_target_date(self, date_range: str) -> str:
        """获取目标日期字符串"""
        now = datetime.now()
        
        if date_range == 'today':
            return now.strftime('%Y-%m-%d')
        elif date_range == 'yesterday':
            return (now - timedelta(days=1)).strftime('%Y-%m-%d')
        elif date_range == 'this_week':
            # 本周开始日期
            days_since_monday = now.weekday()
            monday = now - timedelta(days=days_since_monday)
            return monday.strftime('%Y-%m-%d')
        elif date_range == 'last_week':
            # 上周开始日期
            days_since_monday = now.weekday()
            last_monday = now - timedelta(days=days_since_monday + 7)
            return last_monday.strftime('%Y-%m-%d')
        elif date_range == 'this_month':
            return now.strftime('%Y-%m-01')
        
        return None
    
    def _task_has_documents(self, task_id: int) -> bool:
        """检查任务是否已有文档"""
        try:
            # 简化处理，假设都是项目1的任务
            url = f"{self.config['api']['base_url']}/projects/1/tasks/{task_id}/documents"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                docs = data.get('documents', [])
                return len(docs) > 0
            
        except Exception:
            pass
        
        return False
    
    def _select_template(self, task: Dict) -> Tuple[str, Dict]:
        """智能模板选择"""
        templates = self.config['templates']
        advanced = self.config.get('advanced', {})
        
        if not advanced.get('smart_template_selection', True):
            # 使用默认模板
            default_template = list(templates.keys())[0]
            return default_template, templates[default_template]
        
        # 智能匹配
        title = task.get('title', '').lower()
        description = task.get('description', '').lower()
        tags = []
        
        # 从custom_fields中提取tags
        custom_fields = task.get('custom_fields', {})
        if isinstance(custom_fields, dict):
            tags = custom_fields.get('tags', [])
        
        best_template = None
        best_score = 0
        
        weights = advanced.get('template_weights', {
            'title': 0.6,
            'description': 0.3,
            'tags': 0.1
        })
        
        for template_name, template_config in templates.items():
            score = 0
            conditions = template_config.get('conditions', [])
            
            for condition in conditions:
                field = condition.get('field', '')
                operator = condition.get('operator', '')
                values = condition.get('value', [])
                
                if not isinstance(values, list):
                    values = [values]
                
                field_content = ''
                field_weight = 0
                
                if field == 'title':
                    field_content = title
                    field_weight = weights.get('title', 0.6)
                elif field == 'description':
                    field_content = description
                    field_weight = weights.get('description', 0.3)
                elif field == 'tags':
                    field_content = ' '.join(tags).lower()
                    field_weight = weights.get('tags', 0.1)
                
                # 计算匹配分数
                if operator == 'contains':
                    for value in values:
                        if str(value).lower() in field_content:
                            score += field_weight
                            break
                elif operator == 'equals':
                    for value in values:
                        if field_content == str(value).lower():
                            score += field_weight
                            break
                elif operator == 'regex':
                    for value in values:
                        if re.search(str(value), field_content, re.IGNORECASE):
                            score += field_weight
                            break
            
            if score > best_score:
                best_score = score
                best_template = template_name
        
        # 如果没有匹配的模板，使用默认模板
        if best_template is None:
            best_template = list(templates.keys())[0]
        
        logging.debug(f"任务 {task['id']} 选择模板 '{best_template}' (评分: {best_score:.2f})")
        return best_template, templates[best_template]
    
    def _render_template(self, template: Dict, task: Dict) -> Tuple[str, str]:
        """渲染模板"""
        # 准备模板变量
        variables = template.get('variables', {})
        global_vars = self.config.get('advanced', {}).get('global_variables', {})
        
        # 合并任务数据和模板变量
        template_vars = {
            **global_vars,
            **variables,
            'task_id': task['id'],
            'task_title': task.get('title', ''),
            'task_description': task.get('description', '暂无详细描述'),
            'status': task.get('status', ''),
            'priority': self._get_priority(task),
            'created_at': self._format_datetime(task.get('created_at', '')),
            'generation_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        }
        
        # 渲染标题和内容
        title = self._replace_variables(template['title_template'], template_vars)
        content = self._replace_variables(template['content_template'], template_vars)
        
        return title, content
    
    def _get_priority(self, task: Dict) -> str:
        """获取任务优先级"""
        priority = task.get('priority', '')
        if not priority:
            custom_fields = task.get('custom_fields', {})
            if isinstance(custom_fields, dict):
                priority = custom_fields.get('priority', '未设置')
        return priority or '未设置'
    
    def _format_datetime(self, dt_str: str) -> str:
        """格式化日期时间"""
        if not dt_str:
            return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            # 处理ISO格式日期
            if 'T' in dt_str:
                dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            return dt_str
        except Exception:
            return dt_str
    
    def _replace_variables(self, template: str, variables: Dict) -> str:
        """替换模板变量"""
        result = template
        
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        
        return result
    
    def _create_document(self, task: Dict, title: str, content: str) -> Optional[Dict]:
        """创建文档"""
        if self.dry_run:
            logging.info(f"[DRY RUN] 创建文档: {title}")
            return {"id": "dry_run", "title": title}
        
        url = f"{self.config['api']['base_url']}/documents"
        
        payload = {
            "title": title,
            "content": content,
            "description": f"任务 {task['id']} 的自动生成文档",
            "type": "markdown",
            "status": "draft",
            "project_id": 1,  # 简化处理
            "is_template": False,
            "visibility": "team"
        }
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success'):
                doc = data.get('data', data)  # 兼容不同的响应格式
                logging.info(f"✅ 创建文档 {doc['id']}: {title}")
                
                # 尝试关联到任务
                if self._attach_document_to_task(task['id'], doc['id']):
                    logging.info(f"🔗 文档 {doc['id']} 已关联到任务 {task['id']}")
                
                return doc
            else:
                logging.error(f"创建文档失败: {data}")
                return None
                
        except Exception as e:
            logging.error(f"创建文档失败: {e}")
            return None
    
    def _attach_document_to_task(self, task_id: int, doc_id: int) -> bool:
        """将文档关联到任务"""
        if self.dry_run:
            return True
        
        try:
            url = f"{self.config['api']['base_url']}/projects/1/tasks/{task_id}/documents/{doc_id}/attach"
            payload = {"relationship_type": "main"}
            
            response = self.session.post(url, json=payload)
            
            if response.status_code in [200, 201]:
                return True
            else:
                logging.warning(f"文档关联失败: {response.status_code}")
                return False
                
        except Exception as e:
            logging.warning(f"文档关联失败: {e}")
            return False
    
    def _process_task(self, task: Dict) -> bool:
        """处理单个任务"""
        try:
            # 选择模板
            template_name, template_config = self._select_template(task)
            
            # 渲染模板
            title, content = self._render_template(template_config, task)
            
            # 创建文档
            doc = self._create_document(task, title, content)
            
            if doc:
                self.result.add_success({
                    "task_id": task['id'],
                    "task_title": task.get('title', ''),
                    "doc_id": doc['id'],
                    "doc_title": title,
                    "template": template_name
                })
                return True
            else:
                self.result.add_error(task['id'], "创建文档失败")
                return False
                
        except Exception as e:
            self.result.add_error(task['id'], str(e))
            return False
    
    def _process_tasks_concurrent(self, tasks: List[Dict]):
        """并发处理任务"""
        max_workers = min(
            self.config.get('advanced', {}).get('concurrent_requests', 3),
            len(tasks)
        )
        
        rate_limit = self.config.get('api', {}).get('rate_limit', 0.5)
        
        if max_workers == 1 or len(tasks) == 1:
            # 串行处理
            for i, task in enumerate(tasks, 1):
                if self.config.get('output', {}).get('progress_bar', True):
                    print(f"处理任务 {i}/{len(tasks)}: {task.get('title', '')[:50]}...")
                
                self._process_task(task)
                
                if i < len(tasks):
                    time.sleep(rate_limit)
        else:
            # 并发处理
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_task = {
                    executor.submit(self._process_task, task): task
                    for task in tasks
                }
                
                completed = 0
                for future in as_completed(future_to_task):
                    completed += 1
                    
                    if self.config.get('output', {}).get('progress_bar', True):
                        task = future_to_task[future]
                        print(f"处理任务 {completed}/{len(tasks)}: {task.get('title', '')[:50]}...")
                    
                    # 并发时也需要控制速率
                    time.sleep(rate_limit)
    
    def _generate_report(self):
        """生成总结报告"""
        if not self.config.get('output', {}).get('summary_report', True):
            return
        
        self.result.finish()
        
        # 控制台输出
        print(f"\n📊 批量创建任务文档完成!")
        print(f"   ✅ 成功创建: {self.result.created_count} 个文档")
        print(f"   ⏭️  跳过已有: {self.result.skipped_count} 个任务")
        print(f"   ❌ 创建失败: {self.result.failed_count} 个任务")
        print(f"   📋 总处理数: {self.result.total_count} 个任务")
        print(f"   ⏱️  总耗时: {self.result.duration:.1f} 秒")
        
        if self.result.errors:
            print(f"\n❌ 错误详情:")
            for error in self.result.errors:
                print(f"   任务 {error['task_id']}: {error['error']}")
        
        # 生成文件报告
        self._export_reports()
    
    def _export_reports(self):
        """导出报告文件"""
        output_config = self.config.get('output', {})
        export_formats = output_config.get('export_formats', [])
        
        if not export_formats:
            return
        
        output_dir = Path(output_config.get('output_dir', './batch-docs-output'))
        output_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 准备报告数据
        report_data = {
            'summary': {
                'created_count': self.result.created_count,
                'skipped_count': self.result.skipped_count,
                'failed_count': self.result.failed_count,
                'total_count': self.result.total_count,
                'duration_seconds': self.result.duration,
                'start_time': self.result.start_time.isoformat(),
                'end_time': self.result.end_time.isoformat() if self.result.end_time else None
            },
            'created_documents': self.result.created_docs,
            'errors': self.result.errors
        }
        
        # 导出JSON格式
        if 'json' in export_formats:
            json_file = output_dir / f"batch-docs-report-{timestamp}.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
            logging.info(f"JSON报告已导出: {json_file}")
        
        # 导出CSV格式
        if 'csv' in export_formats:
            try:
                import pandas as pd
                
                # 创建文档CSV
                if self.result.created_docs:
                    df = pd.DataFrame(self.result.created_docs)
                    csv_file = output_dir / f"batch-docs-created-{timestamp}.csv"
                    df.to_csv(csv_file, index=False, encoding='utf-8')
                    logging.info(f"CSV报告已导出: {csv_file}")
                
            except ImportError:
                logging.warning("pandas未安装，跳过CSV导出")
    
    def run(self, task_ids: List[int] = None) -> BatchResult:
        """运行批量文档生成"""
        try:
            # 认证
            if not self._authenticate():
                raise Exception("认证失败")
            
            # 获取任务
            tasks = self._get_tasks(task_ids)
            if not tasks:
                logging.warning("没有找到符合条件的任务")
                return self.result
            
            logging.info(f"开始处理 {len(tasks)} 个任务...")
            
            # 处理任务
            self._process_tasks_concurrent(tasks)
            
            # 生成报告
            self._generate_report()
            
            return self.result
            
        except KeyboardInterrupt:
            logging.warning("用户中断操作")
            self.result.finish()
            return self.result
        except Exception as e:
            logging.error(f"批量处理失败: {e}")
            self.result.finish()
            return self.result


def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description='配置驱动的批量任务文档生成工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python3 scripts/create-task-docs.py                    # 使用默认配置
  python3 scripts/create-task-docs.py --dry-run          # 模拟运行（不创建文档）  
  python3 scripts/create-task-docs.py --config custom.yaml  # 使用自定义配置
  python3 scripts/create-task-docs.py --task-ids 274,275,276  # 指定任务ID
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        type=str,
        help='配置文件路径 (默认: scripts/task-docs-config.yaml)'
    )
    
    parser.add_argument(
        '--task-ids', '-t',
        type=str,
        help='指定任务ID列表，逗号分隔 (例: 274,275,276)'
    )
    
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='模拟运行，不实际创建文档'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='详细输出模式'
    )
    
    return parser.parse_args()


def main():
    """主函数"""
    args = parse_arguments()
    
    # 解析任务ID列表
    task_ids = None
    if args.task_ids:
        try:
            task_ids = [int(tid.strip()) for tid in args.task_ids.split(',')]
        except ValueError:
            print("❌ 任务ID格式错误，请使用逗号分隔的数字")
            sys.exit(1)
    
    try:
        # 创建生成器
        generator = ConfigDrivenDocumentGenerator(
            config_path=args.config,
            dry_run=args.dry_run
        )
        
        if args.verbose:
            logging.getLogger().setLevel(logging.DEBUG)
        
        # 运行生成
        result = generator.run(task_ids)
        
        # 设置退出码
        if result.failed_count > 0:
            sys.exit(1)
        elif result.created_count == 0 and result.skipped_count == 0:
            sys.exit(2)  # 没有任何操作
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n⚠️  用户中断操作")
        sys.exit(130)
    except Exception as e:
        print(f"❌ 程序执行失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()