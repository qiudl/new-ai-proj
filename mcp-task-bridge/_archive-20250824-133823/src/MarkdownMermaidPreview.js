import React, { useEffect, useMemo, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import mermaid from 'mermaid';
// 通用的 Markdown + Mermaid 预览组件（方案A）
// 用法: <MarkdownMermaidPreview markdown={dbMarkdownContent} />
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
const defaultFence = md.renderer.rules.fence ?? ((tokens, idx, opts, env, self) => self.renderToken(tokens, idx, opts));
md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const lang = (token.info || '').trim().toLowerCase();
    if (lang === 'mermaid') {
        return `\n<div class="mermaid">\n${token.content}\n</div>\n`;
    }
    return defaultFence(tokens, idx, opts, env, self);
};
export const MarkdownMermaidPreview = ({ markdown, securityLevel = 'loose' }) => {
    const html = useMemo(() => md.render(markdown ?? ''), [markdown]);
    const ref = useRef(null);
    useEffect(() => {
        // 初始化 mermaid。若你的环境有更严格的 CSP，可改为 'strict' 并确保图定义不含不安全内容
        mermaid.initialize({ startOnLoad: false, securityLevel });
        // 让 DOM 完全注入后再触发渲染
        const el = ref.current;
        if (!el)
            return;
        // 兼容 mermaid v10+ API（run 更友好）；如需支持旧版可改为 mermaid.init(undefined, el)
        Promise.resolve()
            .then(() => mermaid.run({ querySelector: '.mermaid' }))
            .catch((err) => {
            // 可选: 在页面上显示更友好的错误提示
            // console.error('Mermaid 渲染失败', err);
        });
    }, [html, securityLevel]);
    return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }}/>;
};
