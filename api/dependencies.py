from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import os
import psycopg

app = FastAPI(title="Task Dependencies API", version="0.1.0")

DB_URL = os.getenv("DB_URL", "postgresql://ai:ai@localhost:5433/ai_tasks")

class DepCreate(BaseModel):
    task_id: int
    depends_on_id: int
    dep_type: str = "FS"  # FS, SS, FF, SF
    lag_minutes: int = 0

class DepItem(BaseModel):
    id: int
    task_id: int
    depends_on_id: int
    dep_type: str = "FS"
    lag_minutes: int = 0

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/dependencies", response_model=List[DepItem])
def list_deps(task_id: Optional[int] = Query(None), depends_on_id: Optional[int] = Query(None)):
    sql = "SELECT id, task_id, depends_on_id, dep_type, lag_minutes FROM task_dependencies WHERE 1=1"
    params: List[Any] = []
    if task_id is not None:
        sql += " AND task_id = %s"
        params.append(task_id)
    if depends_on_id is not None:
        sql += " AND depends_on_id = %s"
        params.append(depends_on_id)
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [{"id": r[0], "task_id": r[1], "depends_on_id": r[2], "dep_type": r[3], "lag_minutes": r[4]} for r in rows]

@app.post("/dependencies", status_code=201, response_model=DepItem)
def create_dep(payload: DepCreate):
    if payload.task_id == payload.depends_on_id:
        raise HTTPException(status_code=400, detail="task_id cannot equal depends_on_id")
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO task_dependencies(task_id, depends_on_id, dep_type, lag_minutes)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (task_id, depends_on_id) DO NOTHING
                    RETURNING id
                    """,
                    (payload.task_id, payload.depends_on_id, payload.dep_type, payload.lag_minutes),
                )
                row = cur.fetchone()
                if row is None:
                    # already exists; update attributes and fetch id
                    cur.execute(
                        "UPDATE task_dependencies SET dep_type=%s, lag_minutes=%s WHERE task_id=%s AND depends_on_id=%s RETURNING id",
                        (payload.dep_type, payload.lag_minutes, payload.task_id, payload.depends_on_id),
                    )
                    row = cur.fetchone()
                dep_id = row[0]
                return {"id": dep_id, "task_id": payload.task_id, "depends_on_id": payload.depends_on_id, "dep_type": payload.dep_type, "lag_minutes": payload.lag_minutes}
            except psycopg.Error as e:
                raise HTTPException(status_code=400, detail=str(e))

@app.delete("/dependencies/{dep_id}", status_code=204)
def delete_dep(dep_id: int):
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM task_dependencies WHERE id=%s", (dep_id,))
            return

@app.post("/validate/dag")
def validate_dag():
    # Detect cycles using DFS on current edges
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT task_id, depends_on_id FROM task_dependencies")
            edges = cur.fetchall()
    graph: Dict[int, List[int]] = {}
    for t, d in edges:
        graph.setdefault(t, []).append(d)
        graph.setdefault(d, [])

    visited: Dict[int, int] = {}  # 0 unvisited, 1 visiting, 2 done
    cycles: List[List[int]] = []

    def dfs(u: int, stack: List[int]):
        visited[u] = 1
        for v in graph.get(u, []):
            if visited.get(v, 0) == 0:
                dfs(v, stack + [v])
            elif visited.get(v) == 1:
                # found a back edge forming a cycle; extract cycle path
                if v in stack:
                    i = stack.index(v)
                    cycles.append(stack[i:] + [v])
        visited[u] = 2

    for node in list(graph.keys()):
        if visited.get(node, 0) == 0:
            dfs(node, [node])

    return {"valid": len(cycles) == 0, "cycles": cycles}

@app.get("/validate/orphans")
def validate_orphans():
    # If tasks table exists, detect edges that reference missing tasks
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name='tasks'
                  ) THEN
                    RAISE NOTICE 'tasks table not found; skipping orphans check';
                  END IF;
                END $$;
                """
            )
            cur.execute("SELECT id, task_id, depends_on_id FROM task_dependencies")
            deps = cur.fetchall()
            # Try to check tasks existence if table exists
            cur.execute("""
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables WHERE table_name='tasks'
                )
            """)
            has_tasks = cur.fetchone()[0]
            orphans = []
            if has_tasks:
                for dep in deps:
                    dep_id, t, d = dep
                    cur.execute("SELECT 1 FROM tasks WHERE id=%s", (t,))
                    t_exists = cur.fetchone() is not None
                    cur.execute("SELECT 1 FROM tasks WHERE id=%s", (d,))
                    d_exists = cur.fetchone() is not None
                    if not t_exists or not d_exists:
                        orphans.append({"id": dep_id, "task_id": t, "depends_on_id": d, "task_exists": t_exists, "depends_exists": d_exists})
            return {"has_tasks_table": has_tasks, "orphans": orphans}

# To run: uvicorn api.dependencies:app --reload --port 8000

