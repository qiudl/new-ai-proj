#!/usr/bin/env node

/**
 * MCP Tools Bridge - Wrapper for MCP tools that routes document operations to local bridge
 * This provides the same interface as the original MCP tools but with working fallback
 */

import { HybridMCPClient } from './mcp-hybrid-client.js';

class MCPToolsBridge {
    constructor() {
        this.hybridClient = new HybridMCPClient();
    }

    /**
     * Create and attach document to task (MCP tool: create-and-attach)
     */
    async createAndAttach(taskId, content, projectId = 1, title) {
        console.log(`[MCP-BRIDGE] create-and-attach: task ${taskId}`);
        
        try {
            const result = await this.hybridClient.createAndAttachDocument(taskId, content, projectId, title);
            
            if (result.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    document_id: result.document_path,
                    method: result.method,
                    message: result.message
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            console.error('[MCP-BRIDGE] create-and-attach error:', error);
            return {
                success: false,
                error: `创建并关联文档失败: ${error.message}`
            };
        }
    }

    /**
     * Create batch documents (MCP tool: create_batch_documents)
     */
    async createBatchDocuments(documents) {
        console.log(`[MCP-BRIDGE] create_batch_documents: ${documents.length} documents`);
        
        try {
            const result = await this.hybridClient.createBatchDocuments(documents);
            
            return {
                success: result.success,
                created: result.created,
                failed: result.failed,
                results: result.results,
                errors: result.errors,
                message: result.message
            };
        } catch (error) {
            console.error('[MCP-BRIDGE] create_batch_documents error:', error);
            return {
                success: false,
                error: `批量创建文档失败: ${error.message}`
            };
        }
    }

    /**
     * Check connections and provide status
     */
    async healthCheck() {
        try {
            const connections = await this.hybridClient.testConnections();
            
            return {
                success: true,
                local_mcp_bridge: connections.local_mcp_bridge,
                jenkins_backend: connections.jenkins_backend,
                preferred_method: connections.local_mcp_bridge ? 'local_bridge' : 'jenkins',
                message: connections.local_mcp_bridge 
                    ? 'Local MCP bridge available - using local fallback'
                    : 'Local MCP bridge unavailable - trying Jenkins'
            };
        } catch (error) {
            return {
                success: false,
                error: `健康检查失败: ${error.message}`
            };
        }
    }
}

// Export the bridge
export default MCPToolsBridge;

// Test interface
if (import.meta.url === `file://${process.argv[1]}`) {
    async function testMCPBridge() {
        console.log('=== MCP Tools Bridge Test ===\\n');
        
        const bridge = new MCPToolsBridge();
        
        // Health check
        console.log('🔍 Running health check...');
        const health = await bridge.healthCheck();
        console.log('Health status:', JSON.stringify(health, null, 2));
        
        if (health.success && health.local_mcp_bridge) {
            console.log('\\n📝 Testing create-and-attach...');
            
            const createResult = await bridge.createAndAttach(
                546,
                `# MCP Tools Bridge Test

This document was created using the MCP Tools Bridge at ${new Date().toISOString()}.

## Features

- ✅ Local MCP bridge integration
- ✅ Fallback to Jenkins backend
- ✅ Compatible with original MCP tools interface
- ✅ Handles authentication failures gracefully

## Status

The bridge is working correctly and can create documents even when the Jenkins backend requires authentication.`,
                1,
                `MCP Bridge Test - ${new Date().toLocaleString()}`
            );
            
            console.log('Create result:', JSON.stringify(createResult, null, 2));
            
            console.log('\\n📚 Testing batch document creation...');
            
            const batchResult = await bridge.createBatchDocuments([
                {
                    taskId: 547,
                    title: 'Batch Test Document 1',
                    content: '# Batch Test 1\\n\\nThis is the first batch test document.',
                    projectId: 1
                },
                {
                    taskId: 548,
                    title: 'Batch Test Document 2',
                    content: '# Batch Test 2\\n\\nThis is the second batch test document.',
                    projectId: 1
                }
            ]);
            
            console.log('Batch result:', JSON.stringify(batchResult, null, 2));
        } else {
            console.log('❌ Cannot test document operations - local MCP bridge not available');
        }
        
        console.log('\\n=== Test Complete ===');
    }
    
    testMCPBridge().catch(console.error);
}
