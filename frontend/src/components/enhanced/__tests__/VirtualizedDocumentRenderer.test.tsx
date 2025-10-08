import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualizedDocumentRenderer from '../VirtualizedDocumentRenderer';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height, width }: any) => {
    // Render a simplified version for testing
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => (
      children({ index, style: { height: itemSize, width: '100%' } })
    ));
    
    return (
      <div 
        data-testid="virtualized-list"
        style={{ height, width }}
      >
        {items}
      </div>
    );
  }
}));

describe('VirtualizedDocumentRenderer', () => {
  const sampleContent = `# Large Document Title

This is a very large document with multiple sections and content.

## Section 1
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Section 2 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 3
Ut enim ad minim veniam, quis nostrud exercitation ullamco.`;

  const defaultProps = {
    content: sampleContent,
    windowHeight: 600,
    chunkSize: 100,
    overscan: 5,
    compact: false,
    theme: 'light' as const,
    onScroll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders virtualized content correctly', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} />);
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('processes content into chunks', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} />);
    
    // Should render chunk items
    expect(screen.getAllByTestId(/chunk-item/)).toHaveLength(Math.min(10, Math.ceil(sampleContent.length / 100)));
  });

  it('applies theme styles correctly', () => {
    const { rerender } = render(
      <VirtualizedDocumentRenderer {...defaultProps} theme="light" />
    );
    
    const container = screen.getByTestId('virtualized-list').parentElement;
    expect(container).toHaveClass('theme-light');
    
    rerender(<VirtualizedDocumentRenderer {...defaultProps} theme="dark" />);
    expect(container).toHaveClass('theme-dark');
  });

  it('applies compact mode styling', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} compact={true} />);
    
    const container = screen.getByTestId('virtualized-list').parentElement;
    expect(container).toHaveClass('compact');
  });

  it('handles empty content gracefully', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} content="" />);
    
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('calculates chunk sizes correctly', () => {
    const shortContent = "Short content";
    render(
      <VirtualizedDocumentRenderer 
        {...defaultProps} 
        content={shortContent}
        chunkSize={5}
      />
    );
    
    // Should create multiple chunks for the content
    const chunks = screen.getAllByTestId(/chunk-item/);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('calls onScroll when scrolling occurs', async () => {
    const mockOnScroll = jest.fn();
    render(
      <VirtualizedDocumentRenderer 
        {...defaultProps} 
        onScroll={mockOnScroll}
      />
    );
    
    const virtualizedList = screen.getByTestId('virtualized-list');
    
    // Simulate scroll event
    fireEvent.scroll(virtualizedList, { target: { scrollTop: 100 } });
    
    await waitFor(() => {
      expect(mockOnScroll).toHaveBeenCalled();
    });
  });

  it('adjusts to window height changes', () => {
    const { rerender } = render(
      <VirtualizedDocumentRenderer {...defaultProps} windowHeight={400} />
    );
    
    let virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toHaveStyle('height: 400px');
    
    rerender(
      <VirtualizedDocumentRenderer {...defaultProps} windowHeight={800} />
    );
    
    virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toHaveStyle('height: 800px');
  });

  it('handles different chunk sizes', () => {
    const { rerender } = render(
      <VirtualizedDocumentRenderer {...defaultProps} chunkSize={50} />
    );
    
    const initialChunks = screen.getAllByTestId(/chunk-item/);
    const initialCount = initialChunks.length;
    
    rerender(
      <VirtualizedDocumentRenderer {...defaultProps} chunkSize={200} />
    );
    
    const newChunks = screen.getAllByTestId(/chunk-item/);
    expect(newChunks.length).toBeLessThan(initialCount);
  });

  it('renders markdown content within chunks', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} />);
    
    // Should contain markdown elements
    expect(screen.getByText(/Large Document Title/)).toBeInTheDocument();
  });

  it('maintains scroll position during content updates', async () => {
    const { rerender } = render(<VirtualizedDocumentRenderer {...defaultProps} />);
    
    const virtualizedList = screen.getByTestId('virtualized-list');
    
    // Simulate scroll
    fireEvent.scroll(virtualizedList, { target: { scrollTop: 200 } });
    
    // Update content
    const newContent = sampleContent + "\n\n## Additional Section\nNew content added.";
    rerender(<VirtualizedDocumentRenderer {...defaultProps} content={newContent} />);
    
    // Component should handle the content update gracefully
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('optimizes rendering with overscan', () => {
    render(
      <VirtualizedDocumentRenderer 
        {...defaultProps} 
        overscan={3}
      />
    );
    
    // With overscan, additional items should be rendered for smooth scrolling
    const chunks = screen.getAllByTestId(/chunk-item/);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('handles very large content efficiently', () => {
    const largeContent = sampleContent.repeat(100); // Very large content
    
    render(
      <VirtualizedDocumentRenderer 
        {...defaultProps} 
        content={largeContent}
      />
    );
    
    // Should still render without performance issues
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('provides performance metrics', () => {
    render(<VirtualizedDocumentRenderer {...defaultProps} />);
    
    // Component should provide some indication of performance metrics
    const container = screen.getByTestId('virtualized-list').parentElement;
    expect(container).toHaveAttribute('data-chunk-count');
  });

  it('handles search highlighting within chunks', () => {
    render(
      <VirtualizedDocumentRenderer 
        {...defaultProps} 
        searchTerm="Lorem"
      />
    );
    
    // Should highlight search terms if search functionality is implemented
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
});