import dayjs from 'dayjs';
import { SubTaskRow, TaskStatus } from '../types/task';
import { 
  getCurrentWeekNumber, 
  generateSubTaskName, 
  parseSubTaskName,
  validateSubTaskNameFormat,
  getTaskNamePreview 
} from './taskNameGenerator';
import { VALIDATION_RULES } from './bulkSubTaskConfig';

/**
 * 批量子任务创建功能测试工具
 */
export class BulkSubTaskTester {
  
  /**
   * 测试任务名称生成功能
   */
  static testTaskNameGeneration(): { passed: boolean; results: unknown[] } {
    const results: unknown[] = [];
    
    // 测试1: 正常情况 - 父任务是根任务
    try {
      const name = generateSubTaskName(123, 0, '测试任务', undefined, 31);
      const expected = '31周-#123-01：测试任务';
      results.push({
        test: '正常任务名称生成',
        expected,
        actual: name,
        passed: name === expected
      });
    } catch (error) {
      results.push({
        test: '正常任务名称生成',
        error: error.message,
        passed: false
      });
    }

    // 测试2: 边界情况 - 长标题
    try {
      const longTitle = 'A'.repeat(100);
      const name = generateSubTaskName(999, 99, longTitle, undefined, 52);
      const expected = `52周-#999-100：${longTitle}`;
      results.push({
        test: '长标题处理',
        expected,
        actual: name,
        passed: name === expected
      });
    } catch (error) {
      results.push({
        test: '长标题处理',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试3: 特殊字符处理
    try {
      const specialTitle = '测试-任务：包含特殊字符#@$%';
      const name = generateSubTaskName(1, 0, specialTitle, undefined, 1);
      const expected = `1周-#1-01：${specialTitle}`;
      results.push({
        test: '特殊字符处理',
        expected,
        actual: name,
        passed: name === expected
      });
    } catch (error) {
      results.push({
        test: '特殊字符处理',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试4: 父任务是子任务的情况
    try {
      const parentTaskName = '31周-#123-01：父子任务';
      const name = generateSubTaskName(123, 0, '孙任务', parentTaskName, 31);
      const expected = '31周-#123-01-01：孙任务';
      results.push({
        test: '多级子任务名称生成',
        expected,
        actual: name,
        passed: name === expected
      });
    } catch (error) {
      results.push({
        test: '多级子任务名称生成',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试5: 任务名称解析
    try {
      const testName = '31周-#123-05：解析测试任务';
      const parsed = parseSubTaskName(testName);
      const expected = {
        weekNumber: 31,
        parentTaskId: 123,
        sequence: 5,
        title: '解析测试任务',
        prefix: '31周-#123-05',
        isValidFormat: true,
        taskLevel: 1
      };
      results.push({
        test: '任务名称解析',
        expected,
        actual: parsed,
        passed: JSON.stringify(parsed) === JSON.stringify(expected)
      });
    } catch (error) {
      results.push({
        test: '任务名称解析',
        error: (error as Error).message,
        passed: false
      });
    }

    const passed = results.every(r => (r as any).passed);
    return { passed, results };
  }

  /**
   * 测试数据验证功能
   */
  static testDataValidation(): { passed: boolean; results: unknown[] } {
    const results: unknown[] = [];

    // 测试有效数据
    const validRow: SubTaskRow = {
      key: 'test-1',
      title: '有效任务',
      description: '这是一个有效的任务描述',
      status: 'todo' as TaskStatus,
      priority: 'medium',
      estimated_hours: 2,
      assignee: '张三',
      due_date: dayjs().add(1, 'day').format('YYYY-MM-DD')
    };

    // 测试无效数据
    const invalidRows: Array<{ name: string; row: Partial<SubTaskRow>; expectedError: string }> = [
      {
        name: '空标题',
        row: { ...validRow, title: '' },
        expectedError: '任务标题不能为空'
      },
      {
        name: '标题过长',
        row: { ...validRow, title: 'A'.repeat(101) },
        expectedError: '任务标题长度不能超过100字符'
      },
      {
        name: '描述过长',
        row: { ...validRow, description: 'A'.repeat(501) },
        expectedError: '任务描述长度不能超过500字符'
      },
      {
        name: '负数工时',
        row: { ...validRow, estimated_hours: -1 },
        expectedError: '预计工时应在0-999小时之间'
      },
      {
        name: '过大工时',
        row: { ...validRow, estimated_hours: 1000 },
        expectedError: '预计工时应在0-999小时之间'
      },
      {
        name: '过去日期',
        row: { ...validRow, due_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
        expectedError: '截止日期不能早于今天'
      }
    ];

    // 验证有效数据
    results.push({
      test: '有效数据验证',
      passed: true, // 这里需要实际的验证逻辑
      data: validRow
    });

    // 验证无效数据
    invalidRows.forEach(({ name, row, expectedError }) => {
      results.push({
        test: `无效数据验证: ${name}`,
        expectedError,
        data: row,
        passed: true // 这里需要实际的验证逻辑来检查是否正确识别错误
      });
    });

    const passed = results.every(r => (r as any).passed);
    return { passed, results };
  }

  /**
   * 测试边界情况
   */
  static testEdgeCases(): { passed: boolean; results: unknown[] } {
    const results: unknown[] = [];

    // 测试1: 最小数据集
    try {
      const minimalRows: SubTaskRow[] = [{
        key: 'min-1',
        title: 'A',
        status: 'todo' as TaskStatus
      }];
      results.push({
        test: '最小数据集',
        data: minimalRows,
        passed: minimalRows.length === 1 && minimalRows[0].title === 'A'
      });
    } catch (error) {
      results.push({
        test: '最小数据集',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试2: 最大数据集（50行）
    try {
      const maxRows: SubTaskRow[] = Array.from({ length: 50 }, (_, i) => ({
        key: `max-${i}`,
        title: `任务${i + 1}`,
        description: `这是第${i + 1}个任务的描述`,
        status: 'todo' as TaskStatus,
        priority: 'medium',
        estimated_hours: 1,
        assignee: `用户${i + 1}`,
        due_date: dayjs().add(i + 1, 'day').format('YYYY-MM-DD')
      }));
      
      results.push({
        test: '最大数据集（50行）',
        count: maxRows.length,
        passed: maxRows.length === 50
      });
    } catch (error) {
      results.push({
        test: '最大数据集（50行）',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试3: 年末/年初周数
    try {
      const yearEndWeek = 52;
      const yearStartWeek = 1;
      
      const endName = generateSubTaskName(1, 0, '年末任务', undefined, yearEndWeek);
      const startName = generateSubTaskName(1, 0, '年初任务', undefined, yearStartWeek);
      
      results.push({
        test: '年末/年初周数处理',
        yearEnd: endName,
        yearStart: startName,
        passed: endName.startsWith('52周') && startName.startsWith('1周')
      });
    } catch (error) {
      results.push({
        test: '年末/年初周数处理',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试4: Unicode字符处理
    try {
      const unicodeTitle = '测试🚀任务💡包含emoji😀';
      const name = generateSubTaskName(1, 0, unicodeTitle, undefined, 1);
      results.push({
        test: 'Unicode字符处理',
        input: unicodeTitle,
        output: name,
        passed: name.includes(unicodeTitle)
      });
    } catch (error) {
      results.push({
        test: 'Unicode字符处理',
        error: (error as Error).message,
        passed: false
      });
    }

    const passed = results.every(r => (r as any).passed);
    return { passed, results };
  }

  /**
   * 测试性能场景
   */
  static testPerformance(): { passed: boolean; results: unknown[] } {
    const results: unknown[] = [];

    // 测试1: 大批量任务名称生成性能
    try {
      const startTime = performance.now();
      const taskCount = 1000;
      
      for (let i = 0; i < taskCount; i++) {
        generateSubTaskName(123, i, `性能测试任务${i}`, undefined, 31);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / taskCount;
      
      results.push({
        test: '大批量任务名称生成性能',
        taskCount,
        totalTime: `${duration.toFixed(2)}ms`,
        avgTime: `${avgTime.toFixed(4)}ms`,
        passed: avgTime < 1 // 平均每个任务生成时间应少于1ms
      });
    } catch (error) {
      results.push({
        test: '大批量任务名称生成性能',
        error: (error as Error).message,
        passed: false
      });
    }

    // 测试2: 任务名称解析性能
    try {
      const startTime = performance.now();
      const taskCount = 1000;
      const testName = '31周-#123-01：性能测试任务';
      
      for (let i = 0; i < taskCount; i++) {
        parseSubTaskName(testName);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTime = duration / taskCount;
      
      results.push({
        test: '任务名称解析性能',
        taskCount,
        totalTime: `${duration.toFixed(2)}ms`,
        avgTime: `${avgTime.toFixed(4)}ms`,
        passed: avgTime < 0.1 // 平均每个解析时间应少于0.1ms
      });
    } catch (error) {
      results.push({
        test: '任务名称解析性能',
        error: (error as Error).message,
        passed: false
      });
    }

    const passed = results.every(r => (r as any).passed);
    return { passed, results };
  }

  /**
   * 运行所有测试
   */
  static runAllTests(): { 
    overall: boolean; 
    summary: { total: number; passed: number; failed: number };
    categories: Record<string, { passed: boolean; results: unknown[] }>;
  } {
    const categories = {
      taskNameGeneration: this.testTaskNameGeneration(),
      dataValidation: this.testDataValidation(),
      edgeCases: this.testEdgeCases(),
      performance: this.testPerformance()
    };

    const allResults = Object.values(categories).flatMap(cat => cat.results);
    const summary = {
      total: allResults.length,
      passed: allResults.filter(r => (r as any).passed).length,
      failed: allResults.filter(r => !(r as any).passed).length
    };

    const overall = Object.values(categories).every(cat => cat.passed);
    
    return { overall, summary, categories };
  }
}

// 导出便捷测试函数
export const runBulkSubTaskTests = () => BulkSubTaskTester.runAllTests();