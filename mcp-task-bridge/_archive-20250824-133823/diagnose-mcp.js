// 创建MCP配置诊断工具
import { spawn } from 'child_process';
import path from 'path';

async function diagnoseMCPConnection() {
    console.log('🔍 MCP连接诊断开始...\n');
    
    // 检查1: 配置文件路径
    const configPaths = [
        '/Users/johnqiu/coding/www/projects/new-ai-proj/claude_mcp_config.json',
        '/Users/johnqiu/coding/www/projects/new-ai-proj/claude-code-config.json'
    ];
    
    console.log('📁 检查配置文件:');
    for (const configPath of configPaths) {
        try {
            const fs = await import('fs');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log(`✅ ${configPath}:`);
            console.log('   MCP服务器配置:', Object.keys(config.mcpServers || {}));
            
            for (const [serverName, serverConfig] of Object.entries(config.mcpServers || {})) {
                console.log(`   ${serverName}:`, {
                    command: serverConfig.command,
                    args: serverConfig.args,
                    cwd: serverConfig.cwd
                });
            }
        } catch (error) {
            console.log(`❌ ${configPath}: ${error.message}`);
        }
    }
    
    // 检查2: MCP服务器进程
    console.log('\n🔍 检查MCP服务器进程:');
    try {
        const { execSync } = await import('child_process');
        const processes = execSync('ps aux | grep index.js | grep -v grep', { encoding: 'utf8' });
        console.log('运行中的相关进程:');
        console.log(processes || '无相关进程');
    } catch (error) {
        console.log('无相关进程运行');
    }
    
    // 检查3: 测试MCP服务器直接通信
    console.log('\n🔧 测试MCP服务器直接通信:');
    
    const mcpServerPath = path.resolve('/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge/index.js');
    
    return new Promise((resolve) => {
        const mcpProcess = spawn('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/Users/johnqiu/coding/www/projects/new-ai-proj'
        });
        
        let stdout = '';
        let stderr = '';
        
        mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log('📤 MCP stdout:', data.toString().trim());
        });
        
        mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log('📤 MCP stderr:', data.toString().trim());
        });
        
        // 发送测试请求
        setTimeout(() => {
            console.log('📨 发送工具列表请求...');
            const request = {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list',
                params: {}
            };
            
            mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        }, 1000);
        
        // 发送测试工具调用
        setTimeout(() => {
            console.log('📨 发送工具调用请求...');
            const request = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                    name: 'list_tasks',
                    arguments: {}
                }
            };
            
            mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        }, 2000);
        
        // 清理和结束
        setTimeout(() => {
            mcpProcess.kill('SIGTERM');
            console.log('\n📊 诊断结果总结:');
            console.log('stdout输出:', stdout || '无');
            console.log('stderr输出:', stderr || '无');
            resolve();
        }, 4000);
        
        mcpProcess.on('error', (error) => {
            console.log('❌ 进程错误:', error.message);
        });
    });
}

diagnoseMCPConnection();
