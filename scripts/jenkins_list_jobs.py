#!/usr/bin/env python3
# List Jenkins jobs recursively and print full folder paths.
# Env: JENK_URL (default http://localhost:8181), JENK_USER, JENK_TOKEN
# Usage: python3 scripts/jenkins_list_jobs.py [--max-depth 4]

import os
import sys
import json
import argparse
from urllib.parse import urljoin
from urllib.request import build_opener, HTTPBasicAuthHandler, HTTPPasswordMgrWithDefaultRealm, Request


def fetch_json(opener, url):
    req = Request(url)
    with opener.open(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


def list_jobs(opener, base_url, path_prefix='', api_url_suffix='api/json', depth=0, max_depth=4, out=None):
    if out is None:
        out = []
    if depth > max_depth:
        return out
    url = base_url.rstrip('/') + '/' + api_url_suffix
    data = fetch_json(opener, url)
    jobs = data.get('jobs') or []
    for job in jobs:
        name = job.get('name')
        job_url = job.get('url')
        if not name or not job_url:
            continue
        full_path = f"{path_prefix}/{name}" if path_prefix else name
        out.append(full_path)
        # If this job is a folder (usually _class contains 'Folder'), recurse
        _class = job.get('_class') or ''
        if 'Folder' in _class or job_url.endswith('/'):
            try:
                list_jobs(opener, job_url, full_path, 'api/json', depth+1, max_depth, out)
            except Exception:
                # ignore folder traversal errors
                pass
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--max-depth', type=int, default=4)
    args = parser.parse_args()

    base = os.getenv('JENK_URL', 'http://localhost:8181').rstrip('/') + '/'
    user = os.getenv('JENK_USER')
    token = os.getenv('JENK_TOKEN')
    if not user or not token:
        print('[ERR] JENK_USER and JENK_TOKEN must be set in env', file=sys.stderr)
        sys.exit(1)

    mgr = HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, base, user, token)
    opener = build_opener(HTTPBasicAuthHandler(mgr))

    try:
        paths = list_jobs(opener, base, max_depth=args.max_depth)
    except Exception as e:
        print(f'[ERR] Failed to list jobs: {e}', file=sys.stderr)
        sys.exit(2)

    if not paths:
        print('[WARN] No jobs found or insufficient permissions')
        sys.exit(3)

    print('Discovered Jenkins job paths:')
    for p in sorted(paths):
        print(f'- {p}')

    # If env JENK_JOB provided, suggest exact JENK_JOB_PATH
    target = os.getenv('JENK_JOB')
    if target:
        candidates = [p for p in paths if p.split('/')[-1] == target]
        if candidates:
            print('\nSuggested JENK_JOB_PATH (matches JENK_JOB):')
            for c in candidates:
                print(f'- {c}')
        else:
            print(f"\nNo path ending with job name '{target}' found. Pick one from the list above.")

if __name__ == '__main__':
    main()

