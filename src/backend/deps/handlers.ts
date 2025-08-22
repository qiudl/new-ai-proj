// Framework-agnostic handlers; wire with your router binder
import { RouterBinder, HttpResult } from './types';
import { validateCreate, validateUpdate } from './validation';
import { badRequest, conflict, notFound, Errors } from './errors';

// In-memory store placeholder (replace with Postgres repository)
const deps = new Map<number, any>();
let nextId = 1;

function ok<T>(body: T, status=200): HttpResult<T> { return { status, body }; }

export function registerDepsRoutes(r: RouterBinder){
  r.get('/api/tasks/:taskId/dependencies', listForTask);
  r.post('/api/tasks/:taskId/dependencies', createForTask);
  r.patch('/api/tasks/:taskId/dependencies/:depId', updateOne);
  r.delete('/api/tasks/:taskId/dependencies/:depId', deleteOne);
}

async function listForTask(ctx: any): Promise<HttpResult>{
  const taskId = parseInt(ctx.req.params.taskId, 10);
  if (!Number.isInteger(taskId)) throw badRequest(Errors.INVALID_RELATION, 'invalid taskId');
  const items = Array.from(deps.values()).filter(d => d.from_task_id === taskId || d.to_task_id === taskId);
  return ok({ items });
}

async function createForTask(ctx: any): Promise<HttpResult>{
  const taskId = parseInt(ctx.req.params.taskId, 10);
  if (!Number.isInteger(taskId)) throw badRequest(Errors.INVALID_RELATION, 'invalid taskId');
  const dto = validateCreate(ctx.req.body);
  if (taskId === dto.to_task_id) throw badRequest(Errors.SELF_DEP, 'from_task_id cannot equal to_task_id');
  // unique constraint check (from, to, type)
  const exists = Array.from(deps.values()).some(d => d.from_task_id === taskId && d.to_task_id === dto.to_task_id && d.relation_type === dto.relation_type);
  if (exists) throw conflict(Errors.DUPLICATE_DEP, 'duplicate dependency');
  const id = nextId++;
  const now = new Date().toISOString();
  const rec = { id, from_task_id: taskId, to_task_id: dto.to_task_id, relation_type: dto.relation_type, lag_minutes: dto.lag_minutes ?? 0, is_blocking: dto.is_blocking ?? true, note: dto.note, created_at: now, updated_at: now };
  deps.set(id, rec);
  return ok(rec, 201);
}

async function updateOne(ctx: any): Promise<HttpResult>{
  const depId = parseInt(ctx.req.params.depId, 10);
  if (!Number.isInteger(depId)) throw badRequest(Errors.INVALID_RELATION, 'invalid depId');
  const rec = deps.get(depId);
  if (!rec) throw notFound('dependency not found');
  const patch = validateUpdate(ctx.req.body);
  Object.assign(rec, patch, { updated_at: new Date().toISOString() });
  deps.set(depId, rec);
  return ok(rec);
}

async function deleteOne(ctx: any): Promise<HttpResult>{
  const depId = parseInt(ctx.req.params.depId, 10);
  if (!Number.isInteger(depId)) throw badRequest(Errors.INVALID_RELATION, 'invalid depId');
  if (!deps.has(depId)) throw notFound('dependency not found');
  deps.delete(depId);
  return ok({}, 204);
}

