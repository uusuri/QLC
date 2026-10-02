#!/usr/bin/env python3
"""Validate retained references against generated cases in the real QLC sandbox."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import time

from cases import cases_for, small

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports'
TASKS = json.loads((ROOT / 'task-index.json').read_text())


def run(task, variant, cases):
    path = ROOT / 'tasks' / task['key'] / f'{variant}.cpp'
    limit = task['timeLimitMs']
    memory = task['memoryLimitKb']
    payload = json.dumps(cases, ensure_ascii=False, separators=(',', ':'))
    command = [
        'docker', 'run', '--rm', '--interactive', '--network', 'none', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '64',
        '--memory', str((memory + 262144) * 1024),
        '--memory-swap', str((memory + 262144) * 1024), '--cpus', '1.0',
        '--user', '65534:65534',
        '--tmpfs', '/work:rw,exec,nosuid,size=64m,mode=1777',
        '--tmpfs', '/tmp:rw,nosuid,size=32m,mode=1777',
        '--mount', f'type=bind,src={path},dst=/request/Main.cpp,readonly',
        '--env', f'QLC_TIME_LIMIT_MS={limit}', '--env', f'QLC_MEMORY_LIMIT_KB={memory}',
        '--env', f"QLC_OUTPUT_LIMIT_KB={task.get('outputLimitKb', 4096)}", 'qlc-cpp-runner:dev'
    ]
    started = time.monotonic()
    process = subprocess.run(command, input=payload, text=True, capture_output=True, timeout=300)
    if process.returncode:
        raise RuntimeError(f"{task['key']}/{variant}: {process.stderr[:1200]}")
    result = json.loads(process.stdout)
    result.update(
        task=task['key'], variant=variant,
        wallSeconds=round(time.monotonic() - started, 2),
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        testsSha256=hashlib.sha256(payload.encode()).hexdigest()
    )
    return result


def check_one(task):
    # Cases are disposable output of the generator, never a second stored course copy.
    cases = cases_for(task['key'])
    results = []
    folder = ROOT / 'tasks' / task['key']
    for variant in ('solution', 'wrong', 'slow'):
        if variant == 'slow' and not (folder / 'slow.cpp').exists():
            continue
        if variant == 'slow':
            baseline = run(task, variant, [small(task['key'], 20260926 + i) for i in range(3)])
            baseline['variant'] = 'slow-small'
            results.append(baseline)
        chosen = cases if variant != 'slow' else [case for case in cases if case['kind'] == 'max-size-adversarial']
        if not chosen:
            raise RuntimeError(f"No cases for {task['key']}/{variant}")
        result = run(task, variant, chosen)
        results.append(result)
        print(f"{task['key']}/{variant}: {result['verdict']} ({result['executionTimeMs']} ms, {result.get('memoryUsedKb')} KB)", flush=True)
    (REPORT / f"{task['key']}.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', nargs='+', choices=[task['key'] for task in TASKS])
    args = parser.parse_args()
    selected = [task for task in TASKS if not args.only or task['key'] in args.only]
    REPORT.mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        reports = list(pool.map(check_one, selected))
    # A partial run reports only its own results, never stale reports from earlier runs.
    rows = [row for report in reports for row in report]
    failures = [row for row in rows if
        (row['variant'] in ('solution', 'slow-small') and row['verdict'] != 'AC') or
        (row['variant'] in ('wrong', 'slow') and row['verdict'] in ('AC', 'CE'))]
    summary = dict(tasks=len(selected), runs=len(rows), failures=failures, results=rows)
    (REPORT / 'validation.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f'CHECKED {len(selected)} tasks, {len(failures)} failures', flush=True)
    return bool(failures)


if __name__ == '__main__':
    raise SystemExit(main())
