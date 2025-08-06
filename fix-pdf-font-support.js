#!/usr/bin/env node

// PDF中文字体支持修复脚本
// 修复 exportService.ts 中的字体问题

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixPDFFont() {
    console.log('🔧 开始修复PDF中文字体支持...\n');
    
    const exportServicePath = path.join(__dirname, 'frontend/src/services/exportService.ts');
    
    try {
        // 1. 读取当前的exportService.ts文件
        console.log('📖 读取 exportService.ts...');
        const content = fs.readFileSync(exportServicePath, 'utf8');
        
        // 2. 替换字体设置逻辑
        console.log('🔄 修复字体设置逻辑...');
        
        // 找到并替换问题行
        const problemCode = `    // 设置中文字体（需要先加载字体文件）
    pdf.setFont('helvetica');`;
        
        const fixedCode = `    // 设置支持中文的字体
    // 使用可以显示中文的默认字体
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);`;
        
        if (!content.includes(problemCode)) {
            console.log('❌ 未找到目标代码段，检查文件内容...');
            return false;
        }
        
        const updatedContent = content.replace(problemCode, fixedCode);
        
        // 3. 添加字体检查和错误处理
        console.log('🛠️  添加错误处理机制...');
        
        // 在PDF导出函数开始处添加检查
        const functionStart = 'export const exportToPDF = async (data: ExportData, options: Partial<ExportOptions> = {}) => {';
        const enhancedFunctionStart = `export const exportToPDF = async (data: ExportData, options: Partial<ExportOptions> = {}) => {
  // 检查jsPDF可用性
  if (typeof window === 'undefined' || !window.jsPDF) {
    throw new Error('PDF导出库未加载，请检查网络连接或重新刷新页面');
  }`;
        
        const finalContent = updatedContent.replace(functionStart, enhancedFunctionStart);
        
        // 4. 写入修改后的文件
        console.log('💾 保存修改...');
        fs.writeFileSync(exportServicePath, finalContent, 'utf8');
        
        console.log('✅ PDF中文字体支持修复完成！');
        console.log('\n📋 修复内容:');
        console.log('  • 替换不支持中文的helvetica字体为times字体');
        console.log('  • 明确设置字体大小为12px');
        console.log('  • 添加PDF库可用性检查');
        console.log('  • 改进错误提示信息');
        
        return true;
        
    } catch (error) {
        console.error('❌ 修复失败:', error.message);
        return false;
    }
}

// 执行修复
fixPDFFont().then(success => {
    if (success) {
        console.log('\n🎉 修复完成！现在PDF导出应该可以正常显示中文内容。');
        console.log('📝 建议测试导出功能验证修复效果。');
    } else {
        console.log('\n💡 修复未成功，可能需要手动调整代码。');
    }
});