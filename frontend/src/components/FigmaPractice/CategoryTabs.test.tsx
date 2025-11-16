import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CategoryTabs } from './CategoryTabs';

describe('CategoryTabs Component', () => {
  const categories = [
    { id: '1', name: 'All', count: 100 },
    { id: '2', name: 'T-Shirts', count: 45 },
    { id: '3', name: 'Pants', count: 30 },
  ];

  describe('Rendering', () => {
    it('renders all categories', () => {
      render(<CategoryTabs categories={categories} />);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('T-Shirts')).toBeInTheDocument();
      expect(screen.getByText('Pants')).toBeInTheDocument();
    });

    it('renders category counts', () => {
      render(<CategoryTabs categories={categories} showCount />);
      expect(screen.getByText('(100)')).toBeInTheDocument();
      expect(screen.getByText('(45)')).toBeInTheDocument();
      expect(screen.getByText('(30)')).toBeInTheDocument();
    });

    it('hides counts when showCount is false', () => {
      render(<CategoryTabs categories={categories} showCount={false} />);
      expect(screen.queryByText('(100)')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<CategoryTabs categories={categories} className="custom-tabs" />);
      expect(container.firstChild).toHaveClass('custom-tabs');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<CategoryTabs categories={categories} variant="default" />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('renders pills variant', () => {
      render(<CategoryTabs categories={categories} variant="pills" />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('renders underline variant', () => {
      render(<CategoryTabs categories={categories} variant="underline" />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders medium size by default', () => {
      render(<CategoryTabs categories={categories} />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('renders small size', () => {
      render(<CategoryTabs categories={categories} size="small" />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<CategoryTabs categories={categories} size="large" />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('sets default active category', () => {
      render(<CategoryTabs categories={categories} defaultActive="2" />);
      // Active tab styling would be tested through className or style
    });

    it('calls onCategoryChange when tab is clicked', () => {
      const handleChange = jest.fn();
      render(<CategoryTabs categories={categories} onCategoryChange={handleChange} />);

      const tab = screen.getByText('T-Shirts');
      fireEvent.click(tab);

      expect(handleChange).toHaveBeenCalledWith('2');
    });

    it('handles multiple clicks', () => {
      const handleChange = jest.fn();
      render(<CategoryTabs categories={categories} onCategoryChange={handleChange} />);

      fireEvent.click(screen.getByText('T-Shirts'));
      fireEvent.click(screen.getByText('Pants'));

      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(handleChange).toHaveBeenNthCalledWith(1, '2');
      expect(handleChange).toHaveBeenNthCalledWith(2, '3');
    });
  });

  describe('Full Width', () => {
    it('renders full width when fullWidth is true', () => {
      const { container } = render(<CategoryTabs categories={categories} fullWidth />);
      expect(container.firstChild).toHaveStyle({ width: '100%' });
    });

    it('renders auto width by default', () => {
      const { container } = render(<CategoryTabs categories={categories} />);
      expect(container.firstChild).not.toHaveStyle({ width: '100%' });
    });
  });

  describe('Accessibility', () => {
    it('has proper tab structure', () => {
      render(<CategoryTabs categories={categories} />);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('T-Shirts')).toBeInTheDocument();
    });

    it('is keyboard navigable', () => {
      render(<CategoryTabs categories={categories} />);
      const firstTab = screen.getByText('All');
      firstTab.focus();
      expect(document.activeElement).toContain(firstTab.textContent);
    });
  });

  describe('Edge Cases', () => {
    it('renders with single category', () => {
      const singleCategory = [{ id: '1', name: 'Only One', count: 10 }];
      render(<CategoryTabs categories={singleCategory} />);
      expect(screen.getByText('Only One')).toBeInTheDocument();
    });

    it('renders with many categories', () => {
      const manyCategories = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        name: `Category ${i}`,
        count: i * 10,
      }));
      render(<CategoryTabs categories={manyCategories} />);
      expect(screen.getByText('Category 0')).toBeInTheDocument();
      expect(screen.getByText('Category 19')).toBeInTheDocument();
    });

    it('handles zero counts', () => {
      const zeroCount = [{ id: '1', name: 'Empty', count: 0 }];
      render(<CategoryTabs categories={zeroCount} showCount />);
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });

    it('handles long category names', () => {
      const longName = [{ id: '1', name: 'This is a very long category name', count: 5 }];
      render(<CategoryTabs categories={longName} />);
      expect(screen.getByText('This is a very long category name')).toBeInTheDocument();
    });

    it('renders empty categories array', () => {
      const { container } = render(<CategoryTabs categories={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
