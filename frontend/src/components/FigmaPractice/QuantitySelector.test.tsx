import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuantitySelector } from './QuantitySelector';

describe('QuantitySelector Component', () => {
  describe('Rendering', () => {
    it('renders with default quantity', () => {
      render(<QuantitySelector />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('renders with initial quantity', () => {
      render(<QuantitySelector quantity={5} />);
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('renders increment and decrement buttons', () => {
      render(<QuantitySelector />);
      expect(screen.getByText('−')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<QuantitySelector label="Quantity" />);
      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<QuantitySelector showLabel={false} />);
      expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<QuantitySelector className="custom-quantity" />);
      expect(container.firstChild).toHaveClass('custom-quantity');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<QuantitySelector variant="default" />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('renders outline variant', () => {
      render(<QuantitySelector variant="outline" />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('renders rounded variant', () => {
      render(<QuantitySelector variant="rounded" />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<QuantitySelector size="small" />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('renders medium size by default', () => {
      render(<QuantitySelector />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<QuantitySelector size="large" />);
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });
  });

  describe('Increment/Decrement', () => {
    it('increments quantity when plus button is clicked', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(6);
    });

    it('decrements quantity when minus button is clicked', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} onChange={handleChange} />);

      const decrementButton = screen.getByText('−');
      fireEvent.click(decrementButton);

      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('respects minimum value', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={1} min={1} onChange={handleChange} />);

      const decrementButton = screen.getByText('−');
      fireEvent.click(decrementButton);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('respects maximum value', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={10} max={10} onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('respects custom step value', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={10} step={5} onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(15);
    });
  });

  describe('Manual Input', () => {
    it('allows manual input when showInput is true', () => {
      render(<QuantitySelector showInput />);
      const input = screen.getByDisplayValue('1');
      expect(input).toBeInTheDocument();
    });

    it('hides input when showInput is false', () => {
      render(<QuantitySelector showInput={false} />);
      expect(screen.queryByDisplayValue('1')).not.toBeInTheDocument();
    });

    it('calls onChange when typing in input', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} showInput onChange={handleChange} />);

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: '10' } });

      expect(handleChange).toHaveBeenCalledWith(10);
    });

    it('validates manual input against min/max', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} min={1} max={10} showInput onChange={handleChange} />);

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: '15' } });

      // Should clamp to max value
      expect(handleChange).toHaveBeenCalledWith(10);
    });

    it('handles invalid input', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} showInput onChange={handleChange} />);

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables all controls when disabled', () => {
      render(<QuantitySelector disabled />);

      const input = screen.getByDisplayValue('1');
      const incrementButton = screen.getByText('+');
      const decrementButton = screen.getByText('−');

      expect(input).toBeDisabled();
      expect(incrementButton).toBeDisabled();
      expect(decrementButton).toBeDisabled();
    });

    it('does not call onChange when disabled', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector disabled onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('disables decrement button at minimum', () => {
      render(<QuantitySelector quantity={1} min={1} />);
      const decrementButton = screen.getByText('−');
      expect(decrementButton).toBeDisabled();
    });

    it('disables increment button at maximum', () => {
      render(<QuantitySelector quantity={10} max={10} />);
      const incrementButton = screen.getByText('+');
      expect(incrementButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(<QuantitySelector />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('input is keyboard accessible', () => {
      render(<QuantitySelector showInput />);
      const input = screen.getByDisplayValue('1');
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('buttons are keyboard accessible', () => {
      render(<QuantitySelector />);
      const incrementButton = screen.getByText('+');
      incrementButton.focus();
      expect(document.activeElement).toContain(incrementButton.textContent);
    });

    it('has aria-label on input when provided', () => {
      render(<QuantitySelector ariaLabel="Product quantity" showInput />);
      const input = screen.getByDisplayValue('1');
      expect(input).toHaveAttribute('aria-label', 'Product quantity');
    });
  });

  describe('Edge Cases', () => {
    it('handles very large quantities', () => {
      render(<QuantitySelector quantity={9999} />);
      expect(screen.getByDisplayValue('9999')).toBeInTheDocument();
    });

    it('handles decimal step values', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={1.5} step={0.5} onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);

      expect(handleChange).toHaveBeenCalledWith(2.0);
    });

    it('handles negative min values', () => {
      render(<QuantitySelector quantity={0} min={-10} />);
      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('handles rapid button clicks', () => {
      const handleChange = jest.fn();
      render(<QuantitySelector quantity={5} onChange={handleChange} />);

      const incrementButton = screen.getByText('+');
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(handleChange).toHaveBeenCalledTimes(3);
    });
  });
});
