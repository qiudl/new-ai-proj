#!/usr/bin/env node

/**
 * MD文档分析工具
 * 任务255: MD文件分析与分类策略设计
 * 扫描项目中的所有MD文件，分析内容、结构和关联性
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MDFileAnalyzer {
    constructor() {
        this.files = [];
        this.categories = new Map();
        this.taskRelations = new Map();
        this.duplicates = new Map();
        this.analysis = {
            totalFiles: 0,
            totalSize: 0,
            categories: {},
            taskRelations: {},
            duplicates: [],
            qualityMetrics: {},
            suggestions: []
        };
    }

    /**
     * 扫描指定目录下的所有MD文件
     */
    async scanDirectory(dirPath, relativePath = '') {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = path.join(relativePath, entry.name);
            
            if (entry.isDirectory()) {
                // 递归扫描子目录
                await this.scanDirectory(fullPath, relPath);
            } else if (entry.name.endsWith('.md') || entry.name.endsWith('.MD')) {
                await this.analyzeFile(fullPath, relPath);
            }
        }
    }

    /**
     * 分析单个MD文件
     */
    async analyzeFile(filePath, relativePath) {
        try {
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            const contentHash = crypto.createHash('md5').update(content).digest('hex');
            
            // 提取文件基本信息
            const fileInfo = {
                path: relativePath,
                fullPath: filePath,
                filename: path.basename(filePath),
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                contentHash: contentHash,
                content: content,
                preview: content.substring(0, 500),
                lines: content.split('\n').length
            };

            // 内容分析
            this.analyzeContent(fileInfo);
            
            // 任务关联分析
            this.analyzeTaskRelations(fileInfo);
            
            // 质量评估
            this.assessQuality(fileInfo);
            
            // 重复检测
            this.detectDuplicates(fileInfo);
            
            this.files.push(fileInfo);
            this.analysis.totalFiles++;
            this.analysis.totalSize += stats.size;
            
        } catch (error) {
            console.error(`分析文件失败: ${filePath}`, error.message);
        }
    }

    /**
     * 内容分析和分类
     */
    analyzeContent(fileInfo) {
        const content = fileInfo.content.toLowerCase();
        const filename = fileInfo.filename.toLowerCase();
        
        // 文档类型识别
        const categories = [];
        
        // 1. 任务文档
        if (filename.includes('task') || content.includes('任务') || content.includes('task')) {
            categories.push('task_document');
        }
        
        // 2. 设计文档
        if (content.includes('设计') || content.includes('design') || 
            content.includes('架构') || content.includes('architecture')) {
            categories.push('design_document');
        }
        
        // 3. Bug修复记录
        if (content.includes('fix') || content.includes('bug') || 
            content.includes('修复') || content.includes('问题')) {
            categories.push('bug_fix');
        }
        
        // 4. 使用指南
        if (content.includes('使用') || content.includes('指南') || 
            content.includes('guide') || content.includes('tutorial')) {
            categories.push('user_guide');
        }
        
        // 5. API文档
        if (content.includes('api') || content.includes('接口') || 
            content.includes('endpoint')) {
            categories.push('api_document');
        }
        
        // 6. 开发日志
        if (content.includes('开发') || content.includes('log') || 
            content.includes('changelog') || content.includes('版本')) {
            categories.push('development_log');
        }
        
        // 7. 配置文档
        if (content.includes('config') || content.includes('配置') || 
            content.includes('setup') || content.includes('install')) {
            categories.push('configuration');
        }
        
        // 默认分类
        if (categories.length === 0) {
            categories.push('general');
        }
        
        fileInfo.categories = categories;
        
        // 统计分类
        categories.forEach(category => {
            if (!this.analysis.categories[category]) {
                this.analysis.categories[category] = 0;
            }
            this.analysis.categories[category]++;
        });
        
        // 提取技术栈和关键词
        fileInfo.technologies = this.extractTechnologies(content);
        fileInfo.keywords = this.extractKeywords(content);
    }

    /**
     * 提取技术栈信息
     */
    extractTechnologies(content) {
        const technologies = [];
        const techPatterns = {
            'react': /react|jsx|tsx/gi,
            'vue': /vue|nuxt/gi,
            'node': /node\.?js|npm|yarn/gi,
            'go': /golang?|gin|gorm/gi,
            'python': /python|django|flask/gi,
            'docker': /docker|dockerfile|compose/gi,
            'kubernetes': /k8s|kubernetes|kubectl/gi,
            'postgresql': /postgres|psql|pg/gi,
            'mysql': /mysql/gi,
            'redis': /redis/gi,
            'nginx': /nginx/gi,
            'typescript': /typescript|\.ts|\.tsx/gi,
            'javascript': /javascript|\.js/gi
        };
        
        Object.entries(techPatterns).forEach(([tech, pattern]) => {
            if (pattern.test(content)) {
                technologies.push(tech);
            }
        });
        
        return technologies;
    }

    /**
     * 提取关键词
     */
    extractKeywords(content) {
        // 简单的关键词提取
        const words = content.toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // 返回前10个高频词
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * 分析任务关联性
     */
    analyzeTaskRelations(fileInfo) {
        const content = fileInfo.content;
        const filename = fileInfo.filename;
        
        // 提取任务ID
        const taskIdPatterns = [
            /task[_-]?(\d+)/gi,
            /任务[_\s]*(\d+)/g,
            /#(\d+)/g,
            /id[_\s]*(\d+)/gi
        ];
        
        const taskIds = new Set();
        
        taskIdPatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                const taskId = parseInt(match[1]);
                if (taskId && taskId > 0 && taskId < 10000) { // 合理的任务ID范围
                    taskIds.add(taskId);
                }
            }
        });
        
        // 从文件名提取任务ID
        const filenameMatches = filename.match(/task[_-]?(\d+)/i);
        if (filenameMatches) {
            taskIds.add(parseInt(filenameMatches[1]));
        }
        
        fileInfo.relatedTasks = Array.from(taskIds);
        
        // 关联关系类型判断
        if (fileInfo.relatedTasks.length > 0) {
            // 确定主要关联任务
            const primaryTask = fileInfo.relatedTasks[0];
            
            let relationType = 'reference';
            if (filename.includes('task')) {
                relationType = 'primary';
            } else if (content.includes('输出') || content.includes('结果')) {
                relationType = 'output';
            }
            
            fileInfo.relationInfo = {
                primaryTaskId: primaryTask,
                relationType: relationType,
                confidence: this.calculateRelationConfidence(fileInfo)
            };
        }
    }

    /**
     * 计算关联关系的置信度
     */
    calculateRelationConfidence(fileInfo) {
        let confidence = 0.5; // 基础置信度
        
        // 文件名包含task +0.3
        if (fileInfo.filename.toLowerCase().includes('task')) {
            confidence += 0.3;
        }
        
        // 内容中多次提到任务 +0.2
        const taskMentions = (fileInfo.content.match(/任务|task/gi) || []).length;
        if (taskMentions > 5) {
            confidence += 0.2;
        }
        
        // 包含具体的任务操作 +0.1
        if (/创建|更新|完成|测试/.test(fileInfo.content)) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 质量评估
     */
    assessQuality(fileInfo) {
        let qualityScore = 50; // 基础分数
        const content = fileInfo.content;
        
        // 内容长度评估
        if (content.length > 1000) qualityScore += 10;
        if (content.length > 5000) qualityScore += 10;
        
        // 结构评估
        const headers = (content.match(/^#{1,6}\s/gm) || []).length;
        if (headers > 0) qualityScore += 10;
        if (headers > 3) qualityScore += 5;
        
        // 代码块评估
        const codeBlocks = (content.match(/```/g) || []).length / 2;
        if (codeBlocks > 0) qualityScore += 5;
        
        // 链接评估
        const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
        if (links > 0) qualityScore += 5;
        
        // 列表评估
        const lists = (content.match(/^[-*+]\s/gm) || []).length;
        if (lists > 3) qualityScore += 5;
        
        // 完整性评估
        if (content.includes('目标') || content.includes('目的')) qualityScore += 5;
        if (content.includes('实现') || content.includes('方案')) qualityScore += 5;
        if (content.includes('测试') || content.includes('验证')) qualityScore += 5;
        
        fileInfo.qualityScore = Math.min(qualityScore, 100);
        
        // 质量等级
        if (qualityScore >= 80) fileInfo.qualityLevel = 'excellent';
        else if (qualityScore >= 60) fileInfo.qualityLevel = 'good';
        else if (qualityScore >= 40) fileInfo.qualityLevel = 'fair';
        else fileInfo.qualityLevel = 'poor';
    }

    /**
     * 重复检测
     */
    detectDuplicates(fileInfo) {
        const hash = fileInfo.contentHash;
        
        if (this.duplicates.has(hash)) {
            const existing = this.duplicates.get(hash);
            existing.push(fileInfo.path);
            this.analysis.duplicates.push({
                hash: hash,
                files: [...existing],
                size: fileInfo.size
            });
        } else {
            this.duplicates.set(hash, [fileInfo.path]);
        }
    }

    /**
     * 生成分析报告
     */
    generateReport() {
        // 统计质量指标
        this.analysis.qualityMetrics = {
            excellent: this.files.filter(f => f.qualityLevel === 'excellent').length,
            good: this.files.filter(f => f.qualityLevel === 'good').length,
            fair: this.files.filter(f => f.qualityLevel === 'fair').length,
            poor: this.files.filter(f => f.qualityLevel === 'poor').length,
            averageScore: this.files.reduce((sum, f) => sum + f.qualityScore, 0) / this.files.length
        };

        // 任务关联统计
        const relatedFiles = this.files.filter(f => f.relatedTasks && f.relatedTasks.length > 0);
        this.analysis.taskRelations = {
            totalRelatedFiles: relatedFiles.length,
            relationTypes: {},
            topTasks: this.getTopRelatedTasks()
        };

        // 分类建议
        this.analysis.suggestions = this.generateSuggestions();

        return {
            summary: {
                totalFiles: this.analysis.totalFiles,
                totalSizeMB: (this.analysis.totalSize / (1024 * 1024)).toFixed(2),
                categories: this.analysis.categories,
                qualityDistribution: this.analysis.qualityMetrics,
                taskRelatedFiles: this.analysis.taskRelations.totalRelatedFiles,
                duplicateGroups: this.analysis.duplicates.length
            },
            files: this.files.map(f => ({
                path: f.path,
                filename: f.filename,
                size: f.size,
                categories: f.categories,
                relatedTasks: f.relatedTasks,
                qualityScore: f.qualityScore,
                qualityLevel: f.qualityLevel,
                technologies: f.technologies,
                preview: f.preview.substring(0, 200) + '...'
            })),
            categories: this.analysis.categories,
            taskRelations: this.analysis.taskRelations,
            duplicates: this.analysis.duplicates,
            suggestions: this.analysis.suggestions
        };
    }

    /**
     * 获取关联最多的任务
     */
    getTopRelatedTasks() {
        const taskCounts = {};
        
        this.files.forEach(file => {
            if (file.relatedTasks) {
                file.relatedTasks.forEach(taskId => {
                    taskCounts[taskId] = (taskCounts[taskId] || 0) + 1;
                });
            }
        });
        
        return Object.entries(taskCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([taskId, count]) => ({ taskId: parseInt(taskId), documentCount: count }));
    }

    /**
     * 生成改进建议
     */
    generateSuggestions() {
        const suggestions = [];
        
        // 质量改进建议
        const poorQualityFiles = this.files.filter(f => f.qualityLevel === 'poor').length;
        if (poorQualityFiles > 0) {
            suggestions.push({
                type: 'quality_improvement',
                priority: 'high',
                message: `发现${poorQualityFiles}个低质量文档，建议重新整理或归档`,
                files: this.files.filter(f => f.qualityLevel === 'poor').map(f => f.path)
            });
        }
        
        // 重复文件建议
        if (this.analysis.duplicates.length > 0) {
            suggestions.push({
                type: 'duplicate_removal',
                priority: 'medium',
                message: `发现${this.analysis.duplicates.length}组重复文件，建议合并或删除`,
                duplicates: this.analysis.duplicates
            });
        }
        
        // 任务关联建议
        const unrelatedFiles = this.files.filter(f => !f.relatedTasks || f.relatedTasks.length === 0);
        if (unrelatedFiles.length > 0) {
            suggestions.push({
                type: 'task_association',
                priority: 'medium',
                message: `${unrelatedFiles.length}个文档未关联任务，建议建立关联关系`,
                files: unrelatedFiles.slice(0, 10).map(f => f.path)
            });
        }
        
        // 分类建议
        const generalFiles = this.files.filter(f => f.categories.includes('general'));
        if (generalFiles.length > 10) {
            suggestions.push({
                type: 'categorization',
                priority: 'low',
                message: `${generalFiles.length}个文档分类为通用类型，建议细化分类`,
                files: generalFiles.slice(0, 5).map(f => f.path)
            });
        }
        
        return suggestions;
    }
}

// 主执行函数
async function main() {
    console.log('🔍 启动MD文档分析工具...');
    console.log('📋 任务255: MD文件分析与分类策略设计');
    console.log('');
    
    const analyzer = new MDFileAnalyzer();
    const projectRoot = process.cwd();
    
    try {
        // 扫描项目根目录
        console.log('📁 扫描项目根目录...');
        await analyzer.scanDirectory(projectRoot);
        
        // 生成报告
        console.log('📊 生成分析报告...');
        const report = analyzer.generateReport();
        
        // 输出报告到文件
        const reportPath = path.join(projectRoot, 'md-analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        
        // 生成人类可读的摘要
        console.log('\n🎉 分析完成！');
        console.log('==========================================');
        console.log(`📄 总文件数: ${report.summary.totalFiles}`);
        console.log(`💾 总大小: ${report.summary.totalSizeMB} MB`);
        console.log(`🏷️  分类统计:`);
        Object.entries(report.summary.categories).forEach(([category, count]) => {
            console.log(`   - ${category}: ${count}个文档`);
        });
        console.log(`📈 质量分布:`);
        console.log(`   - 优秀: ${report.summary.qualityDistribution.excellent}个`);
        console.log(`   - 良好: ${report.summary.qualityDistribution.good}个`);
        console.log(`   - 一般: ${report.summary.qualityDistribution.fair}个`);
        console.log(`   - 较差: ${report.summary.qualityDistribution.poor}个`);
        console.log(`🔗 任务关联: ${report.summary.taskRelatedFiles}个文档已关联任务`);
        console.log(`🔄 重复文档: ${report.summary.duplicateGroups}组重复文件`);
        console.log('==========================================');
        
        if (report.suggestions.length > 0) {
            console.log('\n💡 改进建议:');
            report.suggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.message}`);
            });
        }
        
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
        console.log('🎯 下一步: 基于分析结果设计文档导入和分类策略');
        
    } catch (error) {
        console.error('❌ 分析过程中出现错误:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { MDFileAnalyzer };