import { getWorkNoteTypeConfig, getWorkNotePriorityConfig, WORK_NOTE_TYPES, WORK_NOTE_PRIORITIES } from '../workNoteTypes';

describe('Work Note Types', () => {
  test('should return correct config for valid types', () => {
    expect(getWorkNoteTypeConfig('meeting')).toEqual({
      value: 'meeting',
      label: '会议笔记',
      icon: '🤝',
      color: '#52c41a'
    });
  });

  test('should return default config for invalid types', () => {
    expect(getWorkNoteTypeConfig('invalid')).toEqual({
      value: 'general',
      label: '通用笔记',
      icon: '📝',
      color: '#1890ff'
    });
  });

  test('should have all required work note types', () => {
    const expectedTypes = ['general', 'meeting', 'idea', 'log', 'reference', 'template'];
    const actualTypes = Object.keys(WORK_NOTE_TYPES);
    expect(actualTypes).toEqual(expectedTypes);
  });
});

describe('Work Note Priorities', () => {
  test('should return correct config for valid priorities', () => {
    expect(getWorkNotePriorityConfig('high')).toEqual({
      value: 'high',
      label: '高优先级',
      color: '#faad14'
    });
  });

  test('should return default config for invalid priorities', () => {
    expect(getWorkNotePriorityConfig('invalid')).toEqual({
      value: 'medium',
      label: '中等优先级',
      color: '#1890ff'
    });
  });

  test('should have all required priorities', () => {
    const expectedPriorities = ['low', 'medium', 'high', 'urgent'];
    const actualPriorities = Object.keys(WORK_NOTE_PRIORITIES);
    expect(actualPriorities).toEqual(expectedPriorities);
  });
});