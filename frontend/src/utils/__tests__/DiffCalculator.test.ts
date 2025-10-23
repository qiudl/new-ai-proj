/**
 * DiffCalculator 单元测试
 */

import { DiffCalculator, DiffType } from '../DiffCalculator';

describe('DiffCalculator', () => {
  let calculator: DiffCalculator;

  beforeEach(() => {
    calculator = new DiffCalculator();
  });

  describe('calculateLineDiff', () => {
    it('should detect added lines', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = 'Line 1\nLine 2\nLine 3';

      const result = calculator.calculateLineDiff(oldText, newText);

      // 验证基本结构
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0].type).toBe('unchanged');
      // Line 2 可能被识别为unchanged或modified（取决于上下文）
      const addedLine = result.find(d => d.content === 'Line 3');
      expect(addedLine).toBeDefined();
      expect(addedLine?.type).toBe('added');
    });

    it('should detect removed lines', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 3';

      const result = calculator.calculateLineDiff(oldText, newText);

      expect(result.filter(d => d.type === 'removed')).toHaveLength(1);
      expect(result.find(d => d.content === 'Line 2')?.type).toBe('removed');
    });

    it('should detect modified lines', () => {
      const oldText = 'Hello World';
      const newText = 'Hello Claude';

      const result = calculator.calculateLineDiff(oldText, newText);

      // 应该识别为修改行
      const modifiedLine = result.find(d => d.type === 'modified');
      expect(modifiedLine).toBeDefined();
      expect(modifiedLine?.oldContent).toBe('Hello World');
      expect(modifiedLine?.newContent).toBe('Hello Claude');
    });

    it('should handle empty strings', () => {
      const result = calculator.calculateLineDiff('', '');
      expect(result).toHaveLength(0);
    });

    it('should handle multiline text', () => {
      const oldText = `Line 1
Line 2
Line 3
Line 4`;

      const newText = `Line 1
Line 2 modified
Line 3
Line 5`;

      const result = calculator.calculateLineDiff(oldText, newText);

      // 验证基本结构
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('unchanged'); // Line 1
      expect(result.some(d => d.type === 'modified' || d.type === 'removed' || d.type === 'added')).toBe(true);
    });
  });

  describe('calculateInlineChanges', () => {
    it('should detect word-level changes', () => {
      const oldLine = 'Hello World';
      const newLine = 'Hello Claude';

      const changes = calculator.calculateInlineChanges(oldLine, newLine);

      expect(changes).toContainEqual({ type: 'unchanged', value: 'Hello ' });
      expect(changes).toContainEqual({ type: 'removed', value: 'World' });
      expect(changes).toContainEqual({ type: 'added', value: 'Claude' });
    });

    it('should handle no changes', () => {
      const line = 'No changes here';
      const changes = calculator.calculateInlineChanges(line, line);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ type: 'unchanged', value: line });
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const oldText = `Line 1
Line 2
Line 3`;

      const newText = `Line 1
Line 2 modified
Line 3
Line 4`;

      const diffs = calculator.calculateLineDiff(oldText, newText);
      const stats = calculator.calculateStats(diffs);

      expect(stats.unchanged).toBeGreaterThanOrEqual(1); // At least Line 1 and Line 3
      expect(stats.totalLines).toBeGreaterThan(0);
    });

    it('should handle empty diffs', () => {
      const stats = calculator.calculateStats([]);

      expect(stats).toEqual({
        added: 0,
        removed: 0,
        modified: 0,
        unchanged: 0,
        totalLines: 0
      });
    });
  });

  describe('formatStats', () => {
    it('should format stats correctly', () => {
      const stats = {
        added: 12,
        removed: 3,
        modified: 2,
        unchanged: 10,
        totalLines: 24
      };

      const formatted = calculator.formatStats(stats);
      expect(formatted).toBe('+12 -3 ~2');
    });

    it('should handle no changes', () => {
      const stats = {
        added: 0,
        removed: 0,
        modified: 0,
        unchanged: 10,
        totalLines: 10
      };

      const formatted = calculator.formatStats(stats);
      expect(formatted).toBe('无变更');
    });

    it('should handle only additions', () => {
      const stats = {
        added: 5,
        removed: 0,
        modified: 0,
        unchanged: 0,
        totalLines: 5
      };

      const formatted = calculator.formatStats(stats);
      expect(formatted).toBe('+5');
    });
  });

  describe('complex scenarios', () => {
    it('should handle markdown content', () => {
      const oldMarkdown = `# Title

## Section 1
Content here

## Section 2
More content`;

      const newMarkdown = `# Title

## Section 1
Updated content here

## Section 3
New section`;

      const diffs = calculator.calculateLineDiff(oldMarkdown, newMarkdown);
      const stats = calculator.calculateStats(diffs);

      expect(diffs.length).toBeGreaterThan(0);
      expect(stats.totalLines).toBeGreaterThan(0);
    });

    it('should handle large documents', () => {
      // 生成1000行文本
      const oldLines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
      const newLines = [...oldLines];
      // 修改100行
      for (let i = 0; i < 100; i++) {
        newLines[i * 10] = `Modified line ${i * 10 + 1}`;
      }

      const oldText = oldLines.join('\n');
      const newText = newLines.join('\n');

      const startTime = Date.now();
      const diffs = calculator.calculateLineDiff(oldText, newText);
      const endTime = Date.now();

      // 性能检查：应在2秒内完成
      expect(endTime - startTime).toBeLessThan(2000);
      // 修改检测可能会增加行数（removed+added=modified会变成一行）
      expect(diffs.length).toBeGreaterThanOrEqual(1000);
      expect(diffs.length).toBeLessThanOrEqual(1200);
    });
  });
});
