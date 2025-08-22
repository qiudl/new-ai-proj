// Error codes and helpers for consistent error responses

export const Errors = {
  INVALID_RELATION: '400_INVALID_RELATION',
  SELF_DEP: '400_SELF_DEP',
  DUPLICATE_DEP: '409_DUPLICATE_DEP',
  CYCLE_DETECTED: '409_CYCLE_DETECTED',
  NOT_FOUND: '404_NOT_FOUND',
  INTERNAL: '500_INTERNAL',
} as const;

export class HttpError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string){
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(code: string, message: string){
  return new HttpError(400, code, message);
}
export function notFound(message='Not found'){
  return new HttpError(404, Errors.NOT_FOUND, message);
}
export function conflict(code: string, message: string){
  return new HttpError(409, code, message);
}
export function internal(message='Internal error'){
  return new HttpError(500, Errors.INTERNAL, message);
}

