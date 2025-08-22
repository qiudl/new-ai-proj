# Dependencies service skeleton for task 411

This folder contains a framework-agnostic service skeleton for the Dependencies API.
You can wire it into Express, Fastify, Koa, or NestJS with minimal glue.

What’s included
- openapi.yaml: The API contract for dependencies endpoints
- types.ts: DTO types and domain types
- validation.ts: Lightweight runtime validators (no external deps)
- errors.ts: Error codes and helpers for consistent error responses
- handlers.ts: Pure handler functions without framework coupling

How to integrate (Express example)
```ts
import express from 'express';
import bodyParser from 'body-parser';
import { registerDepsRoutes } from './src/backend/deps/handlers';

const app = express();
app.use(bodyParser.json());
registerDepsRoutes({
  get: (path, fn) => app.get(path, wrap(fn)),
  post: (path, fn) => app.post(path, wrap(fn)),
  patch: (path, fn) => app.patch(path, wrap(fn)),
  delete: (path, fn) => app.delete(path, wrap(fn)),
});
app.listen(3000);

function wrap(fn){
  return async (req, res) => {
    try{ const out = await fn({ req, res }); res.status(out.status).json(out.body); }
    catch(err){ console.error(err); res.status(err.status||500).json({ code: err.code||'500_INTERNAL', message: err.message}); }
  };
}
```

How to integrate (NestJS example)
- Create a Controller class and delegate to functions exported in handlers.ts
- Use pipes/filters for validation and error mapping, or reuse validation.ts directly

Next steps
- Replace in-memory store with real persistence (Postgres)
- Connect to your data layer that uses task_dependencies and task_attributes
- Add auth/permissions and request logging as needed

