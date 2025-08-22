import api from '../services/api';
import { logger } from './logger';

export type AnalyticsPayload = Record<string, any> | undefined;

export async function track(event: string, payload: AnalyticsPayload = undefined) {
  try {
    // Local log for observability
    logger.userAction(`analytics:${event}`, { ...payload, type: 'analytics' });

    // Best-effort fire-and-forget to backend (if available)
    await api.post('/analytics/events', {
      event,
      payload,
      ts: new Date().toISOString(),
    }).catch(() => void 0);
  } catch {
    // Never throw from analytics
  }
}
