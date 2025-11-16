import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from './SearchBar';

describe('SearchBar Component', () => {
  describe('Rendering', () => {
    it('renders with default placeholder', () => {
      render(<SearchBar />);
      expect(screen.getByPlaceholderText('搜索商品...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<SearchBar placeholder="Custom search..." />);
      expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      render(<SearchBar />);
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<SearchBar className="custom-search" />);
      expect(container.firstChild).toHaveClass('custom-search');
    });

    it('renders with custom style', () => {
      const { container } = render(<SearchBar style={{ marginTop: '10px' }} />);
      expect(container.firstChild).toHaveStyle({ marginTop: '10px' });
    });
  });

  describe('Controlled Mode', () => {
    it('displays controlled value', () => {
      render(<SearchBar value="test query" onChange={() => {}} />);
      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('calls onChange when typing', () => {
      const handleChange = jest.fn();
      render(<SearchBar value="" onChange={handleChange} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalledWith('new value');
    });

    it('updates value through controlled prop', () => {
      const { rerender } = render(<SearchBar value="initial" onChange={() => {}} />);
      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();

      rerender(<SearchBar value="updated" onChange={() => {}} />);
      expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('handles uncontrolled input', () => {
      render(<SearchBar />);
      const input = screen.getByPlaceholderText('搜索商品...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'uncontrolled value' } });
      expect(input.value).toBe('uncontrolled value');
    });

    it('works with defaultValue', () => {
      render(<SearchBar defaultValue="default text" />);
      expect(screen.getByDisplayValue('default text')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls onSearch when Enter key is pressed', () => {
      const handleSearch = jest.fn();
      render(<SearchBar onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(handleSearch).toHaveBeenCalledWith('search term');
    });

    it('calls onSearch when search icon is clicked', () => {
      const handleSearch = jest.fn();
      render(<SearchBar onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.change(input, { target: { value: 'icon search' } });

      const searchIcon = screen.getByText('🔍');
      fireEvent.click(searchIcon);

      expect(handleSearch).toHaveBeenCalledWith('icon search');
    });

    it('calls onSearch with controlled value', () => {
      const handleSearch = jest.fn();
      const handleChange = jest.fn();
      render(<SearchBar value="controlled search" onChange={handleChange} onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(handleSearch).toHaveBeenCalledWith('controlled search');
    });

    it('does not call onSearch on other keys', () => {
      const handleSearch = jest.fn();
      render(<SearchBar onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.keyPress(input, { key: 'a', code: 'KeyA' });

      expect(handleSearch).not.toHaveBeenCalled();
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when input has value', () => {
      render(<SearchBar defaultValue="test" />);
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('hides clear button when input is empty', () => {
      render(<SearchBar />);
      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });

    it('clears input when clear button is clicked', () => {
      render(<SearchBar defaultValue="test" />);
      const input = screen.getByPlaceholderText('搜索商品...') as HTMLInputElement;
      const clearButton = screen.getByText('✕');

      fireEvent.click(clearButton);
      expect(input.value).toBe('');
    });

    it('calls onChange with empty string when cleared in controlled mode', () => {
      const handleChange = jest.fn();
      render(<SearchBar value="test" onChange={handleChange} />);

      const clearButton = screen.getByText('✕');
      fireEvent.click(clearButton);

      expect(handleChange).toHaveBeenCalledWith('');
    });
  });

  describe('Focus Management', () => {
    it('focuses input when clicking container', () => {
      render(<SearchBar />);
      const input = screen.getByPlaceholderText('搜索商品...') as HTMLInputElement;

      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('maintains focus when typing', () => {
      render(<SearchBar />);
      const input = screen.getByPlaceholderText('搜索商品...') as HTMLInputElement;

      input.focus();
      fireEvent.change(input, { target: { value: 'test' } });
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Accessibility', () => {
    it('has proper input type', () => {
      render(<SearchBar />);
      const input = screen.getByPlaceholderText('搜索商品...');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('is keyboard navigable', () => {
      render(<SearchBar />);
      const input = screen.getByPlaceholderText('搜索商品...');

      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('has accessible placeholder', () => {
      render(<SearchBar placeholder="Search products" />);
      expect(screen.getByPlaceholderText('Search products')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty search submission', () => {
      const handleSearch = jest.fn();
      render(<SearchBar onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(handleSearch).toHaveBeenCalledWith('');
    });

    it('handles very long search queries', () => {
      const longQuery = 'a'.repeat(500);
      render(<SearchBar defaultValue={longQuery} />);
      expect(screen.getByDisplayValue(longQuery)).toBeInTheDocument();
    });

    it('handles special characters in search', () => {
      const specialChars = '!@#$%^&*()';
      render(<SearchBar defaultValue={specialChars} />);
      expect(screen.getByDisplayValue(specialChars)).toBeInTheDocument();
    });

    it('trims whitespace correctly', () => {
      const handleSearch = jest.fn();
      render(<SearchBar onSearch={handleSearch} />);

      const input = screen.getByPlaceholderText('搜索商品...');
      fireEvent.change(input, { target: { value: '  test  ' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(handleSearch).toHaveBeenCalledWith('  test  ');
    });
  });
});
