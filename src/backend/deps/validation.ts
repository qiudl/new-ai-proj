// Minimal runtime validation without external deps
import { DependencyCreateDTO, DependencyUpdateDTO, RelationType } from './types';
import { badRequest, Errors } from './errors';

const REL_SET = new Set<RelationType>(['FS','SS','FF','SF']);

export function validateCreate(input: any): DependencyCreateDTO {
  if (typeof input !== 'object' || input === null) throw badRequest(Errors.INVALID_RELATION, 'Body must be an object');
  const { to_task_id, relation_type, lag_minutes=0, is_blocking=true, note } = input;
  if (!Number.isInteger(to_task_id)) throw badRequest(Errors.INVALID_RELATION, 'to_task_id must be integer');
  if (!REL_SET.has(relation_type)) throw badRequest(Errors.INVALID_RELATION, `relation_type must be one of ${Array.from(REL_SET).join(',')}`);
  if (!Number.isInteger(lag_minutes) || lag_minutes < 0) throw badRequest(Errors.INVALID_RELATION, 'lag_minutes must be >=0 integer');
  if (typeof is_blocking !== 'boolean') throw badRequest(Errors.INVALID_RELATION, 'is_blocking must be boolean');
  if (note !== undefined && typeof note !== 'string') throw badRequest(Errors.INVALID_RELATION, 'note must be string');
  return { to_task_id, relation_type, lag_minutes, is_blocking, note };
}

export function validateUpdate(input: any): DependencyUpdateDTO {
  if (typeof input !== 'object' || input === null) throw badRequest(Errors.INVALID_RELATION, 'Body must be an object');
  const out: DependencyUpdateDTO = {};
  if (input.relation_type !== undefined){
    if (!REL_SET.has(input.relation_type)) throw badRequest(Errors.INVALID_RELATION, 'invalid relation_type');
    out.relation_type = input.relation_type;
  }
  if (input.lag_minutes !== undefined){
    if (!Number.isInteger(input.lag_minutes) || input.lag_minutes < 0) throw badRequest(Errors.INVALID_RELATION, 'invalid lag_minutes');
    out.lag_minutes = input.lag_minutes;
  }
  if (input.is_blocking !== undefined){
    if (typeof input.is_blocking !== 'boolean') throw badRequest(Errors.INVALID_RELATION, 'invalid is_blocking');
    out.is_blocking = input.is_blocking;
  }
  if (input.note !== undefined){
    if (typeof input.note !== 'string') throw badRequest(Errors.INVALID_RELATION, 'invalid note');
    out.note = input.note;
  }
  return out;
}

