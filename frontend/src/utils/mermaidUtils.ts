// Mermaid 统一初始化和渲染工具
// 解决 TaskMarkdownEditor 和 TaskDocumentEditor 之间的初始化冲突问题

declare global {
  interface Window {
    mermaid?: any;
    mermaidInitialized: boolean;
    mermaidConfig?: any;
  }
}

// 统一的 Mermaid 配置
const UNIFIED_MERMAID_CONFIG = {
  startOnLoad: false, 
  theme: 'default',
  securityLevel: 'loose',
  htmlLabels: true,
  fontFamily: 'Arial, sans-serif',
  // 通用优化配置
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  sequence: {
    useMaxWidth: true,
    wrap: true,
    actorMargin: 50
  },
  gantt: {
    useMaxWidth: true
  },
  git: {
    useMaxWidth: true
  },
  journey: {
    useMaxWidth: true
  },
  timeline: {
    useMaxWidth: true
  }
};

/**
 * 确保 Mermaid 库已加载并统一初始化
 * @param retryCount 重试次数
 * @returns Promise<boolean> 是否成功初始化
 */
export async function ensureMermaidReady(retryCount: number = 20): Promise<boolean> {
  let attempts = 0;
  
  while (attempts < retryCount) {
    // 检查 Mermaid 库是否已加载
    if (typeof window !== 'undefined' && window.mermaid) {
      // 检查是否已经初始化过
      if (!window.mermaidInitialized) {
        try {
          
          // 统一初始化
          window.mermaid.initialize(UNIFIED_MERMAID_CONFIG);
          window.mermaidInitialized = true;
          window.mermaidConfig = UNIFIED_MERMAID_CONFIG;
          
          return true;
        } catch (error) {
          console.error('❌ [MermaidUtils] Mermaid 初始化失败:', error);
          return false;
        }
      } else {
        // 已经初始化过，直接返回成功
        return true;
      }
    }
    
    // 等待 100ms 后重试
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  console.error('❌ [MermaidUtils] Mermaid 库加载超时');
  return false;
}

/**
 * 统一的 Mermaid 图表渲染方法
 * @param code Mermaid 代码
 * @param id 可选的图表 ID
 * @returns Promise<{svg: string, error?: string}> 渲染结果
 */
export async function renderMermaidDiagram(code: string, id?: string): Promise<{svg: string, error?: string}> {
  try {
    // 确保 Mermaid 已就绪
    const isReady = await ensureMermaidReady();
    if (!isReady) {
      throw new Error('Mermaid 库未能加载或初始化');
    }
    
    // 生成唯一 ID
    const diagramId = id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 清理代码
    const cleanCode = code.replace(/^\n+/, '').replace(/\n+$/, '');
    
    
    // 渲染图表
    const { svg } = await window.mermaid.render(diagramId, cleanCode);
    
    if (!svg) {
      throw new Error('SVG 渲染结果为空');
    }
    
    return { svg };
    
  } catch (error: any) {
    const errorMessage = error.message || '图表渲染失败';
    console.error('❌ [MermaidUtils] 图表渲染失败:', errorMessage);
    
    return {
      svg: '',
      error: errorMessage
    };
  }
}

/**
 * 创建错误显示容器
 * @param error 错误信息
 * @param code 原始代码
 * @returns HTML 字符串
 */
export function createErrorContainer(error: string, code: string): string {
  return `
    <div style="
      border: 1px dashed #ff4d4f;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      color: #ff4d4f;
      background: #fff2f0;
      margin: 16px 0;
      position: relative;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Mermaid 渲染失败</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 12px;">${error}</div>
      
      <!-- 常见解决方案提示 -->
      <div style="
        background: #fffbe6;
        border: 1px solid #ffe58f;
        border-radius: 4px;
        padding: 8px;
        margin: 12px 0;
        text-align: left;
        font-size: 11px;
        color: #d89614;
      ">
        <strong>💡 可能的解决方案：</strong><br>
        • 检查图表语法是否正确<br>
        • 刷新页面重新加载 Mermaid 库<br>
        • 检查网络连接是否正常<br>
        • 尝试使用更简单的图表语法
      </div>
      
      <details style="text-align: left; font-size: 12px;">
        <summary style="cursor: pointer; color: #1890ff;">查看原始代码</summary>
        <pre style="
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          margin-top: 8px;
          font-size: 11px;
          overflow-x: auto;
          border: 1px solid #d9d9d9;
        ">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </details>
      
      <!-- 手动重试按钮 -->
      <button 
        onclick="window.location.reload();" 
        style="
          background: #1890ff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          margin-top: 8px;
        "
        onmouseover="this.style.background='#40a9ff'"
        onmouseout="this.style.background='#1890ff'"
      >
        🔄 刷新页面重试
      </button>
    </div>
  `;
}

/**
 * 创建加载中显示容器
 * @returns HTML 字符串
 */
export function createLoadingContainer(): string {
  return `
    <div style="
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      color: #666;
      background: #fafafa;
      margin: 16px 0;
    ">
      <div>🎨 正在渲染 Mermaid 图表...</div>
    </div>
  `;
}

/**
 * 获取当前 Mermaid 配置
 * @returns Mermaid 配置对象
 */
export function getMermaidConfig() {
  return UNIFIED_MERMAID_CONFIG;
}

/**
 * 重置 Mermaid 初始化状态（用于调试）
 */
export function resetMermaidState(): void {
  if (typeof window !== 'undefined') {
    window.mermaidInitialized = false;
    window.mermaidConfig = undefined;
  }
}