#!/usr/bin/env python3

import asyncio
import json
import websockets

async def test_websocket():
    uri = "ws://127.0.0.1:9001"
    print(f"连接到 {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("WebSocket 连接成功!")
            
            # 监听消息
            async for message in websocket:
                data = json.loads(message)
                print(f"收到消息: {data}")
                
                # 如果是欢迎消息，发送一个ping
                if data.get("type") == "welcome":
                    ping = {"type": "ping", "timestamp": int(time.time())}
                    await websocket.send(json.dumps(ping))
                    print("发送 ping")
                
                # 如果是pong，测试完成
                if data.get("type") == "pong":
                    print("收到 pong，测试完成!")
                    break
    except Exception as e:
        print(f"连接错误: {e}")

if __name__ == "__main__":
    import time
    asyncio.run(test_websocket())
