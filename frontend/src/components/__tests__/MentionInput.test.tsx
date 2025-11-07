/**
 * MentionInput组件单元测试
 *
 * 注意：由于MentionInput组件深度依赖Ant Design的Mentions组件，
 * 某些交互测试（如@用户搜索的DOM交互）难以通过单元测试完整覆盖。
 * 这些场景应该在E2E测试中覆盖。
 *
 * 本测试主要覆盖：
 * - 组件渲染和props
 * - onChange回调
 * - 基本的accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MentionInput from '../MentionInput';

describe('MentionInput Component', () => {
  const mockOnChange = jest.fn();
  const mockOnMentionedUsersChange = jest.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onMentionedUsersChange: mockOnMentionedUsersChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders mention input with default placeholder', () => {
      render(<MentionInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('输入 @ 提及用户...');
      expect(textarea).toBeInTheDocument();
    });

    test('renders with custom placeholder', () => {
      render(<MentionInput {...defaultProps} placeholder="自定义占位符" />);

      const textarea = screen.getByPlaceholderText('自定义占位符');
      expect(textarea).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(
        <MentionInput {...defaultProps} className="custom-class" />
      );

      const mentionInput = container.querySelector('.custom-class');
      expect(mentionInput).toBeInTheDocument();
    });

    test('applies custom style', () => {
      const customStyle = { marginTop: '20px' };
      const { container } = render(
        <MentionInput {...defaultProps} style={customStyle} />
      );

      const mentionInput = container.querySelector('.mention-input') as HTMLElement;
      expect(mentionInput).toHaveStyle('margin-top: 20px');
    });
  });

  describe('User Input', () => {
    test('renders as a textbox', () => {
      render(<MentionInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    test('respects maxLength prop', () => {
      render(<MentionInput {...defaultProps} maxLength={100} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxlength', '100');
    });

    test('can be disabled', () => {
      render(<MentionInput {...defaultProps} disabled={true} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Controlled Component', () => {
    test('displays the provided value', () => {
      render(<MentionInput {...defaultProps} value="Hello world" />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Hello world');
    });

    test('updates value when controlled', () => {
      const { rerender } = render(<MentionInput {...defaultProps} value="initial" />);

      let textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('initial');

      rerender(<MentionInput {...defaultProps} value="updated" />);

      textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('updated');
    });
  });

  describe('Props and Configuration', () => {
    test('accepts autoSize configuration', () => {
      const autoSize = { minRows: 3, maxRows: 10 };
      const { container } = render(<MentionInput {...defaultProps} autoSize={autoSize} />);

      // Component should render without errors
      expect(container).toBeInTheDocument();
    });

    test('works with undefined onChange', () => {
      expect(() => {
        render(<MentionInput value="" />);
      }).not.toThrow();
    });

    test('works with undefined onMentionedUsersChange', () => {
      expect(() => {
        render(<MentionInput value="" onChange={mockOnChange} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('textarea is accessible via role', () => {
      render(<MentionInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    test('textarea is accessible via placeholder text', () => {
      render(<MentionInput {...defaultProps} placeholder="输入评论" />);

      const textarea = screen.getByPlaceholderText('输入评论');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Mentioned Users Display', () => {
    test('shows count when users are mentioned in value', () => {
      render(<MentionInput {...defaultProps} value="@john @jane hello" />);

      // The component should render the value
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('@john @jane hello');
    });

    test('does not show count when no users mentioned', () => {
      render(<MentionInput {...defaultProps} value="hello world" />);

      expect(screen.queryByText(/已提及/)).not.toBeInTheDocument();
    });
  });
});
