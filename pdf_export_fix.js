// 修复PDF导出空白问题的新实现
const exportToPdfFixed = useCallback(async () => {
  if (!content.trim()) {
    message.warning('文档内容为空，无法导出PDF');
    return;
  }

  setIsExportingPdf(true);
  console.log('🔄 [PDF导出] 开始导出PDF...', { contentLength: content.length, taskId, projectId });

  try {
    // 检查全局html2pdf是否可用 (通过CDN加载)
    if (typeof window.html2pdf === 'undefined') {
      throw new Error('PDF导出库未加载，请刷新页面后重试');
    }

    console.log('✅ [PDF导出] html2pdf库已加载');

    // 简单的Markdown转换HTML函数（避免异步问题）
    const simpleMarkdownToHtml = (md) => {
      return md
        // 标题
        .replace(/^### (.*$)/gm, '<h3 style="color: #333; margin: 16px 0 8px 0; font-size: 18px;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color: #333; margin: 20px 0 10px 0; font-size: 22px;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="color: #333; margin: 24px 0 12px 0; font-size: 28px; border-bottom: 2px solid #1890ff; padding-bottom: 8px;">$1</h1>')
        // 粗体和斜体
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #333; font-weight: 600;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #666;">$1</em>')
        // 代码块
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```(\w+)?/, '').replace(/```$/, '');
          return `<pre style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; margin: 16px 0; font-family: Consolas, Monaco, monospace; font-size: 14px; white-space: pre-wrap; word-wrap: break-word;">${code.trim()}</pre>`;
        })
        // 行内代码
        .replace(/`([^`]+)`/g, '<code style="background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #d73a49;">$1</code>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #1890ff; text-decoration: none;">$1</a>')
        // 列表
        .replace(/^\* (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/^- (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        // 分割线
        .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #e8e8e8; margin: 20px 0;">')
        // 换行
        .replace(/\n/g, '<br>');
    };

    // 转换内容
    const htmlContent = simpleMarkdownToHtml(content);
    console.log('✅ [PDF导出] Markdown转换完成', { htmlLength: htmlContent.length });

    // 如果转换后的内容为空，使用原始内容
    const finalContent = htmlContent.trim() || content.replace(/\n/g, '<br>');

    // 创建完整的HTML文档
    const fullHtmlDocument = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>任务文档</title>
        <style>
          * { 
            box-sizing: border-box; 
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333 !important;
            margin: 0;
            padding: 30px;
            background: #fff !important;
            width: 100%;
            min-height: 100vh;
          }
          .document-container {
            max-width: 750px;
            margin: 0 auto;
            background: #fff;
            padding: 20px;
            min-height: 500px;
          }
          .document-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #1890ff;
          }
          .document-title {
            font-size: 24px;
            font-weight: 600;
            color: #333 !important;
            margin-bottom: 10px;
          }
          .document-meta {
            color: #666 !important;
            font-size: 12px;
          }
          .document-content {
            color: #333 !important;
            min-height: 300px;
            padding: 10px 0;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #333 !important;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 10px;
            line-height: 1.25;
          }
          p {
            margin: 10px 0;
            color: #333 !important;
          }
          ul, ol {
            padding-left: 20px;
            margin: 10px 0;
            color: #333 !important;
          }
          li {
            margin: 5px 0;
            color: #333 !important;
          }
          pre {
            background: #f8f9fa !important;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 12px;
            margin: 10px 0;
            overflow-x: auto;
            font-family: 'Courier New', Consolas, monospace;
            font-size: 12px;
            color: #333 !important;
          }
          code {
            background: #f8f9fa !important;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', Consolas, monospace;
            font-size: 12px;
            color: #e83e8c !important;
          }
          strong {
            font-weight: 600;
            color: #333 !important;
          }
          em {
            font-style: italic;
            color: #666 !important;
          }
          a {
            color: #007bff !important;
            text-decoration: none;
          }
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 15px 0;
          }
          blockquote {
            border-left: 4px solid #007bff;
            padding: 8px 12px;
            margin: 10px 0;
            background: #f8f9fa;
            color: #666 !important;
          }
          /* 确保所有文本都可见 */
          * {
            opacity: 1 !important;
            visibility: visible !important;
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          <div class="document-header">
            <div class="document-title">${title || '任务文档'}</div>
            <div class="document-meta">
              任务ID: ${taskId} | 项目ID: ${projectId} | 导出时间: ${new Date().toLocaleString('zh-CN')}
            </div>
          </div>
          <div class="document-content">
            ${finalContent}
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('✅ [PDF导出] HTML文档创建完成', { documentLength: fullHtmlDocument.length });

    // 创建临时DOM元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtmlDocument;
    
    // 设置样式确保渲染
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '794px'; // A4宽度
    tempDiv.style.height = 'auto';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.visibility = 'hidden'; // 隐藏但保持渲染
    tempDiv.style.zIndex = '-9999';
    
    document.body.appendChild(tempDiv);
    console.log('✅ [PDF导出] 临时DOM元素已添加');

    // 等待DOM渲染
    await new Promise(resolve => setTimeout(resolve, 200));

    // 检查内容
    const textContent = tempDiv.textContent || '';
    if (textContent.length < 10) {
      console.warn('⚠️ [PDF导出] 检测到内容可能为空，使用备用方案');
      tempDiv.innerHTML = `
        <div style="padding: 30px; background: white; font-family: sans-serif;">
          <h1 style="color: #333; border-bottom: 2px solid #1890ff; padding-bottom: 10px;">${title || '任务文档'}</h1>
          <div style="margin: 20px 0; color: #666; font-size: 12px;">
            任务ID: ${taskId} | 项目ID: ${projectId} | 导出时间: ${new Date().toLocaleString('zh-CN')}
          </div>
          <div style="margin-top: 30px; color: #333; line-height: 1.6;">
            ${content.replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    }

    console.log('✅ [PDF导出] 内容检查完成', { 
      textLength: (tempDiv.textContent || '').length 
    });

    // PDF配置选项 - 使用更保守的设置
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `task-${taskId}-document-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.95
      },
      html2canvas: { 
        scale: 1.5, // 降低scale避免内存问题
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true, // 启用日志调试
        width: 794,
        height: null,
        scrollX: 0,
        scrollY: 0,
        letterRendering: true,
        removeContainer: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: false // 暂时不压缩以避免问题
      }
    };

    console.log('🔄 [PDF导出] 开始生成PDF...');
    
    // 直接从整个tempDiv生成PDF
    await window.html2pdf().set(opt).from(tempDiv).save();
    
    console.log('✅ [PDF导出] PDF生成并下载成功');
    message.success('PDF导出成功！');
    
    // 清理临时DOM元素
    document.body.removeChild(tempDiv);
    console.log('🧹 [PDF导出] 临时DOM元素已清理');

  } catch (error) {
    console.error('❌ [PDF导出] PDF导出失败:', error);
    message.error(`PDF导出失败：${error.message || '未知错误'}`);
  } finally {
    setIsExportingPdf(false);
  }
}, [content, title, taskId, projectId]);