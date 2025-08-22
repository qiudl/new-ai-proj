#!/usr/bin/env python3
"""
Sync Category/Risk/Depends on from task descriptions into structured tables.
- Reads tasks via TASK API (requires base url and token)
- Updates Postgres (task_attributes and optional task_dependencies)

Dry-run supported; by default --dry-run=false in Jenkins.
"""
import argparse
import os
import re
import sys
from dataclasses import dataclass
from typing import List, Optional

import requests
import psycopg

CATEGORY_RE = re.compile(r"Category\s*:\s*([A-Za-z_\-]+)", re.IGNORECASE)
RISK_RE = re.compile(r"Risk\s*:\s*([A-Za-z_\-]+)", re.IGNORECASE)
DEPENDS_RE = re.compile(r"Depends\s*on\s*:\s*([^\n]+)", re.IGNORECASE)
ID_RE = re.compile(r"#(\d+)")

@dataclass
class Task:
    id: int
    description: str


def fetch_tasks(api_base: str, token: str) -> List[Task]:
    url = f"{api_base.rstrip('/')}/tasks"
    headers = {"Authorization": f"Bearer {token}"}
    # Simple pagination loop; adapt if API differs
    tasks: List[Task] = []
    page = 1
    while True:
        resp = requests.get(url, params={"page": page, "page_size": 100}, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("tasks") or data.get("data") or []
        if not items:
            break
        for it in items:
            tasks.append(Task(id=int(it["id"]), description=it.get("description") or ""))
        page += 1
    return tasks


def parse_description(desc: str):
    cat = None
    risk = None
    deps: List[int] = []

    m = CATEGORY_RE.search(desc)
    if m:
        cat = m.group(1).strip().lower()

    m = RISK_RE.search(desc)
    if m:
        risk = m.group(1).strip().lower()

    m = DEPENDS_RE.search(desc)
    if m:
        # extract all #123 like ids in the depends line
        line = m.group(1)
        deps = [int(x) for x in ID_RE.findall(line)]

    return cat, risk, deps


def upsert_attributes(conn: psycopg.Connection, task_id: int, category: Optional[str], risk: Optional[str], dry_run: bool):
    if not (category or risk):
        return
    if dry_run:
        print(f"[DRY] upsert task_attributes task_id={task_id} category={category} risk={risk}")
        return
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO task_attributes(task_id, category_key, risk_key)
            VALUES (%s, %s, %s)
            ON CONFLICT (task_id)
            DO UPDATE SET category_key=EXCLUDED.category_key, risk_key=EXCLUDED.risk_key, updated_at=now()
            """,
            (task_id, category, risk),
        )


def insert_dependencies(conn: psycopg.Connection, task_id: int, depends: List[int], dry_run: bool):
    if not depends:
        return
    if dry_run:
        print(f"[DRY] insert dependencies for task_id={task_id} -> {depends}")
        return
    # optional table; create if exists
    with conn.cursor() as cur:
        cur.execute(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name='task_dependencies'
              ) THEN
                CREATE TABLE task_dependencies (
                  id SERIAL PRIMARY KEY,
                  task_id INTEGER NOT NULL,
                  depends_on_id INTEGER NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  UNIQUE(task_id, depends_on_id)
                );
                CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
                CREATE INDEX IF NOT EXISTS idx_task_dependencies_dep ON task_dependencies(depends_on_id);
              END IF;
            END
            $$;
            """
        )
        for d in depends:
            cur.execute(
                """
                INSERT INTO task_dependencies(task_id, depends_on_id)
                VALUES (%s, %s)
                ON CONFLICT (task_id, depends_on_id) DO NOTHING
                """,
                (task_id, d),
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db-url', required=True)
    parser.add_argument('--api-base', required=True)
    parser.add_argument('--api-token', required=True)
    parser.add_argument('--dry-run', default='true')
    args = parser.parse_args()

    dry_run = str(args.dry_run).lower() == 'true'

    tasks = fetch_tasks(args.api_base, args.api_token)
    if not tasks:
        print("No tasks fetched; exiting")
        return

    with psycopg.connect(args.db_url) as conn:
        with conn.transaction():
            for t in tasks:
                cat, risk, deps = parse_description(t.description)
                upsert_attributes(conn, t.id, cat, risk, dry_run)
                insert_dependencies(conn, t.id, deps, dry_run)
        if dry_run:
            conn.rollback()
            print("DRY-RUN complete; rolled back")
        else:
            conn.commit()
            print("Sync complete")

if __name__ == '__main__':
    main()

