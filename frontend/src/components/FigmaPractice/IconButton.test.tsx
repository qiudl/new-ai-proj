import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IconButton } from './IconButton';

describe('IconButton Component', () => {
  describe('Rendering', () => {
    it('renders with icon', () => {
      render(<IconButton icon="❤️" />);
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });

    it('renders as button element', () => {
      render(<IconButton icon="❤️" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<IconButton icon="❤️" className="custom-icon-btn" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-icon-btn');
    });

    it('renders with custom style', () => {
      render(<IconButton icon="❤️" style={{ marginTop: '10px' }} />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ marginTop: '10px' });
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<IconButton icon="❤️" variant="default" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders primary variant', () => {
      render(<IconButton icon="❤️" variant="primary" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<IconButton icon="❤️" variant="secondary" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders outline variant', () => {
      render(<IconButton icon="❤️" variant="outline" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      render(<IconButton icon="❤️" variant="ghost" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders danger variant', () => {
      render(<IconButton icon="❤️" variant="danger" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<IconButton icon="❤️" size="small" />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ width: expect.any(String) });
    });

    it('renders medium size by default', () => {
      render(<IconButton icon="❤️" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<IconButton icon="❤️" size="large" />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ width: expect.any(String) });
    });
  });

  describe('Shapes', () => {
    it('renders circle shape by default', () => {
      render(<IconButton icon="❤️" />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '50%' });
    });

    it('renders square shape', () => {
      render(<IconButton icon="❤️" shape="square" />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: '0' });
    });

    it('renders rounded shape', () => {
      render(<IconButton icon="❤️" shape="rounded" />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ borderRadius: expect.any(String) });
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      render(<IconButton icon="❤️" disabled />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveStyle({ opacity: 0.5 });
    });

    it('renders loading state', () => {
      render(<IconButton icon="❤️" loading />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('hides original icon when loading', () => {
      render(<IconButton icon="❤️" loading />);
      expect(screen.queryByText('❤️')).not.toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" disabled onClick={handleClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" loading onClick={handleClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip text', () => {
      render(<IconButton icon="❤️" tooltip="Add to favorites" />);
      expect(screen.getByText('Add to favorites')).toBeInTheDocument();
    });

    it('renders without tooltip when not provided', () => {
      render(<IconButton icon="❤️" />);
      expect(screen.queryByText('Add to favorites')).not.toBeInTheDocument();
    });

    it('renders tooltip in top position by default', () => {
      render(<IconButton icon="❤️" tooltip="Top tooltip" />);
      expect(screen.getByText('Top tooltip')).toBeInTheDocument();
    });

    it('renders tooltip in bottom position', () => {
      render(<IconButton icon="❤️" tooltip="Bottom tooltip" tooltipPosition="bottom" />);
      expect(screen.getByText('Bottom tooltip')).toBeInTheDocument();
    });

    it('renders tooltip in left position', () => {
      render(<IconButton icon="❤️" tooltip="Left tooltip" tooltipPosition="left" />);
      expect(screen.getByText('Left tooltip')).toBeInTheDocument();
    });

    it('renders tooltip in right position', () => {
      render(<IconButton icon="❤️" tooltip="Right tooltip" tooltipPosition="right" />);
      expect(screen.getByText('Right tooltip')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" onClick={handleClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick with event object', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" onClick={handleClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });

    it('has pointer cursor when clickable', () => {
      render(<IconButton icon="❤️" onClick={() => {}} />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ cursor: 'pointer' });
    });

    it('has not-allowed cursor when disabled', () => {
      render(<IconButton icon="❤️" disabled />);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ cursor: 'not-allowed' });
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<IconButton icon="❤️" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has aria-label when provided', () => {
      render(<IconButton icon="❤️" ariaLabel="Like button" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Like button');
    });

    it('is keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" onClick={handleClick} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('has proper disabled attribute', () => {
      render(<IconButton icon="❤️" disabled />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Complex Icons', () => {
    it('renders with React element icon', () => {
      const CustomIcon = () => <svg data-testid="custom-svg"><circle /></svg>;
      render(<IconButton icon={<CustomIcon />} />);
      expect(screen.getByTestId('custom-svg')).toBeInTheDocument();
    });

    it('renders with string emoji icon', () => {
      render(<IconButton icon="🛒" />);
      expect(screen.getByText('🛒')).toBeInTheDocument();
    });

    it('renders with text icon', () => {
      render(<IconButton icon="X" />);
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid clicks', () => {
      const handleClick = jest.fn();
      render(<IconButton icon="❤️" onClick={handleClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('handles click during loading state transition', () => {
      const { rerender } = render(<IconButton icon="❤️" onClick={() => {}} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      rerender(<IconButton icon="❤️" loading onClick={() => {}} />);

      fireEvent.click(button);
      // Should not crash
    });

    it('handles empty icon gracefully', () => {
      render(<IconButton icon="" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles very long tooltip text', () => {
      const longTooltip = 'This is a very long tooltip text that might overflow the container';
      render(<IconButton icon="❤️" tooltip={longTooltip} />);
      expect(screen.getByText(longTooltip)).toBeInTheDocument();
    });
  });
});
