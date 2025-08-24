#!/usr/bin/env python3
# coding: utf-8

import json
import os
import sys
import time
import asyncio
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from urllib import request as urlrequest
import websockets

DATA_DIR = os.path.join(os.path.dirname(__file__), ".mcp_bridge")
DOCS_DIR = os.path.join(DATA_DIR, "docs")
TASKS_PATH = os.path.join(DATA_DIR, "tasks.json")

os.makedirs(DOCS_DIR, exist_ok=True)
if not os.path.exists(TASKS_PATH):
    with open(TASKS_PATH, "w", encoding="utf-8") as f:
        json.dump({}, f)


def load_tasks():
    try:
        with open(TASKS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_tasks(data):
    with open(TASKS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _env(key, default=None):
    v = os.environ.get(key)
    return v if v is not None and v != "" else default

MCP_API_BASE = _env('MCP_API_BASE', None)
MCP_API_TOKEN = _env('MCP_API_TOKEN', None)

# WebSocket连接管理
websocket_clients = set()
websocket_lock = threading.Lock()


def mcp_call_tool(tool_name: str, payload: dict):
    if not MCP_API_BASE:
        return None, {"ok": False, "error": "MCP_API_BASE_not_set"}
    url = MCP_API_BASE.rstrip('/') + f"/tools/{tool_name}"
    data = json.dumps(payload or {}).encode('utf-8')
    req = urlrequest.Request(url, data=data, headers={'Content-Type': 'application/json'})
    if MCP_API_TOKEN:
        req.add_header('Authorization', f'Bearer {MCP_API_TOKEN}')
    try:
        with urlrequest.urlopen(req, timeout=15) as resp:
            body = resp.read()
            return resp, json.loads(body.decode('utf-8') or '{}')
    except Exception as e:
        return None, {"ok": False, "error": str(e)}


def broadcast_task_update(task_id, task_data):
    """通过WebSocket广播任务更新给所有连接的客户端"""
    if not websocket_clients:
        return
    
    message = {
        "type": "task_update",
        "taskId": task_id,
        "data": task_data,
        "timestamp": int(time.time())
    }
    
    # 异步发送消息给所有WebSocket客户端
    def send_async():
        async def broadcast():
            if websocket_clients:
                # 创建副本避免在迭代时修改集合
                clients_copy = websocket_clients.copy()
                for client in clients_copy:
                    try:
                        await client.send(json.dumps(message))
                    except websockets.exceptions.ConnectionClosed:
                        # 移除已断开的连接
                        with websocket_lock:
                            websocket_clients.discard(client)
                    except Exception as e:
                        print(f"[websocket] 发送消息失败: {e}")
        
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(broadcast())
        except RuntimeError:
            # 如果没有事件循环，创建一个新的
            asyncio.run(broadcast())
    
    # 在新线程中执行异步操作
    thread = threading.Thread(target=send_async)
    thread.daemon = True
    thread.start()


class Handler(BaseHTTPRequestHandler):
    server_version = "MCPBridge/0.2"

    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/mcp/health":
            return self._json_response({"ok": True, "service": "mcp_bridge", "time": int(time.time())})
        elif parsed.path == "/mcp/state":
            # return snapshot of current tasks state
            return self._json_response({"ok": True, "tasks": load_tasks()})
        else:
            self.send_response(404)
            self._set_cors()
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body.decode('utf-8') or '{}')
        except Exception:
            return self._json_response({"ok": False, "error": "invalid_json"}, status=400)

        if parsed.path == "/mcp/create-document":
            return self.handle_create_document(payload)
        elif parsed.path == "/mcp/update-task":
            return self.handle_update_task(payload)
        elif parsed.path == "/mcp/find-task":
            return self.handle_find_task(payload)
        else:
            return self._json_response({"ok": False, "error": "not_found"}, status=404)

    def handle_create_document(self, payload):
        # Expected payload: { taskId, title, projectId?, content }
        task_id = payload.get('taskId')
        if task_id is None:
            return self._json_response({"ok": False, "error": "taskId_required"}, status=400)

        # Prefer real MCP tool: create-and-attach
        resp, data = mcp_call_tool('create-and-attach', {
            "taskId": payload.get('taskId'),
            "projectId": payload.get('projectId'),
            "title": payload.get('title'),
            "content": payload.get('content') or ""
        })
        if resp is not None and isinstance(data, dict) and data.get('ok') is not False:
            return self._json_response({"ok": True, "via": "mcp", "data": data})

        # Fallback: local file store
        title = payload.get('title') or f"Task {task_id} Document"
        content = payload.get('content') or ""
        ts = int(time.time())
        safe_title = ''.join(c for c in title if c.isalnum() or c in ' _-（）()[]')[:60].strip().replace(' ', '_')
        filename = f"task-{task_id}-{ts}.md" if not safe_title else f"task-{task_id}-{safe_title}-{ts}.md"
        path = os.path.join(DOCS_DIR, filename)
        meta = {
            "taskId": task_id,
            "title": title,
            "createdAt": ts,
            "path": path,
        }
        md = f"# {title}\n\n关联任务: {task_id}\n\n---\n\n{content}\n"
        with open(path, 'w', encoding='utf-8') as f:
            f.write(md)
        return self._json_response({"ok": True, "via": "local", "document": meta})

    def handle_update_task(self, payload):
        # Expected payload: { id, updates: { status?: string, ... } }
        task_id = payload.get('id')
        updates = payload.get('updates') or {}
        if task_id is None:
            return self._json_response({"ok": False, "error": "id_required"}, status=400)

        # Prefer real MCP tool: update_task
        resp, data = mcp_call_tool('update_task', {
            "id": payload.get('id'),
            "updates": updates
        })
        if resp is not None and isinstance(data, dict) and data.get('ok') is not False:
            return self._json_response({"ok": True, "via": "mcp", "data": data})

        # Fallback: local file store
        tasks = load_tasks()
        key = str(task_id)
        cur = tasks.get(key) or {"id": task_id}
        cur.update(updates)
        cur['updatedAt'] = int(time.time())
        tasks[key] = cur
        save_tasks(tasks)
        
        # 广播任务更新
        broadcast_task_update(task_id, cur)
        
        return self._json_response({"ok": True, "via": "local", "task": cur})

    def handle_find_task(self, payload):
        # Expected payload: { id?: number, titlePattern?: string }
        resp, data = mcp_call_tool('find_task', payload or {})
        if resp is not None and isinstance(data, dict):
            return self._json_response({"ok": True, "via": "mcp", "data": data})
        return self._json_response({"ok": False, "error": "find_task_failed", "via": "mcp"}, status=500)

    def _json_response(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self._set_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


async def websocket_handler(websocket):
    """WebSocket连接处理器"""
    print(f"[websocket] 新客户端连接: {websocket.remote_address}")
    
    with websocket_lock:
        websocket_clients.add(websocket)
    
    try:
        # 发送欢迎消息
        welcome = {
            "type": "welcome",
            "message": "Connected to MCP Bridge WebSocket",
            "timestamp": int(time.time())
        }
        await websocket.send(json.dumps(welcome))
        
        # 发送当前任务状态快照
        tasks = load_tasks()
        if tasks:
            snapshot = {
                "type": "snapshot",
                "data": tasks,
                "timestamp": int(time.time())
            }
            await websocket.send(json.dumps(snapshot))
        
        # 保持连接活跃，等待客户端消息（虽然我们主要是推送）
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "ping":
                    pong = {"type": "pong", "timestamp": int(time.time())}
                    await websocket.send(json.dumps(pong))
            except json.JSONDecodeError:
                pass  # 忽略无效消息
                
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        with websocket_lock:
            websocket_clients.discard(websocket)
        print(f"[websocket] 客户端断开连接: {websocket.remote_address}")


def start_websocket_server():
    """在新线程中启动WebSocket服务器"""
    def run_server():
        async def server():
            ws_host = os.environ.get('WS_HOST', '127.0.0.1')
            ws_port = int(os.environ.get('WS_PORT', '9001'))
            print(f"[websocket] 启动WebSocket服务器 ws://{ws_host}:{ws_port}/updates")
            
            async with websockets.serve(websocket_handler, ws_host, ws_port):
                await asyncio.Future()  # 保持运行
        
        asyncio.run(server())
    
    thread = threading.Thread(target=run_server)
    thread.daemon = True
    thread.start()


def main():
    # 启动WebSocket服务器
    start_websocket_server()
    
    # 启动HTTP服务器
    host = os.environ.get('MCP_BRIDGE_HOST', '127.0.0.1')
    port = int(os.environ.get('MCP_BRIDGE_PORT', os.environ.get('PORT', '8787')))
    httpd = HTTPServer((host, port), Handler)
    ws_port = int(os.environ.get('WS_PORT', '9001'))
    print(f"[mcp_bridge] HTTP服务器运行在 http://{host}:{port}")
    print(f"[mcp_bridge] WebSocket服务器运行在 ws://127.0.0.1:{ws_port}/updates")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[mcp_bridge] shutting down...")


if __name__ == '__main__':
    main()

