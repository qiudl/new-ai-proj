/**
 * DiffViewPanel 组件测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiffViewPanel from '../DiffViewPanel';
import { VersionInfo } from '../../../services/versionHistoryService';

describe('DiffViewPanel', () => {
  const mockOldVersion: VersionInfo = {
    id: 1,
    content: '# Version 1\nOld content line 1\nOld content line 2',
    versionNumber: 'v1.0',
    createdAt: new Date('2025-01-01'),
    createdBy: 1,
    description: '旧版本',
    size: 1024,
    hash: 'hash1'
  };

  const mockNewVersion: VersionInfo = {
    id: 2,
    content: '# Version 2\nNew content line 1\nOld content line 2\nNew content line 3',
    versionNumber: 'v1.1',
    createdAt: new Date('2025-01-02'),
    createdBy: 1,
    description: '新版本',
    size: 1536,
    hash: 'hash2'
  };

  it('should render empty state when no versions provided', () => {
    render(<DiffViewPanel />);

    expect(screen.getByText('请选择版本查看变更')).toBeInTheDocument();
  });

  it('should render diff header with version info', () => {
    render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
      />
    );

    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1')).toBeInTheDocument();
  });

  it('should calculate and display diff lines', () => {
    const { container } = render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
      />
    );

    const diffLines = container.querySelectorAll('.diff-line');
    expect(diffLines.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        loading={true}
      />
    );

    expect(screen.getByText('正在计算差异...')).toBeInTheDocument();
  });

  it('should render action buttons when callbacks provided', () => {
    const handleRollback = jest.fn();
    const handleDownload = jest.fn();

    render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        onRollback={handleRollback}
        onDownload={handleDownload}
      />
    );

    const rollbackButton = screen.getByText(/回滚到/);
    const downloadButton = screen.getByText(/下载/);

    expect(rollbackButton).toBeInTheDocument();
    expect(downloadButton).toBeInTheDocument();
  });

  it('should call rollback callback when rollback button clicked', () => {
    const handleRollback = jest.fn();

    render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        onRollback={handleRollback}
      />
    );

    const rollbackButton = screen.getByText(/回滚到/);
    fireEvent.click(rollbackButton);

    expect(handleRollback).toHaveBeenCalledWith(mockOldVersion);
  });

  it('should call download callback when download button clicked', () => {
    const handleDownload = jest.fn();

    render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
        onDownload={handleDownload}
      />
    );

    const downloadButton = screen.getByText(/下载/);
    fireEvent.click(downloadButton);

    expect(handleDownload).toHaveBeenCalledWith(mockNewVersion);
  });

  it('should display stats in header', () => {
    const { container } = render(
      <DiffViewPanel
        oldVersion={mockOldVersion}
        newVersion={mockNewVersion}
      />
    );

    const statsTag = container.querySelector('.stats-tag');
    expect(statsTag).toBeInTheDocument();
  });

  it('should show empty state when versions are identical', () => {
    const identicalVersion: VersionInfo = {
      id: 3,
      content: '# Same content',
      versionNumber: 'v1.0',
      createdAt: new Date('2025-01-01'),
      createdBy: 1,
      description: '相同内容',
      size: 512,
      hash: 'hash3'
    };

    render(
      <DiffViewPanel
        oldVersion={identicalVersion}
        newVersion={identicalVersion}
      />
    );

    expect(screen.getByText('两个版本内容完全相同')).toBeInTheDocument();
  });
});
