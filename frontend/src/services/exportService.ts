import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { Company } from '../types/company';
import { configurePDFForChinese, validatePDFChineseContent } from '../utils/pdfFontUtils';

// 扩展jsPDF类型定义
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

// 导出数据类型定义
export interface ExportData {
  weekRange: string;
  selectedWeek: Dayjs;
  tasks: Task[];
  projects?: Project[];
  customers?: Company[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  filters: {
    selectedProject?: number;
    selectedCustomer?: number;
    selectedStatus: string;
    searchText: string;
  };
}

// 导出配置选项
export interface ExportOptions {
  filename?: string;
  includeStats?: boolean;
  includeDetails?: boolean;
  includeCharts?: boolean;
  customFields?: string[];
  groupBy?: 'project' | 'status' | 'priority' | 'assignee' | 'none';
  dateFormat?: string;
  language?: 'zh' | 'en';
  fontSize?: number;
}

// 默认导出配置
const DEFAULT_OPTIONS: Required<ExportOptions> = {
  filename: '',
  includeStats: true,
  includeDetails: true,
  includeCharts: false,
  fontSize: 12,
  customFields: [],
  groupBy: 'none',
  dateFormat: 'YYYY-MM-DD',
  language: 'zh',
};

// 文本本地化
const i18n = {
  zh: {
    weeklyReport: '任务周报',
    exportTime: '导出时间',
    reportPeriod: '报告期间',
    totalTasks: '任务总数',
    completedTasks: '已完成',
    inProgressTasks: '进行中',
    todoTasks: '待办',
    overdueTasks: '逾期',
    completionRate: '完成率',
    taskDetails: '任务详情',
    taskName: '任务名称',
    project: '项目',
    assignee: '负责人',
    status: '状态',
    priority: '优先级',
    dueDate: '截止时间',
    createdAt: '创建时间',
    progress: '进度',
    description: '描述',
    summary: '汇总统计',
    filters: '筛选条件',
    noData: '暂无数据',
  },
  en: {
    weeklyReport: 'Weekly Task Report',
    exportTime: 'Export Time',
    reportPeriod: 'Report Period',
    totalTasks: 'Total Tasks',
    completedTasks: 'Completed',
    inProgressTasks: 'In Progress',
    todoTasks: 'Todo',
    overdueTasks: 'Overdue',
    completionRate: 'Completion Rate',
    taskDetails: 'Task Details',
    taskName: 'Task Name',
    project: 'Project',
    assignee: 'Assignee',
    status: 'Status',
    priority: 'Priority',
    dueDate: 'Due Date',
    createdAt: 'Created At',
    progress: 'Progress',
    description: 'Description',
    summary: 'Summary',
    filters: 'Filters',
    noData: 'No Data',
  },
};

// 状态文本映射
const statusText = {
  zh: {
    todo: '待办',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  },
  en: {
    todo: 'Todo',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
};

// 优先级文本映射
const priorityText = {
  zh: {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  },
  en: {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
};

// 获取项目名称
const getProjectName = (projectId: number, projects?: Project[]): string => {
  if (!projects) return `项目${projectId}`;
  const project = projects.find(p => p.id === projectId);
  return project?.name || `项目${projectId}`;
};

// 准备Excel数据
const prepareExcelData = (data: ExportData, options: Required<ExportOptions>) => {
  const t = i18n[options.language];
  const sheets: { [key: string]: any[][] } = {};

  // 1. 汇总统计表
  if (options.includeStats) {
    sheets[t.summary] = [
      [t.weeklyReport, data.weekRange],
      [t.exportTime, dayjs().format(options.dateFormat + ' HH:mm:ss')],
      ['', ''],
      [t.totalTasks, data.stats.totalTasks],
      [t.completedTasks, data.stats.completedTasks],
      [t.inProgressTasks, data.stats.inProgressTasks],
      [t.todoTasks, data.stats.todoTasks],
      [t.overdueTasks, data.stats.overdueTasks],
      [t.completionRate, `${data.stats.completionRate}%`],
      ['', ''],
      [t.filters, ''],
      ['项目筛选', data.filters.selectedProject ? `ID: ${data.filters.selectedProject}` : '全部'],
      ['状态筛选', data.filters.selectedStatus === 'all' ? '全部' : statusText[options.language][data.filters.selectedStatus as keyof typeof statusText.zh] || data.filters.selectedStatus],
      ['搜索关键词', data.filters.searchText || '无'],
    ];
  }

  // 2. 任务详情表
  if (options.includeDetails && data.tasks.length > 0) {
    const headers = [
      t.taskName,
      t.project,
      t.assignee,
      t.status,
      t.priority,
      t.progress,
      t.dueDate,
      t.createdAt,
    ];

    // 添加自定义字段列
    if (options.customFields.length > 0) {
      headers.push(...options.customFields);
    }

    if (options.includeDetails) {
      headers.push(t.description);
    }

    const rows = data.tasks.map(task => {
      const row = [
        task.title,
        getProjectName(task.project_id, data.projects),
        task.assignee_name || '',
        statusText[options.language][task.status as keyof typeof statusText.zh] || task.status,
        task.custom_fields?.priority ? priorityText[options.language][task.custom_fields.priority as keyof typeof priorityText.zh] || task.custom_fields.priority : '',
        task.progress ? `${task.progress}%` : '0%',
        task.due_date ? dayjs(task.due_date).format(options.dateFormat) : '',
        dayjs(task.created_at).format(options.dateFormat),
      ];

      // 添加自定义字段数据
      if (options.customFields.length > 0) {
        options.customFields.forEach(field => {
          row.push(task.custom_fields?.[field] || '');
        });
      }

      if (options.includeDetails) {
        row.push(task.description || '');
      }

      return row;
    });

    sheets[t.taskDetails] = [headers, ...rows];
  }

  // 3. 按分组统计
  if (options.groupBy !== 'none' && data.tasks.length > 0) {
    const groupedData: { [key: string]: Task[] } = {};
    
    data.tasks.forEach(task => {
      let groupKey = '';
      switch (options.groupBy) {
        case 'project':
          groupKey = getProjectName(task.project_id, data.projects);
          break;
        case 'status':
          groupKey = statusText[options.language][task.status as keyof typeof statusText.zh] || task.status;
          break;
        case 'priority':
          groupKey = task.custom_fields?.priority ? priorityText[options.language][task.custom_fields.priority as keyof typeof priorityText.zh] || task.custom_fields.priority : '未设置';
          break;
        case 'assignee':
          groupKey = task.assignee_name || '未分配';
          break;
      }
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      groupedData[groupKey].push(task);
    });

    const groupSummary = [
      ['分组', '任务数量', '已完成', '完成率'],
      ...Object.entries(groupedData).map(([group, tasks]) => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
        return [group, tasks.length, completed, `${rate}%`];
      }),
    ];

    sheets[`按${options.groupBy === 'project' ? '项目' : options.groupBy === 'status' ? '状态' : options.groupBy === 'priority' ? '优先级' : '负责人'}分组`] = groupSummary;
  }

  return sheets;
};

// Excel导出
export const exportToExcel = async (data: ExportData, options: Partial<ExportOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.filename) {
    config.filename = `任务周报_${data.selectedWeek.format('YYYY年第ww周')}_${dayjs().format('MMDD')}.xlsx`;
  }

  try {
    const sheets = prepareExcelData(data, config);
    const workbook = XLSX.utils.book_new();

    Object.entries(sheets).forEach(([sheetName, sheetData]) => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // 设置列宽
      const colWidths = sheetData[0]?.map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheetData.map(row => String(row[colIndex] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, config.filename);

    return true;
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Excel导出失败');
  }
};

// PDF导出
export const exportToPDF = async (data: ExportData, options: Partial<ExportOptions> = {}) => {
  // 检查jsPDF可用性
  if (typeof window === 'undefined' || !(window as any).jsPDF) {
    throw new Error('PDF导出库未加载，请检查网络连接或重新刷新页面');
  }
  
  const config = { ...DEFAULT_OPTIONS, ...options };
  const t = i18n[config.language];
  
  if (!config.filename) {
    config.filename = `任务周报_${data.selectedWeek.format('YYYY年第ww周')}_${dayjs().format('MMDD')}.pdf`;
  }

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;

    // 🔧 [任务#714修复] 配置PDF中文字体支持
    await configurePDFForChinese(pdf, {
      fontSize: 12,
      lineHeight: 1.4,
      fallbackFont: 'helvetica'  // 如果中文字体加载失败，使用helvetica作为后备
    });


    // 标题
    pdf.setFontSize(18);
    pdf.text(t.weeklyReport, 20, yPosition);
    yPosition += 15;

    // 基本信息
    pdf.setFontSize(10);
    pdf.text(`${t.reportPeriod}: ${data.weekRange}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`${t.exportTime}: ${dayjs().format(config.dateFormat + ' HH:mm:ss')}`, 20, yPosition);
    yPosition += 15;

    // 统计信息
    if (config.includeStats) {
      pdf.setFontSize(14);
      pdf.text(t.summary, 20, yPosition);
      yPosition += 10;

      const statsData = [
        [t.totalTasks, data.stats.totalTasks.toString()],
        [t.completedTasks, data.stats.completedTasks.toString()],
        [t.inProgressTasks, data.stats.inProgressTasks.toString()],
        [t.todoTasks, data.stats.todoTasks.toString()],
        [t.overdueTasks, data.stats.overdueTasks.toString()],
        [t.completionRate, `${data.stats.completionRate}%`],
      ];

      pdf.autoTable({
        startY: yPosition,
        head: [['指标', '数值']],
        body: statsData,
        margin: { left: 20 },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;
    }

    // 任务详情表
    if (config.includeDetails && data.tasks.length > 0) {
      // 检查是否需要新页面
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(t.taskDetails, 20, yPosition);
      yPosition += 5;

      const taskHeaders = [t.taskName, t.project, t.status, t.priority, t.dueDate];
      const taskData = data.tasks.map(task => [
        task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title,
        getProjectName(task.project_id, data.projects),
        statusText[config.language][task.status as keyof typeof statusText.zh] || task.status,
        task.custom_fields?.priority ? priorityText[config.language][task.custom_fields.priority as keyof typeof priorityText.zh] || task.custom_fields.priority : '-',
        task.due_date ? dayjs(task.due_date).format(config.dateFormat) : '-',
      ]);

      pdf.autoTable({
        startY: yPosition + 5,
        head: [taskHeaders],
        body: taskData,
        margin: { left: 20 },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: 50 }, // 任务名称列稍宽
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
        },
      });
    }

    // 🔧 [任务#714修复] 验证PDF中文内容支持
    const allTextContent = [
      t.weeklyReport,
      data.weekRange,
      ...data.tasks.map(task => task.title),
      ...data.tasks.map(task => getProjectName(task.project_id, data.projects)),
    ];
    
    const validation = validatePDFChineseContent(pdf, allTextContent);
    
    if (validation.hasChineseContent && !validation.fontSupported) {
      console.warn('⚠️ PDF包含中文内容但字体支持可能不完整:', validation.recommendations);
    }

    // 🔧 [任务#714修复] 添加页码功能
    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128); // 灰色
      
      // 在页面底部中央添加页码
      const pageWidth = pdf.internal.pageSize.width;
      const pageText = `第 ${i} 页，共 ${pageCount} 页`;
      const textWidth = pdf.getTextWidth(pageText);
      const xPosition = (pageWidth - textWidth) / 2;
      
      pdf.text(pageText, xPosition, pdf.internal.pageSize.height - 10);
      
      // 重置文本颜色为黑色，以免影响其他内容
      pdf.setTextColor(0, 0, 0);
    }

    // 验证PDF内容
    const pdfOutput = pdf.output('blob');
    if (!pdfOutput || pdfOutput.size === 0) {
      throw new Error('PDF内容为空，导出失败');
    }

    // 保存PDF
    pdf.save(config.filename);
    
    // 输出成功信息（日志移除）
    
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    // 提供更详细的错误信息
    if (error.message?.includes('undefined')) {
      throw new Error('PDF导出库加载失败，请检查网络连接');
    }
    throw new Error(`PDF导出失败: ${error.message}`);
  }
};

// CSV导出（作为备用选项）
export const exportToCSV = async (data: ExportData, options: Partial<ExportOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const t = i18n[config.language];
  
  if (!config.filename) {
    config.filename = `任务周报_${data.selectedWeek.format('YYYY年第ww周')}_${dayjs().format('MMDD')}.csv`;
  }

  try {
    const headers = [
      t.taskName,
      t.project,
      t.assignee,
      t.status,
      t.priority,
      t.dueDate,
      t.createdAt,
    ];

    const rows = data.tasks.map(task => [
      `"${task.title.replace(/"/g, '""')}"`,
      `"${getProjectName(task.project_id, data.projects)}"`,
      `"${task.assignee_name || ''}"`,
      `"${statusText[config.language][task.status as keyof typeof statusText.zh] || task.status}"`,
      `"${task.custom_fields?.priority ? priorityText[config.language][task.custom_fields.priority as keyof typeof priorityText.zh] || task.custom_fields.priority : ''}"`,
      `"${task.due_date ? dayjs(task.due_date).format(config.dateFormat) : ''}"`,
      `"${dayjs(task.created_at).format(config.dateFormat)}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, config.filename);

    return true;
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error('CSV导出失败');
  }
};

// 导出预览数据
export const generateExportPreview = (data: ExportData, options: Partial<ExportOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const t = i18n[config.language];
  
  return {
    summary: {
      title: `${t.weeklyReport} - ${data.weekRange}`,
      stats: [
        { label: t.totalTasks, value: data.stats.totalTasks },
        { label: t.completedTasks, value: data.stats.completedTasks },
        { label: t.inProgressTasks, value: data.stats.inProgressTasks },
        { label: t.completionRate, value: `${data.stats.completionRate}%` },
      ],
      taskCount: data.tasks.length,
      exportTime: dayjs().format(config.dateFormat + ' HH:mm:ss'),
    },
    sheets: Object.keys(prepareExcelData(data, config)),
    estimatedSize: Math.ceil(data.tasks.length / 100) + 'KB',
  };
};