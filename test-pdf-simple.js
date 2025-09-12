/**
 * 简单的PDF测试 - 验证问题根源
 */

// 模拟前端环境
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

function testPDFGeneration() {
  console.log('🧪 开始简单PDF生成测试...');
  
  try {
    // 创建PDF实例
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // 测试1: 英文内容
    console.log('📝 测试1: 英文内容');
    pdf.setFontSize(16);
    pdf.text('English Test Content', 20, 20);
    
    // 测试2: 中文内容（这里应该会有问题）
    console.log('📝 测试2: 中文内容');
    pdf.text('中文测试内容 - 这里可能显示为空白', 20, 40);
    
    // 测试3: 添加表格
    console.log('📊 测试3: 表格内容');
    pdf.autoTable({
      startY: 60,
      head: [['英文列', '中文列', '数字列']],
      body: [
        ['English', '中文内容', '123'],
        ['Test', '测试数据', '456'],
        ['Content', '更多中文', '789']
      ],
      margin: { left: 20 },
      styles: { fontSize: 10 }
    });
    
    // 获取PDF输出
    const pdfOutput = pdf.output('blob');
    console.log(`📄 PDF生成完成，大小: ${pdfOutput.size} bytes`);
    
    if (pdfOutput.size === 0) {
      console.log('❌ PDF内容为空！');
      return false;
    }
    
    if (pdfOutput.size < 1000) {
      console.log('⚠️ PDF文件过小，可能内容有问题');
      return false;
    }
    
    // 保存测试文件
    const fs = require('fs');
    const buffer = Buffer.from(await pdfOutput.arrayBuffer());
    fs.writeFileSync('/tmp/test-pdf-output.pdf', buffer);
    console.log('✅ 测试PDF已保存到 /tmp/test-pdf-output.pdf');
    
    return true;
    
  } catch (error) {
    console.error('❌ PDF生成失败:', error);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testPDFGeneration();
}