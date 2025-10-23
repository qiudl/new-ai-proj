/**
 * VersionListPanel 组件测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VersionListPanel from '../VersionListPanel';
import { VersionInfo } from '../../../services/versionHistoryService';

describe('VersionListPanel', () => {
  const mockVersions: VersionInfo[] = [
    {
      id: 1,
      content: '# Version 1\nInitial content',
      versionNumber: 'v1.0',
      createdAt: new Date('2025-01-01'),
      createdBy: 1,
      description: '初始版本',
      size: 1024,
      hash: 'hash1'
    },
    {
      id: 2,
      content: '# Version 2\nInitial content\nNew line added',
      versionNumber: 'v1.1',
      createdAt: new Date('2025-01-02'),
      createdBy: 1,
      description: '新增内容',
      size: 1536,
      hash: 'hash2'
    },
    {
      id: 3,
      content: '# Version 3\nUpdated content\nNew line added\nAnother line',
      versionNumber: 'v1.2',
      createdAt: new Date('2025-01-03'),
      createdBy: 2,
      description: '更新内容',
      size: 2048,
      hash: 'hash3'
    }
  ];

  it('should render version list with correct count', () => {
    render(<VersionListPanel versions={mockVersions} />);

    expect(screen.getByText('版本历史')).toBeInTheDocument();
    expect(screen.getByText('3 个版本')).toBeInTheDocument();
  });

  it('should render all version items', () => {
    render(<VersionListPanel versions={mockVersions} />);

    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1')).toBeInTheDocument();
    expect(screen.getByText('v1.2')).toBeInTheDocument();
  });

  it('should highlight selected version', () => {
    const { container } = render(
      <VersionListPanel versions={mockVersions} selectedVersionId={2} />
    );

    const selectedItem = container.querySelector('.version-list-item.selected');
    expect(selectedItem).toBeInTheDocument();
  });

  it('should call onVersionSelect when clicking a version', () => {
    const handleSelect = jest.fn();
    render(
      <VersionListPanel
        versions={mockVersions}
        onVersionSelect={handleSelect}
      />
    );

    const versionItems = screen.getAllByRole('listitem');
    fireEvent.click(versionItems[0]);

    expect(handleSelect).toHaveBeenCalled();
    // 验证传递的版本包含基本字段
    const calledVersion = handleSelect.mock.calls[0][0];
    expect(calledVersion.id).toBe(mockVersions[0].id);
    expect(calledVersion.versionNumber).toBe(mockVersions[0].versionNumber);
    // stats字段会被添加，但不是测试的重点
    expect(calledVersion.stats).toBeDefined();
  });

  it('should show empty state when no versions', () => {
    render(<VersionListPanel versions={[]} />);

    expect(screen.getByText('暂无版本历史')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { container } = render(
      <VersionListPanel versions={mockVersions} loading={true} />
    );

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('should calculate and display diff stats', () => {
    const { container } = render(<VersionListPanel versions={mockVersions} />);

    // 应该至少有一些统计标签（除了第一个版本外）
    const statsTags = container.querySelectorAll('.version-stats');
    expect(statsTags.length).toBeGreaterThan(0);
  });
});
