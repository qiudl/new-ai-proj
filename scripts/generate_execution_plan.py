#!/usr/bin/env python3
"""
Generate execution plan (ai_execution_plan.json) based on:
- Tasks from TASK API (status, id)
- Dependencies graph from Postgres (task_dependencies)

Ready set = tasks that are not completed and whose dependencies are all completed.
Outputs artifacts/ai_execution_plan.json with structure:
{
  "generated_at": iso8601,
  "counts": {"total": N, "completed": X, "candidates": Y, "ready": Z},
  "ready": [task_id, ...],
  "blocked": [{"task_id": id, "waiting_on": [dep_id, ...]}]
}

Notes:
- We treat missing dependency tasks as blocking (conservative).
- Extend as needed to support dependency types (FS/SS/FF/SF) and lags.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional

import psycopg
import requests

DEFAULT_OUTPUT = "artifacts/ai_execution_plan.json"


def fetch_all_tasks(api_base: str, token: str) -> List[dict]:
    url = f"{api_base.rstrip('/')}/tasks"
    headers = {"Authorization": f"Bearer {token}"}
    tasks: List[dict] = []
    page = 1
    while True:
        resp = requests.get(url, params={"page": page, "page_size": 100}, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("tasks") or data.get("data") or []
        if not items:
            break
        tasks.extend(items)
        page += 1
    return tasks


def load_dependencies(db_url: str) -> List[Tuple[int, int, str, int]]:
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name='task_dependencies'
                  ) THEN
                    CREATE TABLE task_dependencies (
                      id SERIAL PRIMARY KEY,
                      task_id INTEGER NOT NULL,
                      depends_on_id INTEGER NOT NULL,
                      dep_type TEXT NOT NULL DEFAULT 'FS',
                      lag_minutes INTEGER NOT NULL DEFAULT 0,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      UNIQUE(task_id, depends_on_id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
                    CREATE INDEX IF NOT EXISTS idx_task_dependencies_dep ON task_dependencies(depends_on_id);
                  END IF;
                END $$;
            """)
            cur.execute("SELECT task_id, depends_on_id, dep_type, lag_minutes FROM task_dependencies")
            return [(int(r[0]), int(r[1]), str(r[2]), int(r[3])) for r in cur.fetchall()]


