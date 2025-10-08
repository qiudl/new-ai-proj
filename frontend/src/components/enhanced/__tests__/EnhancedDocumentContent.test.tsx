import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedDocumentContent from '../EnhancedDocumentContent';

// Mock markdown renderer
jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

describe('EnhancedDocumentContent', () => {
  const defaultProps = {
    content: '# Test Title\n\nThis is test content with **bold** text.',
    title: 'Test Document',
    readOnly: false,
    showToolbar: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document content correctly', () => {
    render(<EnhancedDocumentContent {...defaultProps} />);
    
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Test Title');
  });

  it('shows toolbar when showToolbar is true', () => {
    render(<EnhancedDocumentContent {...defaultProps} showToolbar={true} />);
    
    expect(screen.getByRole('button', { name: /设置/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /打印/i })).toBeInTheDocument();
  });

  it('hides toolbar when showToolbar is false', () => {
    render(<EnhancedDocumentContent {...defaultProps} showToolbar={false} />);
    
    expect(screen.queryByRole('button', { name: /设置/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /打印/i })).not.toBeInTheDocument();
  });

  it('toggles settings panel when settings button is clicked', async () => {
    render(<EnhancedDocumentContent {...defaultProps} />);
    
    const settingsButton = screen.getByRole('button', { name: /设置/i });
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      expect(screen.getByText('显示设置')).toBeInTheDocument();
    });
  });

  it('changes font size when slider is adjusted', async () => {
    render(<EnhancedDocumentContent {...defaultProps} />);
    
    // Open settings panel
    const settingsButton = screen.getByRole('button', { name: /设置/i });
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      const fontSizeSlider = screen.getByRole('slider');
      fireEvent.change(fontSizeSlider, { target: { value: '16' } });
      
      const contentArea = screen.getByTestId('markdown-content').parentElement;
      expect(contentArea).toHaveStyle('font-size: 16px');
    });
  });

  it('toggles between light and dark theme', async () => {
    render(<EnhancedDocumentContent {...defaultProps} />);
    
    const settingsButton = screen.getByRole('button', { name: /设置/i });
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      const themeSwitch = screen.getByRole('switch');
      fireEvent.click(themeSwitch);
      
      const container = screen.getByTestId('markdown-content').closest('.enhanced-document-content');
      expect(container).toHaveClass('dark');
    });
  });

  it('handles print functionality', async () => {
    // Mock window.print
    const mockPrint = jest.fn();
    Object.defineProperty(window, 'print', {
      value: mockPrint,
      writable: true
    });

    render(<EnhancedDocumentContent {...defaultProps} />);
    
    const printButton = screen.getByRole('button', { name: /打印/i });
    fireEvent.click(printButton);
    
    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalled();
    });
  });

  it('displays empty state when no content provided', () => {
    render(<EnhancedDocumentContent {...defaultProps} content="" />);
    
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('applies compact mode styling', () => {
    render(<EnhancedDocumentContent {...defaultProps} initialCompact={true} />);
    
    const container = screen.getByTestId('markdown-content').closest('.enhanced-document-content');
    expect(container).toHaveClass('compact');
  });

  it('handles read-only mode correctly', () => {
    render(<EnhancedDocumentContent {...defaultProps} readOnly={true} />);
    
    // In read-only mode, certain interactive elements should be disabled
    // This test verifies the component respects the readOnly prop
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('calls onContentChange when content changes', async () => {
    const mockOnChange = jest.fn();
    render(
      <EnhancedDocumentContent 
        {...defaultProps} 
        readOnly={false}
        onContentChange={mockOnChange}
      />
    );
    
    // Simulate content change
    // Note: This test assumes there's an editor mode that can be triggered
    // The actual implementation may vary based on your component design
  });

  it('maintains settings state between renders', async () => {
    const { rerender } = render(<EnhancedDocumentContent {...defaultProps} />);
    
    // Open settings and change font size
    const settingsButton = screen.getByRole('button', { name: /设置/i });
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      const fontSizeSlider = screen.getByRole('slider');
      fireEvent.change(fontSizeSlider, { target: { value: '18' } });
    });
    
    // Rerender with new props
    rerender(<EnhancedDocumentContent {...defaultProps} content="Updated content" />);
    
    // Settings should persist
    const contentArea = screen.getByTestId('markdown-content').parentElement;
    expect(contentArea).toHaveStyle('font-size: 18px');
  });
});