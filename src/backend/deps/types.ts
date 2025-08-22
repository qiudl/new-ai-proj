// DTO and domain types for Dependencies API
// Framework-agnostic; can be reused across backend frameworks

export type RelationType = 'FS' | 'SS' | 'FF' | 'SF';

export interface DependencyDTO {
  id: number;
  from_task_id: number;
  to_task_id: number;
  relation_type: RelationType;
  lag_minutes: number;
  is_blocking: boolean;
  note?: string;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface DependencyCreateDTO {
  to_task_id: number;
  relation_type: RelationType;
  lag_minutes?: number;
  is_blocking?: boolean;
  note?: string;
}

export interface DependencyUpdateDTO {
  relation_type?: RelationType;
  lag_minutes?: number;
  is_blocking?: boolean;
  note?: string;
}

export interface DependencyBatchDTO {
  create?: Array<{
    from_task_id: number;
    to_task_id: number;
    relation_type: RelationType;
    lag_minutes?: number;
    is_blocking?: boolean;
    note?: string;
  }>;
  delete?: number[]; // dep IDs
}

export interface HttpResult<T=unknown> { status: number; body: T }

export interface RouterBinder {
  get(path: string, handler: (ctx: any) => Promise<HttpResult>): void;
  post(path: string, handler: (ctx: any) => Promise<HttpResult>): void;
  patch(path: string, handler: (ctx: any) => Promise<HttpResult>): void;
  delete(path: string, handler: (ctx: any) => Promise<HttpResult>): void;
}

