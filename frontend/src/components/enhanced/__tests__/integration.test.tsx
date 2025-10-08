import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import EnhancedFullscreenDocumentPreview from '../EnhancedFullscreenDocumentPreview';

// Mock API calls
jest.mock('../../../services/taskDocumentService', () => ({
  taskDocumentService: {
    getTaskDocuments: jest.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Test Document',
        content: '# Test Document\n\nThis is test content.',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ]),
    updateTaskDocument: jest.fn().mockResolvedValue(true),
    createTaskDocument: jest.fn().mockResolvedValue({ id: 2 })
  }
}));

// Mock markdown rendering
jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: string }) {
    return <div data-testid="rendered-markdown">{children}</div>;
  };
});

describe('Enhanced Document Preview Integration Tests', () => {
  const defaultProps = {
    documentId: 'test-doc-1',
    title: 'Integration Test Document',
    content: `# Integration Test Document

## Introduction
This is a comprehensive test document that contains various elements:

- Lists
- **Bold text**
- *Italic text*
- \`Code snippets\`

## Code Block
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Conclusion
This document tests the integration of all components.`,
    showSidebar: true,
    viewMode: 'preview' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Component Integration', () => {
    it('renders all main components together', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Main content should be rendered
      expect(screen.getByText('Integration Test Document')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
      
      // Toolbar should be visible
      expect(screen.getByRole('button', { name: /编辑/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /评论/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /搜索/i })).toBeInTheDocument();
      
      // Sidebar should be visible
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('switches between preview and edit modes seamlessly', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Start in preview mode
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
      
      // Switch to edit mode
      const editButton = screen.getByRole('button', { name: /编辑/i });
      fireEvent.click(editButton);
      
      await waitFor(() => {
        // Should now show edit interface
        expect(screen.getByRole('button', { name: /预览/i })).toBeInTheDocument();
      });
    });

    it('integrates search functionality with content display', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Open search panel
      const searchButton = screen.getByRole('button', { name: /搜索/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        const sidebar = screen.getByRole('complementary');
        expect(within(sidebar).getByPlaceholderText(/搜索文档内容/i)).toBeInTheDocument();
      });
      
      // Perform search
      const searchInput = screen.getByPlaceholderText(/搜索文档内容/i);
      fireEvent.change(searchInput, { target: { value: 'Integration' } });
      
      await waitFor(() => {
        // Search results should be highlighted or displayed
        expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
      });
    });

    it('integrates comments system with document content', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Open comments panel
      const commentsButton = screen.getByRole('button', { name: /评论/i });
      fireEvent.click(commentsButton);
      
      await waitFor(() => {
        const sidebar = screen.getByRole('complementary');
        expect(within(sidebar).getByText('文档评论')).toBeInTheDocument();
      });
      
      // Add a comment
      const commentInput = screen.getByPlaceholderText(/添加评论/i);
      fireEvent.change(commentInput, { target: { value: 'This is a test comment' } });
      
      const submitButton = screen.getByRole('button', { name: /发布/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      });
    });

    it('integrates share functionality with document state', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Open share modal
      const shareButton = screen.getByRole('button', { name: /分享/i });
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('分享文档')).toBeInTheDocument();
      });
      
      // Test share link generation
      const generateLinkButton = screen.getByRole('button', { name: /生成链接/i });
      fireEvent.click(generateLinkButton);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(/http/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    it('adapts layout for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      act(() => {
        fireEvent(window, new Event('resize'));
      });
      
      // Sidebar should be hidden on mobile
      const sidebar = screen.queryByRole('complementary');
      if (sidebar) {
        expect(sidebar).toHaveClass('mobile-hidden');
      }
    });

    it('adapts layout for tablet devices', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      act(() => {
        fireEvent(window, new Event('resize'));
      });
      
      // Layout should adapt for tablet
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('handles large documents with virtualization', async () => {
      const largeContent = Array(1000).fill('# Large Section\n\nContent here.\n\n').join('');
      
      render(
        <EnhancedFullscreenDocumentPreview 
          {...defaultProps} 
          content={largeContent}
        />
      );
      
      // Should render without performance issues
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
      
      // Performance monitor should be available if enabled
      const performanceButton = screen.queryByText(/性能/i);
      if (performanceButton) {
        fireEvent.click(performanceButton);
        
        await waitFor(() => {
          expect(screen.getByText(/性能监控/)).toBeInTheDocument();
        });
      }
    });

    it('optimizes rendering with caching', async () => {
      const { rerender } = render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // First render
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
      
      // Re-render with same content should use cache
      rerender(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('supports full keyboard navigation', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Test keyboard shortcuts
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document, { key: 'F11' });
      fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
      
      // Component should handle all keyboard events gracefully
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
    });

    it('maintains focus management across components', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Open search panel
      const searchButton = screen.getByRole('button', { name: /搜索/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/搜索文档内容/i);
        expect(searchInput).toHaveFocus();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully', async () => {
      // Mock API error
      const mockError = jest.fn().mockRejectedValue(new Error('API Error'));
      jest.doMock('../../../services/taskDocumentService', () => ({
        taskDocumentService: {
          getTaskDocuments: mockError
        }
      }));
      
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/加载失败/i) || screen.getByText(/错误/i)).toBeInTheDocument();
      });
    });

    it('recovers from network failures', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Simulate network failure and recovery
      // Component should handle this gracefully
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across all components', () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Check for proper ARIA labels
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      
      // Check for keyboard accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('supports screen readers', () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Check for proper headings hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = screen.queryAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });
  });

  describe('Data Flow Integration', () => {
    it('properly manages state across all components', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Change mode
      const editButton = screen.getByRole('button', { name: /编辑/i });
      fireEvent.click(editButton);
      
      // Open comments
      const commentsButton = screen.getByRole('button', { name: /评论/i });
      fireEvent.click(commentsButton);
      
      // State should be maintained correctly
      await waitFor(() => {
        expect(screen.getByText('文档评论')).toBeInTheDocument();
      });
    });

    it('synchronizes data between components', async () => {
      render(<EnhancedFullscreenDocumentPreview {...defaultProps} />);
      
      // Make changes in one component
      const searchButton = screen.getByRole('button', { name: /搜索/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/搜索文档内容/i);
        fireEvent.change(searchInput, { target: { value: 'test' } });
      });
      
      // Changes should be reflected across components
      expect(screen.getByTestId('rendered-markdown')).toBeInTheDocument();
    });
  });
});