#!/usr/bin/env node

/**
 * 文档整理工具
 * 基于MD文件分析结果，自动整理和重命名文档到标准目录结构
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DocumentOrganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.docsRoot = path.join(this.projectRoot, 'docs');
        this.report = null;
        this.operations = [];
        this.conflicts = [];
        
        // 目标目录结构
        this.targetStructure = {
            'tasks': 'docs/tasks',
            'designs': 'docs/designs', 
            'guides': 'docs/guides',
            'apis': 'docs/apis',
            'development': 'docs/development',
            'configurations': 'docs/configurations',
            'templates': 'docs/templates',
            'archived': 'docs/archived'
        };
        
        // 分类映射
        this.categoryMapping = {
            'task_document': 'tasks',
            'design_document': 'designs',
            'user_guide': 'guides',
            'api_document': 'apis',
            'development_log': 'development',
            'configuration': 'configurations',
            'bug_fix': 'development', // Bug修复归入开发日志
            'general': 'archived' // 通用文档先归档
        };
    }

    /**
     * 加载分析报告
     */
    loadAnalysisReport() {
        const reportPath = path.join(this.projectRoot, 'md-analysis-report.json');
        if (!fs.existsSync(reportPath)) {
            throw new Error('分析报告不存在，请先运行 md-analyzer.js');
        }
        
        this.report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        console.log(`📊 已加载分析报告: ${this.report.summary.totalFiles}个文档`);
    }

    /**
     * 创建目标目录结构
     */
    createDirectoryStructure() {
        console.log('📁 创建目标目录结构...');
        
        // 创建主docs目录
        if (!fs.existsSync(this.docsRoot)) {
            fs.mkdirSync(this.docsRoot, { recursive: true });
        }
        
        // 创建子目录
        Object.values(this.targetStructure).forEach(dirPath => {
            const fullPath = path.join(this.projectRoot, dirPath);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`  ✅ 创建目录: ${dirPath}`);
            }
        });
        
        // 创建项目子目录（用于任务文档）
        const tasksDir = path.join(this.docsRoot, 'tasks');
        for (let i = 1; i <= 10; i++) {
            const projectDir = path.join(tasksDir, `project-${i}`);
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }
        }
    }

    /**
     * 分析文档并生成移动计划
     */
    generateMoveOperations() {
        console.log('🔍 分析文档并生成移动计划...');
        
        this.report.files.forEach(file => {
            const operation = this.planFileMove(file);
            if (operation) {
                this.operations.push(operation);
            }
        });
        
        console.log(`📋 生成${this.operations.length}个移动操作`);
        console.log(`⚠️  发现${this.conflicts.length}个冲突`);
    }

    /**
     * 规划单个文件的移动操作
     */
    planFileMove(fileInfo) {
        const sourcePath = fileInfo.path;
        const sourceFullPath = path.join(this.projectRoot, sourcePath);
        
        // 跳过已经在docs目录下的文件
        if (sourcePath.startsWith('docs/')) {
            return null;
        }
        
        // 跳过不存在的文件
        if (!fs.existsSync(sourceFullPath)) {
            return null;
        }
        
        // 确定目标分类
        const targetCategory = this.determineTargetCategory(fileInfo);
        const targetDir = this.targetStructure[targetCategory];
        
        // 生成新文件名
        const newFileName = this.generateNewFileName(fileInfo, targetCategory);
        const targetPath = path.join(targetDir, newFileName);
        const targetFullPath = path.join(this.projectRoot, targetPath);
        
        // 检查冲突
        if (fs.existsSync(targetFullPath)) {
            this.conflicts.push({
                source: sourcePath,
                target: targetPath,
                reason: 'file_exists'
            });
            return null;
        }
        
        return {
            source: sourcePath,
            target: targetPath,
            sourceFullPath: sourceFullPath,
            targetFullPath: targetFullPath,
            category: targetCategory,
            fileName: newFileName,
            fileInfo: fileInfo
        };
    }

    /**
     * 确定文件的目标分类
     */
    determineTargetCategory(fileInfo) {
        // 优先使用最具体的分类
        for (const category of fileInfo.categories) {
            if (this.categoryMapping[category]) {
                return this.categoryMapping[category];
            }
        }
        
        // 默认归档
        return 'archived';
    }

    /**
     * 生成标准化的文件名
     */
    generateNewFileName(fileInfo, category) {
        const originalName = fileInfo.filename;
        const nameWithoutExt = path.parse(originalName).name;
        
        // 任务文档特殊处理
        if (category === 'tasks' && fileInfo.relatedTasks && fileInfo.relatedTasks.length > 0) {
            const taskId = fileInfo.relatedTasks[0];
            const projectId = this.guessProjectId(fileInfo);
            const description = this.extractDescription(nameWithoutExt);
            return `task-${projectId}-${taskId}-${description}.md`;
        }
        
        // API文档特殊处理
        if (category === 'apis') {
            const description = this.extractDescription(nameWithoutExt);
            return `api-v1-${description}.md`;
        }
        
        // 设计文档特殊处理
        if (category === 'designs') {
            const description = this.extractDescription(nameWithoutExt);
            return `design-${description}.md`;
        }
        
        // 其他文档保持原名，但标准化格式
        return this.standardizeFileName(originalName);
    }

    /**
     * 猜测项目ID
     */
    guessProjectId(fileInfo) {
        // 从文件路径或内容中猜测项目ID
        const pathParts = fileInfo.path.split('/');
        for (const part of pathParts) {
            const match = part.match(/project[_-]?(\d+)/i);
            if (match) {
                return match[1];
            }
        }
        
        // 默认项目1
        return '1';
    }

    /**
     * 提取文件描述
     */
    extractDescription(fileName) {
        return fileName
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-') // 替换特殊字符为连字符
            .replace(/^-+|-+$/g, '') // 移除首尾连字符
            .replace(/-+/g, '-') // 合并多个连字符
            .substring(0, 50); // 限制长度
    }

    /**
     * 标准化文件名
     */
    standardizeFileName(fileName) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.parse(fileName).name;
        const standardized = this.extractDescription(nameWithoutExt);
        return `${standardized}${ext}`;
    }

    /**
     * 执行文档移动操作
     */
    async executeOperations(dryRun = true) {
        console.log(`🚀 ${dryRun ? '模拟' : '执行'}文档移动操作...`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const operation of this.operations) {
            try {
                if (dryRun) {
                    console.log(`  📝 ${operation.source} -> ${operation.target}`);
                } else {
                    // 确保目标目录存在
                    const targetDir = path.dirname(operation.targetFullPath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    
                    // 移动文件
                    fs.renameSync(operation.sourceFullPath, operation.targetFullPath);
                    console.log(`  ✅ ${operation.source} -> ${operation.target}`);
                }
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push({
                    operation: operation,
                    error: error.message
                });
                console.log(`  ❌ ${operation.source}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 操作统计:`);
        console.log(`  成功: ${successCount}`);
        console.log(`  失败: ${errorCount}`);
        console.log(`  冲突: ${this.conflicts.length}`);
        
        return {
            success: successCount,
            errors: errorCount,
            conflicts: this.conflicts.length,
            errorDetails: errors
        };
    }

    /**
     * 处理重复文件
     */
    handleDuplicates() {
        console.log('🔄 处理重复文件...');
        
        if (!this.report.duplicates || this.report.duplicates.length === 0) {
            console.log('  ✅ 没有发现重复文件');
            return;
        }
        
        const duplicatesHandled = [];
        
        this.report.duplicates.forEach((duplicateGroup, index) => {
            console.log(`\n📄 重复组 ${index + 1}:`);
            duplicateGroup.files.forEach((filePath, fileIndex) => {
                if (fileIndex === 0) {
                    console.log(`  🎯 保留: ${filePath} (主文件)`);
                } else {
                    console.log(`  🗑️  删除: ${filePath} (重复)`);
                    duplicatesHandled.push(filePath);
                }
            });
        });
        
        console.log(`\n📊 重复文件统计:`);
        console.log(`  重复组数: ${this.report.duplicates.length}`);
        console.log(`  待删除文件: ${duplicatesHandled.length}`);
        
        return duplicatesHandled;
    }

    /**
     * 生成移动报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: this.report.summary.totalFiles,
                operationsPlanned: this.operations.length,
                conflicts: this.conflicts.length,
                categoriesUsed: Object.keys(this.targetStructure)
            },
            operations: this.operations.map(op => ({
                source: op.source,
                target: op.target,
                category: op.category,
                fileName: op.fileName
            })),
            conflicts: this.conflicts,
            directoryStructure: this.targetStructure
        };
        
        const reportPath = path.join(this.projectRoot, 'docs-organization-plan.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 移动计划已保存到: ${reportPath}`);
        
        return report;
    }
}

// 主执行函数
async function main() {
    console.log('📁 启动文档整理工具...');
    console.log('🎯 目标: 将散乱的MD文件整理到标准目录结构');
    console.log('');
    
    const organizer = new DocumentOrganizer();
    
    try {
        // 1. 加载分析报告
        organizer.loadAnalysisReport();
        
        // 2. 创建目标目录结构
        organizer.createDirectoryStructure();
        
        // 3. 生成移动计划
        organizer.generateMoveOperations();
        
        // 4. 处理重复文件
        organizer.handleDuplicates();
        
        // 5. 生成报告
        const report = organizer.generateReport();
        
        console.log('\n🎉 文档整理计划生成完成！');
        console.log('==========================================');
        console.log(`📁 目标目录: ${organizer.docsRoot}`);
        console.log(`📄 计划移动: ${report.summary.operationsPlanned}个文件`);
        console.log(`⚠️  发现冲突: ${report.summary.conflicts}个`);
        console.log('==========================================');
        
        // 6. 执行模拟运行
        console.log('\n🔍 执行模拟运行...');
        const result = await organizer.executeOperations(true);
        
        console.log('\n💡 下一步操作:');
        console.log('1. 检查生成的计划文件: docs-organization-plan.json');
        console.log('2. 解决冲突文件');
        console.log('3. 运行: node docs-organizer.js --execute 执行实际移动');
        
    } catch (error) {
        console.error('❌ 文档整理过程中出现错误:', error.message);
        process.exit(1);
    }
}

// 检查命令行参数
const args = process.argv.slice(2);
const shouldExecute = args.includes('--execute');

// 如果直接运行此脚本
if (require.main === module) {
    if (shouldExecute) {
        console.log('⚠️  执行模式: 将实际移动文件');
        console.log('确认要继续吗? (Ctrl+C 取消)');
        setTimeout(() => {
            main().then(() => {
                const organizer = new DocumentOrganizer();
                organizer.loadAnalysisReport();
                organizer.generateMoveOperations();
                organizer.executeOperations(false);
            });
        }, 3000);
    } else {
        main();
    }
}

module.exports = { DocumentOrganizer };