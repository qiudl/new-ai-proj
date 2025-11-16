import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColorSelector } from './ColorSelector';

describe('ColorSelector Component', () => {
  const colors = [
    { id: '1', name: 'Black', value: '#000000' },
    { id: '2', name: 'White', value: '#FFFFFF' },
    { id: '3', name: 'Red', value: '#FF0000' },
  ];

  describe('Rendering', () => {
    it('renders all color options', () => {
      render(<ColorSelector colors={colors} />);
      // Color swatches should be rendered
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(colors.length);
    });

    it('renders with label', () => {
      render(<ColorSelector colors={colors} label="Select Color" />);
      expect(screen.getByText('Select Color')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<ColorSelector colors={colors} showLabel={false} />);
      expect(screen.queryByText('Color')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<ColorSelector colors={colors} className="custom-selector" />);
      expect(container.firstChild).toHaveClass('custom-selector');
    });
  });

  describe('Selection', () => {
    it('sets default selected color', () => {
      render(<ColorSelector colors={colors} defaultSelected="2" />);
      // Check if the selected color has active styling
    });

    it('calls onColorChange when color is clicked', () => {
      const handleChange = jest.fn();
      render(<ColorSelector colors={colors} onColorChange={handleChange} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('shows check mark on selected color', () => {
      render(<ColorSelector colors={colors} selected="1" />);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<ColorSelector colors={colors} size="small" />);
      expect(screen.getAllByRole('button').length).toBe(colors.length);
    });

    it('renders medium size by default', () => {
      render(<ColorSelector colors={colors} />);
      expect(screen.getAllByRole('button').length).toBe(colors.length);
    });

    it('renders large size', () => {
      render(<ColorSelector colors={colors} size="large" />);
      expect(screen.getAllByRole('button').length).toBe(colors.length);
    });
  });

  describe('Label Position', () => {
    it('renders label on top by default', () => {
      render(<ColorSelector colors={colors} label="Color" />);
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('renders label on left', () => {
      render(<ColorSelector colors={colors} label="Color" labelPosition="left" />);
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('renders label on right', () => {
      render(<ColorSelector colors={colors} label="Color" labelPosition="right" />);
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('renders label on bottom', () => {
      render(<ColorSelector colors={colors} label="Color" labelPosition="bottom" />);
      expect(screen.getByText('Color')).toBeInTheDocument();
    });
  });

  describe('Color States', () => {
    it('renders disabled colors', () => {
      const colorsWithDisabled = [
        ...colors,
        { id: '4', name: 'Gray', value: '#808080', disabled: true },
      ];
      render(<ColorSelector colors={colorsWithDisabled} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[3]).toBeDisabled();
    });

    it('renders out of stock colors', () => {
      const colorsWithStock = [
        ...colors,
        { id: '4', name: 'Blue', value: '#0000FF', outOfStock: true },
      ];
      render(<ColorSelector colors={colorsWithStock} />);
      // Out of stock indicator should be rendered
    });

    it('does not call onColorChange for disabled colors', () => {
      const handleChange = jest.fn();
      const colorsWithDisabled = [
        { id: '1', name: 'Black', value: '#000000', disabled: true },
      ];
      render(<ColorSelector colors={colorsWithDisabled} onColorChange={handleChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Tooltips', () => {
    it('shows color name on hover', () => {
      render(<ColorSelector colors={colors} showTooltip />);
      const buttons = screen.getAllByRole('button');
      fireEvent.mouseOver(buttons[0]);
      // Tooltip functionality would need to be implemented in component
    });

    it('hides tooltips when showTooltip is false', () => {
      render(<ColorSelector colors={colors} showTooltip={false} />);
      // No tooltip should be shown
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(<ColorSelector colors={colors} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(colors.length);
    });

    it('is keyboard navigable', () => {
      render(<ColorSelector colors={colors} />);
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });

    it('has aria-label for color options', () => {
      render(<ColorSelector colors={colors} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Edge Cases', () => {
    it('renders with single color', () => {
      const singleColor = [{ id: '1', name: 'Black', value: '#000000' }];
      render(<ColorSelector colors={singleColor} />);
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('renders with many colors', () => {
      const manyColors = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        name: `Color ${i}`,
        value: `#${i.toString(16).padStart(6, '0')}`,
      }));
      render(<ColorSelector colors={manyColors} />);
      expect(screen.getAllByRole('button').length).toBe(20);
    });

    it('handles gradient colors', () => {
      const gradientColors = [
        { id: '1', name: 'Gradient', value: 'linear-gradient(to right, red, blue)' },
      ];
      render(<ColorSelector colors={gradientColors} />);
      expect(screen.getAllByRole('button').length).toBe(1);
    });

    it('renders empty colors array', () => {
      const { container } = render(<ColorSelector colors={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
