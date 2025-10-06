// TaskDetail类型暂未定义,使用简化版本
interface TaskDetail {
  id: number;
  title: string;
  description?: string;
}

/**
 * AI文档生成步骤
 */
export enum GenerationStep {
  SELECT_MODEL = 1,   // 选择AI模型
  PREVIEW = 2,        // 预览文档
  EDIT = 3,           // 编辑文档
}

/**
 * AI配置信息
 */
export interface AIConfig {
  id: number;
  provider: 'openai' | 'deepseek' | 'anthropic';
  model: string;
  displayName: string;
  description?: string;
  isEnabled: boolean;
}

/**
 * 文档模板类型
 */
export type DocumentTemplateType =
  | 'technical_design'
  | 'bug_report'
  | 'feature_spec'
  | 'user_story'
  | 'test_plan'
  | 'api_documentation'
  | 'project_plan'
  | 'meeting_notes';

/**
 * 文档模板信息
 */
export interface DocumentTemplate {
  type: DocumentTemplateType;
  name: string;
  description: string;
  icon: string;
}

/**
 * 对话框Props
 */
export interface CreateAIDocDialogProps {
  open: boolean;
  task: TaskDetail;
  onClose: () => void;
  onSuccess?: (documentId: number) => void;
}

/**
 * 对话框状态
 */
export interface DialogState {
  currentStep: GenerationStep;
  selectedAIConfig: AIConfig | null;
  selectedTemplate: DocumentTemplateType | null;
  generatedContent: string;
  editedContent: string;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
}

/**
 * AI生成响应
 */
export interface GenerateDocumentResponse {
  content: string;
  document_id: number;
  generation_time_ms: number;
  ai_model: string;
  word_count: number;
}

/**
 * 步骤验证结果
 */
export interface StepValidation {
  valid: boolean;
  message?: string;
}
