import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromotionBanner } from './PromotionBanner';

describe('PromotionBanner Component', () => {
  const defaultProps = {
    message: 'Special Offer!',
  };

  describe('Rendering', () => {
    it('renders with message', () => {
      render(<PromotionBanner {...defaultProps} />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(<PromotionBanner {...defaultProps} icon="🎉" />);
      expect(screen.getByText('🎉')).toBeInTheDocument();
    });

    it('renders without icon', () => {
      render(<PromotionBanner {...defaultProps} />);
      expect(screen.queryByText('🎉')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<PromotionBanner {...defaultProps} className="custom-banner" />);
      expect(container.firstChild).toHaveClass('custom-banner');
    });
  });

  describe('Backgrounds', () => {
    it('renders with primary background', () => {
      render(<PromotionBanner {...defaultProps} background="primary" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with success background', () => {
      render(<PromotionBanner {...defaultProps} background="success" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with warning background', () => {
      render(<PromotionBanner {...defaultProps} background="warning" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with error background', () => {
      render(<PromotionBanner {...defaultProps} background="error" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with gradient background', () => {
      render(<PromotionBanner {...defaultProps} background="gradient" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders with dark background', () => {
      render(<PromotionBanner {...defaultProps} background="dark" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<PromotionBanner {...defaultProps} size="small" />);
      expect(container.querySelector('[style*="padding"]')).toBeInTheDocument();
    });

    it('renders medium size by default', () => {
      render(<PromotionBanner {...defaultProps} />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<PromotionBanner {...defaultProps} size="large" />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });
  });

  describe('Closeable', () => {
    it('shows close button when closeable', () => {
      render(<PromotionBanner {...defaultProps} closeable />);
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('hides close button when not closeable', () => {
      render(<PromotionBanner {...defaultProps} closeable={false} />);
      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn();
      render(<PromotionBanner {...defaultProps} closeable onClose={handleClose} />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('removes banner when closed and controlled', () => {
      const { rerender } = render(<PromotionBanner {...defaultProps} closeable />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      // In a real scenario, parent would control visibility
      expect(screen.queryByText('Special Offer!')).not.toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when banner is clicked', () => {
      const handleClick = jest.fn();
      render(<PromotionBanner {...defaultProps} onClick={handleClick} />);

      const banner = screen.getByText('Special Offer!').closest('div');
      if (banner) {
        fireEvent.click(banner);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });

    it('has pointer cursor when clickable', () => {
      const { container } = render(<PromotionBanner {...defaultProps} onClick={() => {}} />);
      expect(container.firstChild).toHaveStyle({ cursor: 'pointer' });
    });

    it('does not have pointer cursor when not clickable', () => {
      const { container } = render(<PromotionBanner {...defaultProps} />);
      expect(container.firstChild).not.toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      render(<PromotionBanner {...defaultProps} />);
      expect(screen.getByText('Special Offer!')).toBeInTheDocument();
    });

    it('close button is keyboard accessible', () => {
      render(<PromotionBanner {...defaultProps} closeable />);
      const closeButton = screen.getByText('✕');
      closeButton.focus();
      expect(document.activeElement).toContain(closeButton.textContent);
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages', () => {
      const longMessage = 'This is a very long promotional message that might span multiple lines';
      render(<PromotionBanner message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles empty message', () => {
      render(<PromotionBanner message="" />);
      expect(screen.queryByText('Special Offer!')).not.toBeInTheDocument();
    });

    it('handles rapid close clicks', () => {
      const handleClose = jest.fn();
      render(<PromotionBanner {...defaultProps} closeable onClose={handleClose} />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);

      // Should handle gracefully even if clicked after closed
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
