import { useQuery, useQueryClient, UseMutationResult, useMutation } from '@tanstack/react-query';
import api, { checkTokenValidity } from '../services/api';
import { TaskService } from '../services/taskService';

// Types matching backend response (new progress API)
export interface ProgressResult {
  entity_type: 'task' | 'project';
  entity_id: number;
  progress: number; // 0..100
  method_used: string;
  updated_at: string;
  breakdown?: ProgressBreakdown[];
  inputs?: ProgressInputs;
  config_version?: number;
}

// Legacy task progress API shape
interface LegacyTaskProgress {
  percent_raw: number; // 0..1
  percent_display: number; // 0..100
  estimate_minutes: number | null;
  actual_minutes: number;
  overrun_percent: number;
  completed: boolean;
  breakdown?: Array<{
    id: number | string;
    title: string;
    weight: number;
    progress: number; // 0..1
    status: string;
  }>;
}

/**
 * Map legacy task progress payload to the new ProgressResult shape
 */
function mapLegacyToProgressResult(entityId: number, legacy: LegacyTaskProgress): ProgressResult {
  return {
    entity_type: 'task',
    entity_id: entityId,
    progress: legacy.percent_display ?? Math.round((legacy.percent_raw || 0) * 100),
    method_used: legacy.completed ? 'completed' : 'legacy-weighted',
    updated_at: new Date().toISOString(),
    breakdown: (legacy.breakdown || []).map((b) => ({
      id: typeof b.id === 'string' ? parseInt(b.id, 10) || 0 : b.id,
      title: b.title,
      progress: (b.progress || 0) * 100,
      weight: b.weight,
      status: b.status,
      method: undefined,
    })),
    inputs: {
      // Provide minimal inputs info for compatibility
      task_count: legacy.breakdown ? legacy.breakdown.length : 0,
    },
    config_version: 1,
  };
}

export interface ProgressBreakdown {
  id: number;
  title?: string;
  progress: number;
  weight: number;
  status: string;
  method?: string;
}

export interface ProgressInputs {
  status_map?: Record<string, number>;
  weight_by?: string;
  excluded_status?: string[];
  task_count?: number;
}

export interface ProgressSnapshot {
  entity_type: string;
  entity_id: number;
  progress: number;
  method_used: string;
  computed_at: string;
  breakdown?: ProgressBreakdown[];
  inputs?: ProgressInputs;
}

export interface RecomputeRequest {
  entityType: 'task' | 'project';
  id: number;
  recursive?: boolean;
  persistSnapshot?: boolean;
}

export interface UseProgressOptions {
  include?: string; // 'children,formula,snapshots' etc
  useCache?: boolean;
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Hook to fetch progress data for a task or project
 */
export function useProgress(
  entityType: 'task' | 'project',
  entityId: number | undefined,
  options: UseProgressOptions = {}
) {
  const { include = '', useCache = true, enabled = true, refetchInterval = false } = options;

  // Only enable when authenticated to avoid noisy network errors before login
  const isAuthed = (() => {
    try {
      return typeof window !== 'undefined' ? checkTokenValidity() : true;
    } catch {
      return false;
    }
  })();

  return useQuery<ProgressResult>({
    queryKey: ['progress', entityType, entityId, include, useCache],
    queryFn: async () => {
      if (!entityId) throw new Error('Entity ID is required');
      
      const params = new URLSearchParams();
      if (include) params.append('include', include);
      params.append('useCache', String(useCache));
      
      // Prefer legacy progress endpoint for now; it's cached to avoid 404 spam and returns zero fallback
      if (entityType === 'task') {
        try {
          const legacy = await TaskService.getTaskProgress(entityId);
          return mapLegacyToProgressResult(entityId, legacy as unknown as LegacyTaskProgress);
        } catch {
          // Zero fallback without surfacing errors
          return mapLegacyToProgressResult(entityId, {
            percent_raw: 0,
            percent_display: 0,
            estimate_minutes: null,
            actual_minutes: 0,
            overrun_percent: 0,
            completed: false,
            breakdown: []
          });
        }
      }
      // Project progress not available yet; return default zero result
      return {
        entity_type: 'project',
        entity_id: entityId,
        progress: 0,
        method_used: 'unavailable',
        updated_at: new Date().toISOString(),
        breakdown: [],
        inputs: { task_count: 0 },
        config_version: 1
      } as ProgressResult;
    },
    enabled: enabled && !!entityId && isAuthed,
    refetchInterval,
    staleTime: useCache ? 5 * 60 * 1000 : 0, // 5 minutes if using cache
  });
}

/**
 * Hook to fetch progress snapshots (historical data)
 */
export function useProgressSnapshots(
  entityType: 'task' | 'project',
  entityId: number | undefined,
  options: {
    from?: Date;
    to?: Date;
    granularity?: 'hourly' | 'daily';
    enabled?: boolean;
  } = {}
) {
  const { from, to, granularity = 'daily', enabled = true } = options;

  return useQuery<ProgressSnapshot[]>({
    queryKey: ['progress-snapshots', entityType, entityId, from?.toISOString(), to?.toISOString(), granularity],
    queryFn: async () => {
      if (!entityId) throw new Error('Entity ID is required');
      
      const params = new URLSearchParams();
      if (from) params.append('from', from.toISOString());
      if (to) params.append('to', to.toISOString());
      params.append('granularity', granularity);
      
      const response = await api.get(
        `/progress/${entityType}/${entityId}/snapshots?${params.toString()}`
      );
      
      return (response as ProgressSnapshot[]) || [];
    },
    enabled: enabled && !!entityId,
  });
}

/**
 * Hook to recompute progress (force recalculation)
 */
export function useRecomputeProgress() {
  const queryClient = useQueryClient();

  return useMutation<ProgressResult, Error, RecomputeRequest>({
    mutationFn: async (request: RecomputeRequest) => {
      try {
        const response = await api.post('/progress/recompute', request);
        return response as ProgressResult;
      } catch (err: any) {
        // Fallback: if recompute endpoint not available, just fetch latest legacy progress
        const status = err?.status ?? err?.response?.status;
        if (request.entityType === 'task' && (status === 404 || status === 501)) {
          const legacy = await api.get(`/tasks/${request.id}/progress`);
          return mapLegacyToProgressResult(request.id, legacy as unknown as LegacyTaskProgress);
        }
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['progress', variables.entityType, variables.id]
      });
      
      // If recursive, also invalidate parent/project queries
      if (variables.recursive) {
        queryClient.invalidateQueries({
          queryKey: ['progress']
        });
      }
    },
  });
}

/**
 * Helper function to format progress for display
 */
export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`;
}

/**
 * Helper function to get progress color based on value and status
 */
export function getProgressColor(progress: number, status?: string): string {
  if (status === 'completed' || progress >= 100) return '#52c41a'; // green
  if (status === 'blocked') return '#faad14'; // orange
  if (progress >= 75) return '#1890ff'; // blue
  if (progress >= 50) return '#13c2c2'; // cyan
  if (progress >= 25) return '#722ed1'; // purple
  return '#8c8c8c'; // gray
}

/**
 * Helper function to get status from progress
 */
export function getProgressStatus(progress: number): 'todo' | 'in_progress' | 'completed' {
  if (progress === 0) return 'todo';
  if (progress >= 100) return 'completed';
  return 'in_progress';
}
