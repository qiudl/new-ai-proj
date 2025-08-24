#!/usr/bin/env node

/**
 * 理想的MCP架构示例 - 展示如何正确设计文档服务
 * 
 * 核心原则:
 * 1. 文档服务独立 (不依赖任务系统)
 * 2. 松散耦合 (可选关联)
 * 3. 单一职责 (只管理文档)
 * 4. 依赖注入 (可配置后端)
 */

// ==================== 核心文档服务 ====================
class DocumentService {
    constructor(storage) {
        this.storage = storage;
    }
    
    /**
     * 创建文档 - 核心功能，不依赖任何外部系统
     */
    async createDocument(title, content, metadata = {}) {
        const doc = {
            id: this.generateId(),
            title,
            content,
            metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await this.storage.save(doc);
        
        // 可选：发布事件 (不强制)
        if (this.eventEmitter) {
            this.eventEmitter.emit('document:created', doc);
        }
        
        return doc;
    }
    
    async updateDocument(id, updates) {
        const doc = await this.storage.get(id);
        if (!doc) throw new Error(`Document ${id} not found`);
        
        const updatedDoc = {
            ...doc,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await this.storage.save(updatedDoc);
        return updatedDoc;
    }
    
    async getDocument(id) {
        return await this.storage.get(id);
    }
    
    async listDocuments(filter = {}) {
        return await this.storage.list(filter);
    }
    
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

// ==================== 存储接口 (策略模式) ====================
class LocalFileStorage {
    constructor(basePath = './.documents') {
        this.basePath = basePath;
    }
    
    async save(doc) {
        const fs = await import('fs/promises');
        await fs.mkdir(this.basePath, { recursive: true });
        
        const filePath = `${this.basePath}/doc-${doc.id}.json`;
        await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
        
        // 同时保存Markdown版本
        const mdPath = `${this.basePath}/doc-${doc.id}.md`;
        const mdContent = `# ${doc.title}\\n\\n${doc.content}`;
        await fs.writeFile(mdPath, mdContent);
    }
    
    async get(id) {
        try {
            const fs = await import('fs/promises');
            const filePath = `${this.basePath}/doc-${id}.json`;
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }
    
    async list(filter = {}) {
        const fs = await import('fs/promises');
        try {
            const files = await fs.readdir(this.basePath);
            const docs = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(`${this.basePath}/${file}`, 'utf8');
                    docs.push(JSON.parse(content));
                }
            }
            
            return this.applyFilter(docs, filter);
        } catch (error) {
            return [];
        }
    }
    
    applyFilter(docs, filter) {
        return docs.filter(doc => {
            if (filter.taskId && doc.metadata.taskId !== filter.taskId) return false;
            if (filter.title && !doc.title.includes(filter.title)) return false;
            return true;
        });
    }
}

class DatabaseStorage {
    // 数据库存储实现...
}

class JenkinsStorage {
    // Jenkins存储实现...
}

// ==================== 可选的关联服务 ====================
class TaskLinkingService {
    constructor(taskAPI = null) {
        this.taskAPI = taskAPI;  // 可选依赖
    }
    
    /**
     * 可选地将文档关联到任务
     * 如果任务系统不可用，不影响文档功能
     */
    async linkToTask(docId, taskId) {
        if (!this.taskAPI) {
            console.log(`[LINKING] Task API not available, skipping link for doc ${docId} to task ${taskId}`);
            return { success: false, reason: 'task_api_unavailable' };
        }
        
        try {
            await this.taskAPI.attachDocument(taskId, docId);
            return { success: true };
        } catch (error) {
            console.log(`[LINKING] Failed to link doc ${docId} to task ${taskId}: ${error.message}`);
            return { success: false, reason: error.message };
        }
    }
}

// ==================== 配置化的MCP服务 ====================
class ConfigurableMCPService {
    constructor(config = {}) {
        this.config = {
            storage: 'local',
            taskLinking: 'optional',
            ...config
        };
        
        this.documentService = new DocumentService(this.createStorage());
        this.linkingService = this.createLinkingService();
    }
    
    createStorage() {
        switch (this.config.storage) {
            case 'local':
                return new LocalFileStorage(this.config.storagePath);
            case 'database':
                return new DatabaseStorage(this.config.dbConfig);
            case 'jenkins':
                return new JenkinsStorage(this.config.jenkinsConfig);
            default:
                return new LocalFileStorage();
        }
    }
    
    createLinkingService() {
        if (this.config.taskLinking === 'disabled') {
            return null;
        }
        return new TaskLinkingService(this.config.taskAPI);
    }
    
    /**
     * 统一接口 - 创建文档并可选关联任务
     */
    async createAndOptionallyLink(title, content, taskId = null) {
        // 1. 创建文档 (总是成功，不依赖任何外部系统)
        const doc = await this.documentService.createDocument(title, content, {
            taskId: taskId || undefined
        });
        
        // 2. 可选关联 (失败不影响文档创建)
        let linkResult = null;
        if (taskId && this.linkingService) {
            linkResult = await this.linkingService.linkToTask(doc.id, taskId);
        }
        
        return {
            success: true,
            document: doc,
            linkResult: linkResult,
            message: `✅ 文档已创建${linkResult?.success ? '并关联到任务' : ''}`
        };
    }
    
    /**
     * 批量创建
     */
    async createBatch(documents) {
        const results = [];
        const errors = [];
        
        for (const { title, content, taskId } of documents) {
            try {
                const result = await this.createAndOptionallyLink(title, content, taskId);
                results.push(result);
            } catch (error) {
                errors.push({ title, error: error.message });
            }
        }
        
        return {
            success: errors.length === 0,
            created: results.length,
            failed: errors.length,
            results,
            errors
        };
    }
}

// ==================== 使用示例 ====================
async function demonstrateProperArchitecture() {
    console.log('🏗️  演示正确的MCP架构\\n');
    
    // 配置1: 纯本地模式 (完全独立)
    console.log('📁 配置1: 纯本地文档服务');
    const localMCP = new ConfigurableMCPService({
        storage: 'local',
        storagePath: './ideal-docs',
        taskLinking: 'disabled'
    });
    
    const doc1 = await localMCP.createAndOptionallyLink(
        '独立文档示例',
        '这个文档不依赖任何外部系统，总是能成功创建。'
    );
    console.log('✅', doc1.message);
    
    // 配置2: 可选关联模式 (优雅降级)
    console.log('\\n🔗 配置2: 可选任务关联服务');
    const hybridMCP = new ConfigurableMCPService({
        storage: 'local',
        storagePath: './ideal-docs',
        taskLinking: 'optional',
        taskAPI: null  // 故意设为null模拟任务系统不可用
    });
    
    const doc2 = await hybridMCP.createAndOptionallyLink(
        '任务523理想设计文档',
        `# 任务523的理想设计
        
## 核心原则

1. **文档服务独立**: 不依赖任务系统
2. **可选关联**: 任务关联是额外功能
3. **优雅降级**: 任务系统不可用时，文档功能仍然正常

## 架构优势

- ✅ 高可用性: 文档服务独立运行
- ✅ 低耦合度: 各组件相互独立
- ✅ 易测试: 可以独立测试文档功能
- ✅ 易维护: 各服务独立维护`,
        523  // 指定任务ID，但任务系统不可用
    );
    console.log('✅', doc2.message);
    console.log('   关联结果:', doc2.linkResult?.reason || '无');
    
    // 批量创建示例
    console.log('\\n📚 批量创建测试');
    const batchResult = await hybridMCP.createBatch([
        {
            title: '理想架构-需求文档',
            content: '这是需求分析文档，无论任务系统是否可用都能创建。',
            taskId: 524
        },
        {
            title: '理想架构-设计文档', 
            content: '这是设计文档，专注于文档内容而不是任务关联。',
            taskId: 525
        }
    ]);
    
    console.log(`✅ 批量创建完成: 成功 ${batchResult.created}, 失败 ${batchResult.failed}`);
    
    // 展示文档列表
    console.log('\\n📋 文档列表:');
    const docs = await localMCP.documentService.listDocuments();
    docs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title} (ID: ${doc.id})`);
    });
    
    console.log('\\n🎯 总结:');
    console.log('  - 文档服务完全独立运行');
    console.log('  - 任务关联是可选功能'); 
    console.log('  - 即使Jenkins挂了，文档功能仍然正常');
    console.log('  - 这就是正确的架构设计！');
}

// ==================== 导出 ====================
export {
    DocumentService,
    LocalFileStorage,
    TaskLinkingService, 
    ConfigurableMCPService
};

// 如果直接运行，执行演示
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateProperArchitecture().catch(console.error);
}
