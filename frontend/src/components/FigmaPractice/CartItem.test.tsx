import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartItem } from './CartItem';

describe('CartItem Component', () => {
  const defaultProps = {
    id: '1',
    name: 'Test Product',
    price: 100,
    quantity: 2,
  };

  describe('Rendering', () => {
    it('renders product information', () => {
      render(<CartItem {...defaultProps} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('¥100')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      render(<CartItem {...defaultProps} icon="🛍️" />);
      expect(screen.getByText('🛍️')).toBeInTheDocument();
    });

    it('renders with image', () => {
      render(<CartItem {...defaultProps} image="https://example.com/image.jpg" />);
      const img = screen.getByRole('img', { hidden: true });
      expect(img).toBeInTheDocument();
    });

    it('renders color attribute', () => {
      render(<CartItem {...defaultProps} color="黑色" />);
      expect(screen.getByText(/黑色/)).toBeInTheDocument();
    });

    it('renders size attribute', () => {
      render(<CartItem {...defaultProps} size="L" />);
      expect(screen.getByText(/L/)).toBeInTheDocument();
    });
  });

  describe('Quantity Control', () => {
    it('displays current quantity', () => {
      render(<CartItem {...defaultProps} quantity={5} />);
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('calls onQuantityChange when incrementing', () => {
      const handleChange = jest.fn();
      render(<CartItem {...defaultProps} quantity={2} onQuantityChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(3);
    });

    it('calls onQuantityChange when decrementing', () => {
      const handleChange = jest.fn();
      render(<CartItem {...defaultProps} quantity={2} onQuantityChange={handleChange} />);

      const decrementButton = screen.getByText('−');
      fireEvent.click(decrementButton);

      expect(handleChange).toHaveBeenCalledWith(1);
    });

    it('does not decrement below 1', () => {
      const handleChange = jest.fn();
      render(<CartItem {...defaultProps} quantity={1} onQuantityChange={handleChange} />);

      const decrementButton = screen.getByText('−');
      fireEvent.click(decrementButton);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('allows manual quantity input', () => {
      const handleChange = jest.fn();
      render(<CartItem {...defaultProps} quantity={2} onQuantityChange={handleChange} />);

      const input = screen.getByDisplayValue('2');
      fireEvent.change(input, { target: { value: '5' } });

      expect(handleChange).toHaveBeenCalledWith(5);
    });

    it('handles invalid quantity input', () => {
      const handleChange = jest.fn();
      render(<CartItem {...defaultProps} quantity={2} onQuantityChange={handleChange} />);

      const input = screen.getByDisplayValue('2');
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    it('renders checkbox when selectable', () => {
      render(<CartItem {...defaultProps} selectable />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('does not render checkbox when not selectable', () => {
      render(<CartItem {...defaultProps} selectable={false} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('reflects selected state', () => {
      render(<CartItem {...defaultProps} selectable selected />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('calls onSelectChange when checkbox is clicked', () => {
      const handleSelectChange = jest.fn();
      render(<CartItem {...defaultProps} selectable selected={false} onSelectChange={handleSelectChange} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(handleSelectChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Remove Functionality', () => {
    it('shows remove button when onRemove is provided', () => {
      render(<CartItem {...defaultProps} onRemove={() => {}} />);
      expect(screen.getByText('🗑️')).toBeInTheDocument();
    });

    it('hides remove button when onRemove is not provided', () => {
      render(<CartItem {...defaultProps} />);
      expect(screen.queryByText('🗑️')).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
      const handleRemove = jest.fn();
      render(<CartItem {...defaultProps} onRemove={handleRemove} />);

      const removeButton = screen.getByText('🗑️');
      fireEvent.click(removeButton);

      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when item is clicked', () => {
      const handleClick = jest.fn();
      render(<CartItem {...defaultProps} onClick={handleClick} />);

      const item = screen.getByText('Test Product').closest('div');
      if (item) {
        fireEvent.click(item);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });

    it('has pointer cursor when clickable', () => {
      const { container } = render(<CartItem {...defaultProps} onClick={() => {}} />);
      // Check if cursor style is applied
      expect(container.querySelector('[style*="cursor"]')).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('displays price with custom currency', () => {
      render(<CartItem {...defaultProps} price={100} currency="$" />);
      expect(screen.getByText('$100')).toBeInTheDocument();
    });

    it('displays subtotal correctly', () => {
      render(<CartItem {...defaultProps} price={50} quantity={3} />);
      expect(screen.getByText(/¥150/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      render(<CartItem {...defaultProps} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('quantity input is keyboard accessible', () => {
      render(<CartItem {...defaultProps} />);
      const input = screen.getByDisplayValue('2');
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('checkbox is keyboard accessible when selectable', () => {
      render(<CartItem {...defaultProps} selectable />);
      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });
  });

  describe('Edge Cases', () => {
    it('handles very high quantities', () => {
      render(<CartItem {...defaultProps} quantity={999} />);
      expect(screen.getByDisplayValue('999')).toBeInTheDocument();
    });

    it('handles very high prices', () => {
      render(<CartItem {...defaultProps} price={99999} />);
      expect(screen.getByText('¥99999')).toBeInTheDocument();
    });

    it('handles long product names', () => {
      const longName = 'This is a very long product name that might overflow the container';
      render(<CartItem {...defaultProps} name={longName} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles decimal prices', () => {
      render(<CartItem {...defaultProps} price={99.99} />);
      expect(screen.getByText('¥99.99')).toBeInTheDocument();
    });
  });
});
