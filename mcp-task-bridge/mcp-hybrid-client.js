#!/usr/bin/env node

/**
 * Enhanced MCP client with local fallback support
 * Handles authentication failures by falling back to local MCP bridge
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class HybridMCPClient {
    constructor() {
        this.jenkinsApiBase = process.env.TASK_API_BASE || 'http://localhost:8080/api/v1';
        this.localMcpBase = process.env.LOCAL_MCP_BRIDGE_URL || 'http://localhost:8787';
        this.useLocalBridge = process.env.USE_LOCAL_MCP_BRIDGE === 'true';
        this.authToken = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    /**
     * Create and attach document to task - hybrid approach
     * First tries local MCP bridge, falls back to Jenkins if needed
     */
    async createAndAttachDocument(taskId, content, projectId = 1, title) {
        console.log(`[HYBRID] Creating document for task ${taskId}...`);
        
        // Always try local MCP bridge first for document operations
        try {
            const localResult = await this.createDocumentLocal(taskId, content, title);
            if (localResult.success) {
                console.log(`[HYBRID] ✅ Successfully created document via local MCP bridge`);
                return {
                    success: true,
                    method: 'local_mcp_bridge',
                    task_id: taskId,
                    project_id: projectId,
                    document_path: localResult.document_path,
                    message: `Document created locally for task ${taskId}`
                };
            }
        } catch (error) {
            console.log(`[HYBRID] Local MCP bridge failed: ${error.message}`);
        }

        // If local fails and we're not forced to use local bridge, try Jenkins
        if (!this.useLocalBridge) {
            try {
                const jenkinsResult = await this.createDocumentJenkins(taskId, content, projectId, title);
                if (jenkinsResult.success) {
                    console.log(`[HYBRID] ✅ Successfully created document via Jenkins`);
                    return jenkinsResult;
                }
            } catch (error) {
                console.log(`[HYBRID] Jenkins backend failed: ${error.message}`);
            }
        }

        return {
            success: false,
            error: "Both local MCP bridge and Jenkins backend failed"
        };
    }

    /**
     * Create document using local MCP bridge
     */
    async createDocumentLocal(taskId, content, title) {
        const payload = {
            taskId: taskId,
            title: title || `Task ${taskId} Document`,
            content: content || "",
            projectId: 1
        };

        const response = await axios.post(`${this.localMcpBase}/mcp/create-document`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        const data = response.data;
        if (data.ok) {
            return {
                success: true,
                document_path: data.document?.path,
                created_at: data.document?.createdAt,
                via: 'local'
            };
        } else {
            throw new Error(data.error || 'Local MCP bridge failed');
        }
    }

    /**
     * Create document using Jenkins backend (original method)
     */
    async createDocumentJenkins(taskId, content, projectId, title) {
        // This would be the original Jenkins API call
        // For now, return failure since Jenkins auth is broken
        throw new Error('Jenkins authentication required');
    }

    /**
     * Batch create documents - enhanced version
     */
    async createBatchDocuments(documents) {
        console.log(`[HYBRID] Creating ${documents.length} documents...`);
        
        const results = [];
        const errors = [];

        for (const doc of documents) {
            try {
                const result = await this.createAndAttachDocument(
                    doc.taskId,
                    doc.content,
                    doc.projectId || 1,
                    doc.title
                );
                
                if (result.success) {
                    results.push({
                        taskId: doc.taskId,
                        success: true,
                        method: result.method,
                        document_path: result.document_path
                    });
                } else {
                    errors.push({
                        taskId: doc.taskId,
                        error: result.error
                    });
                }
            } catch (error) {
                errors.push({
                    taskId: doc.taskId,
                    error: error.message
                });
            }
        }

        return {
            success: errors.length === 0,
            created: results.length,
            failed: errors.length,
            results: results,
            errors: errors,
            message: `Created ${results.length} documents, ${errors.length} failed`
        };
    }

    /**
     * Test connection to both backends
     */
    async testConnections() {
        const results = {
            local_mcp_bridge: false,
            jenkins_backend: false
        };

        // Test local MCP bridge
        try {
            const response = await axios.get(`${this.localMcpBase}/mcp/health`, { timeout: 5000 });
            results.local_mcp_bridge = response.data.ok === true;
        } catch (error) {
            console.log(`[TEST] Local MCP bridge not accessible: ${error.message}`);
        }

        // Test Jenkins backend
        try {
            const response = await axios.get(`${this.jenkinsApiBase}/health`, {
                headers: this.getHeaders(),
                timeout: 5000
            });
            results.jenkins_backend = response.status === 200;
        } catch (error) {
            console.log(`[TEST] Jenkins backend not accessible: ${error.message}`);
        }

        return results;
    }
}

// Export for use as module
export default HybridMCPClient;

// If run directly, perform a test
if (import.meta.url === `file://${process.argv[1]}`) {
    async function runTest() {
        console.log('=== Hybrid MCP Client Test ===\\n');
        
        const client = new HybridMCPClient();
        
        // Test connections
        console.log('Testing connections...');
        const connections = await client.testConnections();
        console.log('Connection status:', connections);
        
        if (connections.local_mcp_bridge) {
            console.log('\\n📝 Testing document creation...');
            
            const testResult = await client.createAndAttachDocument(
                546,
                `# Test Document

This is a test document created at ${new Date().toISOString()}.

## Test Content

- Connection test successful
- Local MCP bridge working
- Document creation functional`,
                1,
                `Test Document - ${new Date().toLocaleString()}`
            );
            
            console.log('Test result:', JSON.stringify(testResult, null, 2));
        } else {
            console.log('❌ Cannot test document creation - local MCP bridge not available');
        }
        
        console.log('\\n=== Test Complete ===');
    }
    
    runTest().catch(console.error);
}