def load_estimates(db_url: str) -> Dict[int, float]:
    # returns task_id -> estimate_hours (float)
    estimates: Dict[int, float] = {}
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # attributes JSONB may contain estimate_hours
            cur.execute(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name='task_attributes'
                  ) THEN
                    CREATE TABLE task_attributes (
                      id SERIAL PRIMARY KEY,
                      task_id INTEGER NOT NULL,
                      category_key TEXT NULL,
                      risk_key TEXT NULL,
                      attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      UNIQUE(task_id)
                    );
                  END IF;
                END $$;
                """
            )
            cur.execute("SELECT task_id, attributes FROM task_attributes")
            for task_id, attrs in cur.fetchall():
                try:
                    est = (attrs or {}).get('estimate_hours') if isinstance(attrs, dict) else None
                except Exception:
                    est = None
                if est is None:
                    # try to parse JSON via psycopg returning dict; if not, skip
                    continue
                try:
                    est_f = float(est)
                    if est_f > 0:
                        estimates[int(task_id)] = est_f
                except Exception:
                    pass
    return estimates

def compute_ready_and_structure(tasks: List[dict], deps: List[Tuple[int, int, str, int]], estimates: Dict[int, float]):
    status_map: Dict[int, str] = {}
    title_map: Dict[int, str] = {}
    for t in tasks:
        try:
            tid = int(t["id"]) if not isinstance(t["id"], int) else t["id"]
            status_map[tid] = (t.get("status") or "").lower()
            title_map[tid] = t.get("title") or t.get("name") or f"Task {tid}"
        except Exception:
            continue

    completed = {tid for tid, s in status_map.items() if s in {"done", "completed", "success"}}
    # Consider in_progress as candidates too; others like cancelled/archived excluded
    candidates = {tid for tid, s in status_map.items() if s not in {"done", "completed", "success", "cancelled", "archived"}}

    # Build adjacency: task -> list of (depends_on, dep_type, lag)
    dep_map: Dict[int, List[Tuple[int, str, int]]] = {}
    for t, d, typ, lag in deps:
        dep_map.setdefault(t, []).append((d, typ, lag))

    ready: List[int] = []
    blocked: List[Dict] = []

    for tid in sorted(candidates):
        waiting = []
        for (d, typ, lag) in dep_map.get(tid, []):
            # For MVP scheduling, any dependency task must be completed to be ready, regardless of dep_type/lag.
            # Future: use dep_type+lag with start/finish dates to compute readiness windows.
            if d not in completed:
                waiting.append(d)
        if waiting:
            blocked.append({"task_id": tid, "waiting_on": waiting})
        else:
            ready.append(tid)

    # Build DAG for candidates (edges only among tasks we know about)
    nodes = set(status_map.keys())
    # adjacency from u(dep) -> v(task)
    adj: Dict[int, List[int]] = {}
    indeg: Dict[int, int] = {n: 0 for n in nodes}
    for t, d, typ, lag in deps:
        if d in nodes and t in nodes:
            adj.setdefault(d, []).append(t)
            indeg[t] = indeg.get(t, 0) + 1
            indeg.setdefault(d, 0)

    # Kahn's algorithm for levels (batches)
    from collections import deque
    q = deque([n for n in nodes if indeg.get(n, 0) == 0])
    levels: Dict[int, int] = {}
    while q:
        u = q.popleft()
        lvl = max([levels.get(p, 0) for p in []], default=0)  # placeholder
        # level is inferred by parents; compute as max(parent level)+1
        # We lack reverse edges; compute when pushing children
        for v in adj.get(u, []):
            # propose level for v as max(levels[u]+1)
            levels[v] = max(levels.get(v, 0), levels.get(u, 0) + 1)
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
        # ensure u has level
        levels.setdefault(u, 0)

    # Derive batches from levels
    batches: Dict[int, List[int]] = {}
    for tid, lvl in levels.items():
        batches.setdefault(lvl, []).append(tid)
    batch_list = [{"batch": b, "tasks": sorted(tids)} for b, tids in sorted(batches.items(), key=lambda x: x[0])]

    # Critical path (longest path in DAG with node weights)
    # Node weight = estimate_hours if provided, else 1
    indeg2: Dict[int, int] = {n: 0 for n in nodes}
    for u, vs in adj.items():
        for v in vs:
            indeg2[v] += 1
    topo: List[int] = []
    q2 = deque([n for n in nodes if indeg2.get(n, 0) == 0])
    while q2:
        u = q2.popleft()
        topo.append(u)
        for v in adj.get(u, []):
            indeg2[v] -= 1
            if indeg2[v] == 0:
                q2.append(v)

    # initialize distance with node weight
    def weight(n: int) -> float:
        return float(estimates.get(n, 1.0)) if n in nodes else 1.0
    dist: Dict[int, float] = {n: weight(n) for n in nodes}
    prev: Dict[int, Optional[int]] = {n: None for n in nodes}
    for u in topo:
        for v in adj.get(u, []):
            if dist[u] + weight(v) > dist[v]:
                dist[v] = dist[u] + weight(v)
                prev[v] = u
    # find max dist node
    end = max(dist, key=lambda n: dist[n]) if dist else None
    critical_path: List[int] = []
    critical_path_detail: List[Dict] = []
    total_cp_hours: float = 0.0
    if end is not None:
        cur = end
        path_rev: List[int] = []
        while cur is not None:
            path_rev.append(cur)
            cur = prev.get(cur)
        critical_path = list(reversed(path_rev))
        critical_path_detail = [
            {"task_id": n, "title": title_map.get(n, f"Task {n}"), "estimate_hours": float(estimates.get(n, 1.0))}
            for n in critical_path
        ]
        total_cp_hours = sum(item["estimate_hours"] for item in critical_path_detail)

    return {
        "counts": {
            "total": len(status_map),
            "completed": len(completed),
            "candidates": len(candidates),
            "ready": len(ready),
        },
        "ready": ready,
        "blocked": blocked,
        "task_levels": levels,
        "batches": batch_list,
        "critical_path": critical_path,
        "critical_path_detail": critical_path_detail,
        "critical_path_total_hours": total_cp_hours,
        "edges": [{"from": d, "to": t, "type": typ, "lag": lag} for (t, d, typ, lag) in deps],
        "task_titles": title_map,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-url", required=True)
    parser.add_argument("--api-base", required=True)
    parser.add_argument("--api-token", required=True)
    parser.add_argument("--out", default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    tasks = fetch_all_tasks(args.api_base, args.api_token)
    deps = load_dependencies(args.db_url)
    estimates = load_estimates(args.db_url)

    plan = compute_ready_and_structure(tasks, deps, estimates)
    plan_out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        **plan,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(plan_out, f, ensure_ascii=False, indent=2)

    # Write helper artifacts
    batches_path = os.path.join(os.path.dirname(args.out), 'batches.json')
    crit_path = os.path.join(os.path.dirname(args.out), 'critical_path.json')
    with open(batches_path, 'w', encoding='utf-8') as f:
        json.dump(plan_out.get('batches', []), f, ensure_ascii=False, indent=2)
    with open(crit_path, 'w', encoding='utf-8') as f:
        json.dump(plan_out.get('critical_path', []), f, ensure_ascii=False, indent=2)

    print(f"Execution plan written to {args.out}; ready={plan_out['counts']['ready']}, batches={len(plan_out.get('batches', []))}")


if __name__ == "__main__":
    main()

