/**
 * DiffLine - 单行Diff显示组件
 * 显示单行的变更内容，支持行内高亮
 */

import React from 'react';
import { DiffLine as DiffLineType, InlineChange } from '../../utils/DiffCalculator';
import './DiffLine.css';

export interface DiffLineProps {
  /** Diff行数据 */
  diff: DiffLineType;
  /** 是否显示行号 */
  showLineNumber?: boolean;
}

/**
 * DiffLine组件
 */
const DiffLine: React.FC<DiffLineProps> = ({
  diff,
  showLineNumber = true
}) => {
  // 渲染行内变更高亮
  const renderInlineChanges = (changes: InlineChange[]) => {
    return changes.map((change, index) => {
      const className = `inline-change inline-${change.type}`;
      return (
        <span key={index} className={className}>
          {change.value}
        </span>
      );
    });
  };

  // 渲染行内容
  const renderContent = () => {
    switch (diff.type) {
      case 'added':
        return (
          <div className="line-content">
            <span className="line-text">{diff.content}</span>
          </div>
        );

      case 'removed':
        return (
          <div className="line-content">
            <span className="line-text">{diff.content}</span>
          </div>
        );

      case 'modified':
        // 修改行显示旧内容和新内容
        return (
          <div className="line-content modified-content">
            {diff.inlineChanges && diff.inlineChanges.length > 0 ? (
              // 如果有行内变更数据，使用精确高亮
              <div className="inline-diff">
                {renderInlineChanges(diff.inlineChanges)}
              </div>
            ) : (
              // 否则显示完整的新旧内容
              <>
                <div className="old-line">
                  <span className="line-indicator">-</span>
                  <span className="line-text">{diff.oldContent}</span>
                </div>
                <div className="new-line">
                  <span className="line-indicator">+</span>
                  <span className="line-text">{diff.newContent}</span>
                </div>
              </>
            )}
          </div>
        );

      case 'unchanged':
      default:
        return (
          <div className="line-content">
            <span className="line-text">{diff.content}</span>
          </div>
        );
    }
  };

  // 获取行号显示
  const getLineNumber = () => {
    if (!showLineNumber) return null;

    let prefix = '';
    switch (diff.type) {
      case 'added':
        prefix = '+';
        break;
      case 'removed':
        prefix = '-';
        break;
      case 'modified':
        prefix = '~';
        break;
      default:
        prefix = '';
    }

    return (
      <span className="line-number">
        {prefix}{diff.lineNumber}
      </span>
    );
  };

  return (
    <div className={`diff-line diff-line-${diff.type}`} data-line={diff.lineNumber}>
      {getLineNumber()}
      {renderContent()}
    </div>
  );
};

export default DiffLine;
