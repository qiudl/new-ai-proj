import api from '../services/api';
import { logger } from './logger';

export type AnalyticsPayload = Record<string, any> | undefined;

export async function track(event: string, payload: AnalyticsPayload = undefined) {
  try {
    // Local log for observability
    logger.userAction(`analytics:${event}`, { ...payload, type: 'analytics' });

    // Backend expects { event, user_id?, project_id?, task_id?, context?, created_at? }
    const body: any = {
      event,
      context: payload || {},
      created_at: new Date().toISOString(),
    };
    // Pass through common identifiers if present in payload
    if (payload && typeof payload === 'object') {
      if ('projectId' in payload && payload.projectId != null) body.project_id = payload.projectId;
      if ('taskId' in payload && payload.taskId != null) body.task_id = payload.taskId;
    }

    // Best-effort fire-and-forget to backend (if available)
    // Backend first tries to decode an array of events; send as array to avoid 400
    await api.post('/analytics/events', [body]).catch(() => void 0);
  } catch {
    // Never throw from analytics
  }
}
