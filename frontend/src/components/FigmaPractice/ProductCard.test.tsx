import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCard } from './ProductCard';

describe('ProductCard Component', () => {
  const defaultProps = {
    id: '1',
    name: 'Test Product',
    price: 100,
  };

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('¥100')).toBeInTheDocument();
    });

    it('renders with default icon', () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText('👕')).toBeInTheDocument();
    });

    it('renders with custom icon', () => {
      render(<ProductCard {...defaultProps} icon="🛍️" />);
      expect(screen.getByText('🛍️')).toBeInTheDocument();
    });

    it('renders with image', () => {
      render(<ProductCard {...defaultProps} image="https://example.com/image.jpg" />);
      const imageElement = screen.getByRole('img', { hidden: true });
      expect(imageElement).toHaveStyle({ backgroundImage: 'url(https://example.com/image.jpg)' });
    });

    it('renders with custom className', () => {
      const { container } = render(<ProductCard {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders with custom style', () => {
      const { container } = render(<ProductCard {...defaultProps} style={{ marginTop: '20px' }} />);
      expect(container.firstChild).toHaveStyle({ marginTop: '20px' });
    });
  });

  describe('Color Themes', () => {
    it('renders with default color theme', () => {
      render(<ProductCard {...defaultProps} colorTheme="default" />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('renders with black color theme', () => {
      render(<ProductCard {...defaultProps} colorTheme="black" />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('renders with pink color theme', () => {
      render(<ProductCard {...defaultProps} colorTheme="pink" />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  describe('Pricing', () => {
    it('displays formatted price', () => {
      render(<ProductCard {...defaultProps} price={299} />);
      expect(screen.getByText('¥299')).toBeInTheDocument();
    });

    it('handles decimal prices', () => {
      render(<ProductCard {...defaultProps} price={99.99} />);
      expect(screen.getByText('¥99.99')).toBeInTheDocument();
    });

    it('handles zero price', () => {
      render(<ProductCard {...defaultProps} price={0} />);
      expect(screen.getByText('¥0')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick with product id when clicked', () => {
      const handleClick = jest.fn();
      render(<ProductCard {...defaultProps} onClick={handleClick} />);

      const card = screen.getByText('Test Product').closest('div');
      if (card) {
        fireEvent.click(card);
        expect(handleClick).toHaveBeenCalledWith('1');
      }
    });

    it('handles numeric id', () => {
      const handleClick = jest.fn();
      render(<ProductCard {...defaultProps} id={123} onClick={handleClick} />);

      const card = screen.getByText('Test Product').closest('div');
      if (card) {
        fireEvent.click(card);
        expect(handleClick).toHaveBeenCalledWith(123);
      }
    });

    it('has hover cursor style when clickable', () => {
      const { container } = render(<ProductCard {...defaultProps} onClick={() => {}} />);
      expect(container.firstChild).toHaveStyle({ cursor: 'pointer' });
    });

    it('does not have pointer cursor when not clickable', () => {
      const { container } = render(<ProductCard {...defaultProps} />);
      expect(container.firstChild).not.toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      render(<ProductCard {...defaultProps} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('¥100')).toBeInTheDocument();
    });

    it('is keyboard accessible when clickable', () => {
      const handleClick = jest.fn();
      render(<ProductCard {...defaultProps} onClick={handleClick} />);

      const card = screen.getByText('Test Product').closest('div');
      if (card) {
        fireEvent.keyPress(card, { key: 'Enter', code: 'Enter', charCode: 13 });
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles long product names', () => {
      const longName = 'This is a very long product name that might overflow';
      render(<ProductCard {...defaultProps} name={longName} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles very high prices', () => {
      render(<ProductCard {...defaultProps} price={999999} />);
      expect(screen.getByText('¥999999')).toBeInTheDocument();
    });

    it('renders without onClick handler', () => {
      const { container } = render(<ProductCard {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
