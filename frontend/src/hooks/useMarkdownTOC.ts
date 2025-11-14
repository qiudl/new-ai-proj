import { useMemo } from 'react';

/**
 * 目录项接口
 */
export interface TOCItem {
  /** 唯一标识符（用于锚点） */
  id: string;
  /** 标题文本 */
  text: string;
  /** 标题级别（1-6） */
  level: number;
  /** 子项 */
  children?: TOCItem[];
}

/**
 * 从 Markdown 内容中提取目录结构
 *
 * @param content Markdown 内容
 * @returns 目录项数组
 *
 * @example
 * const toc = useMarkdownTOC(markdownContent);
 * // [
 * //   { id: 'heading-1', text: 'Heading 1', level: 1 },
 * //   { id: 'heading-2', text: 'Heading 2', level: 2 }
 * // ]
 */
export const useMarkdownTOC = (content: string): TOCItem[] => {
  return useMemo(() => {
    if (!content) return [];

    // 匹配 Markdown 标题（支持 # 到 ###### ）
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const toc: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length; // # 的数量
      const text = match[2].trim(); // 标题文本

      // 生成 ID（转小写、空格替换为连字符、移除特殊字符）
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, ''); // 保留中文字符

      toc.push({ id, text, level });
    }

    return toc;
  }, [content]);
};

/**
 * 将扁平的目录列表转换为树形结构
 *
 * @param items 扁平目录列表
 * @returns 树形目录结构
 */
export const buildTOCTree = (items: TOCItem[]): TOCItem[] => {
  if (items.length === 0) return [];

  const root: TOCItem[] = [];
  const stack: TOCItem[] = [];

  items.forEach(item => {
    const newItem = { ...item, children: [] };

    // 找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= newItem.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // 顶级节点
      root.push(newItem);
    } else {
      // 子节点
      const parent = stack[stack.length - 1];
      if (!parent.children) parent.children = [];
      parent.children.push(newItem);
    }

    stack.push(newItem);
  });

  return root;
};

export default useMarkdownTOC;
