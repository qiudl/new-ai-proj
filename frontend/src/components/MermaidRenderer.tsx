import React, { useRef, useEffect, useState } from 'react';

interface MermaidRendererProps {
  chart: string;
  id?: string;
}

// 全局Mermaid状态管理
class MermaidStateManager {
  private static instance: MermaidStateManager;
  private initialized = false;
  private renderingMap = new Map<string, boolean>();
  private retryCount = new Map<string, number>();
  
  static getInstance(): MermaidStateManager {
    if (!MermaidStateManager.instance) {
      MermaidStateManager.instance = new MermaidStateManager();
    }
    return MermaidStateManager.instance;
  }
  
  async ensureMermaidReady(): Promise<boolean> {
    if (this.initialized && window.mermaid?.mermaidAPI) {
      return true;
    }
    
    // 等待Mermaid库加载
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (window.mermaid) {
        try {
          await window.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            htmlLabels: true,
            fontFamily: 'Arial, sans-serif'
          });
          
          this.initialized = true;
          return true;
        } catch (error) {
          // initialization retry (silenced)
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // initialization failed (silenced in console)
    return false;
  }
  
  isRendering(id: string): boolean {
    return this.renderingMap.get(id) || false;
  }
  
  setRendering(id: string, rendering: boolean) {
    this.renderingMap.set(id, rendering);
  }
  
  getRetryCount(id: string): number {
    return this.retryCount.get(id) || 0;
  }
  
  incrementRetry(id: string) {
    const current = this.retryCount.get(id) || 0;
    this.retryCount.set(id, current + 1);
  }
  
  clearState(id: string) {
    this.renderingMap.delete(id);
    this.retryCount.delete(id);
  }
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const componentId = id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const stateManager = MermaidStateManager.getInstance();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const renderMermaid = async () => {
      if (!mounted || !containerRef.current) return;
      
      const chartId = `mermaid-svg-${componentId}`;
      
      // 防止重复渲染
      if (stateManager.isRendering(componentId)) {
        // skip duplicate rendering
        return;
      }
      
      stateManager.setRendering(componentId, true);
      
      try {
        // start rendering
        
        // 确保Mermaid库就绪
        const isReady = await stateManager.ensureMermaidReady();
        if (!isReady) {
          throw new Error('Mermaid库初始化失败');
        }
        
        if (!mounted || !containerRef.current) {
          // component unmounted
          return;
        }
        
        // 渲染图表
        const result = await window.mermaid.render(chartId, chart);
        
        if (!mounted || !containerRef.current) {
        // component unmounted after render
          return;
        }
        
        // 应用渲染结果
        containerRef.current.innerHTML = result.svg;
        setStatus('success');
        // render success
        
      } catch (error: any) {
        if (!mounted) return;
        
        const retryCount = stateManager.getRetryCount(componentId);
        const maxRetries = 3;
        
        // render failed (attempt)
        
        if (retryCount < maxRetries) {
          stateManager.incrementRetry(componentId);
          // retry after 1s
          timeoutId = setTimeout(() => {
            stateManager.setRendering(componentId, false);
            renderMermaid();
          }, 1000);
        } else {
          setStatus('error');
          setErrorMessage(error.message || '图表渲染失败');
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div style="
                padding: 16px;
                text-align: center;
                color: #ff4d4f;
                background: #fff2f0;
                border: 1px solid #ffccc7;
                border-radius: 6px;
              ">
                <p>📊 图表渲染失败</p>
                <p style="font-size: 12px; color: #666;">${error.message}</p>
                <details style="margin-top: 8px;">
                  <summary style="cursor: pointer;">查看原始代码</summary>
                  <pre style="text-align: left; background: #f5f5f5; padding: 8px; margin: 8px 0; font-size: 11px;">${chart}</pre>
                </details>
              </div>
            `;
          }
        }
      } finally {
        stateManager.setRendering(componentId, false);
      }
    };

    // 设置全局超时保护
    const globalTimeout = setTimeout(() => {
      if (mounted && status === 'loading') {
        // global timeout triggered
        setStatus('error');
        setErrorMessage('渲染超时');
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="
              padding: 16px;
              text-align: center;
              color: #fa8c16;
              background: #fff7e6;
              border: 1px solid #ffd591;
              border-radius: 6px;
            ">
              <p>⏰ 图表渲染超时</p>
              <p style="font-size: 12px;">请刷新页面重试</p>
            </div>
          `;
        }
      }
    }, 15000); // 15秒超时

    // 开始渲染
    renderMermaid();

    return () => {
      mounted = false;
      stateManager.clearState(componentId);
      if (timeoutId) clearTimeout(timeoutId);
      if (globalTimeout) clearTimeout(globalTimeout);
    };
  }, [chart, componentId]);

  if (status === 'loading') {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        background: '#fafafa',
        border: '1px dashed #d9d9d9',
        borderRadius: '6px',
        margin: '16px 0'
      }}>
        <div style={{ marginBottom: '8px' }}>
          🎨 正在渲染 Mermaid 图表...
        </div>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #1890ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        textAlign: 'center',
        margin: '16px 0',
        padding: '10px',
        border: '1px solid #e8e8e8',
        borderRadius: '6px',
        background: '#fafafa',
        minHeight: '100px'
      }}
    />
  );
};

export default MermaidRenderer;