/**
 * 变更摘要解析器
 * 解析后端生成的智能变更摘要，提取变更信息并格式化显示
 */

export interface ParsedChange {
  type: 'title' | 'content' | 'other';
  icon: string;
  text: string;
  color: string;
  original: string;
}

export class ChangeSummaryParser {
  /**
   * 解析变更摘要字符串
   * 后端格式示例：
   * - "📝 标题: 添加了「pppp」 | 📄 内容: +10行"
   * - "📝 标题:「旧标题」→「新标题」"
   * - "📄 内容: 已修改"
   */
  static parse(summary: string): ParsedChange[] {
    if (!summary || summary === '无变更') {
      return [];
    }

    // 按 | 分隔不同的变更项
    const parts = summary.split('|').map(p => p.trim());
    const changes: ParsedChange[] = [];

    for (const part of parts) {
      const change = this.parseSingleChange(part);
      if (change) {
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * 解析单个变更项
   */
  private static parseSingleChange(text: string): ParsedChange | null {
    if (!text) return null;

    // 标题变更
    if (text.includes('📝') || text.includes('标题')) {
      return {
        type: 'title',
        icon: '📝',
        text: this.extractText(text),
        color: '#1890ff',
        original: text
      };
    }

    // 内容变更
    if (text.includes('📄') || text.includes('内容')) {
      return {
        type: 'content',
        icon: '📄',
        text: this.extractText(text),
        color: '#52c41a',
        original: text
      };
    }

    // 其他变更
    return {
      type: 'other',
      icon: '•',
      text: text,
      color: '#8c8c8c',
      original: text
    };
  }

  /**
   * 提取变更文本（去除emoji）
   */
  private static extractText(text: string): string {
    // 移除 emoji 符号
    return text.replace(/[📝📄]/g, '').trim();
  }

  /**
   * 格式化显示变更摘要
   * 返回一个简洁的单行文本
   */
  static formatSummary(changes: ParsedChange[]): string {
    if (changes.length === 0) {
      return '无变更';
    }

    return changes.map(c => c.text).join(' · ');
  }

  /**
   * 获取变更的主要类型
   */
  static getPrimaryType(changes: ParsedChange[]): 'title' | 'content' | 'mixed' | 'none' {
    if (changes.length === 0) return 'none';

    const hasTitle = changes.some(c => c.type === 'title');
    const hasContent = changes.some(c => c.type === 'content');

    if (hasTitle && hasContent) return 'mixed';
    if (hasTitle) return 'title';
    if (hasContent) return 'content';

    return 'none';
  }

  /**
   * 获取变更的颜色（用于标签）
   */
  static getChangeColor(changes: ParsedChange[]): string {
    const primaryType = this.getPrimaryType(changes);

    switch (primaryType) {
      case 'title':
        return 'blue';
      case 'content':
        return 'green';
      case 'mixed':
        return 'purple';
      default:
        return 'default';
    }
  }
}
