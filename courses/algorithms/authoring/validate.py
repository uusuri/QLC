#!/usr/bin/env python3
"""Run real QLC sandbox, keeping private tests on stdin exactly as DockerCppRunner does."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import time

from tasks import TASKS
from cases import cases_for, small

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'

def prepare():
    for task in TASKS:
        target=ROOT/'tasks'/task['key'];target.mkdir(parents=True,exist_ok=True)
        (target/'solution.cpp').write_text(task['solution'])
        old,new=task['mutation'];assert old in task['solution'],task['key']
        (target/'wrong.cpp').write_text(task['solution'].replace(old,new,1))
        if task['slow']:(target/'slow.cpp').write_text(task['slow'])
        cases=cases_for(task['key'])
        (target/'tests.json').write_text(json.dumps(cases,ensure_ascii=False,separators=(',',':')))
        print(f"prepared {task['key']}: {len(cases)} cases",flush=True)

def run(task,variant,cases):
    path=ROOT/'tasks'/task['key']/f'{variant}.cpp'
    limit=task['time'];memory=task['memory']
    command=['docker','run','--rm','--interactive','--network','none','--read-only',
        '--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64',
        '--memory',str((memory+262144)*1024),'--memory-swap',str((memory+262144)*1024),
        '--cpus','1.0','--user','65534:65534',
        '--tmpfs','/work:rw,exec,nosuid,size=64m,mode=1777',
        '--tmpfs','/tmp:rw,nosuid,size=32m,mode=1777',
        '--mount',f'type=bind,src={path},dst=/request/Main.cpp,readonly',
        '--env',f'QLC_TIME_LIMIT_MS={limit}','--env',f'QLC_MEMORY_LIMIT_KB={memory}',
        '--env','QLC_OUTPUT_LIMIT_KB=4096','qlc-cpp-runner:dev']
    started=time.monotonic()
    process=subprocess.run(command,input=json.dumps(cases),text=True,capture_output=True,timeout=300)
    if process.returncode:raise RuntimeError(f'{task["key"]}/{variant}: {process.stderr[:1200]}')
    result=json.loads(process.stdout)
    result.update(task=task['key'],variant=variant,wallSeconds=round(time.monotonic()-started,2),
        sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        testsSha256=hashlib.sha256((ROOT/'tasks'/task['key']/'tests.json').read_bytes()).hexdigest())
    return result

def check_one(task):
    cases=json.loads((ROOT/'tasks'/task['key']/'tests.json').read_text())
    results=[]
    for variant in ('solution','wrong','slow'):
        if variant=='slow' and not task['slow']:continue
        # Check deliberately slow algorithms on small cases too; reject an invalid baseline.
        if variant=='slow':
            baseline=run(task,variant,[small(task['key'],20260926+i) for i in range(3)])
            baseline['variant']='slow-small'
            results.append(baseline)
        chosen=cases if variant!='slow' else [c for c in cases if c['kind']=='max-size-adversarial']
        result=run(task,variant,chosen)
        results.append(result)
        print(f"{task['key']}/{variant}: {result['verdict']} ({result['executionTimeMs']} ms, {result.get('memoryUsedKb')} KB)",flush=True)
    (REPORT/f'{task["key"]}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    return results

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');parser.add_argument('--only',nargs='*');args=parser.parse_args()
    REPORT.mkdir(exist_ok=True)
    if args.prepare:prepare()
    else:
        selected=[t for t in TASKS if not args.only or t['key'] in args.only]
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for result in pool.map(check_one,selected):pass
        reports=[json.loads((REPORT/f'{t["key"]}.json').read_text()) for t in TASKS if (REPORT/f'{t["key"]}.json').exists()]
        rows=[row for report in reports for row in report]
        failures=[x for x in rows if (x['variant'] in ('solution','slow-small') and x['verdict']!='AC') or (x['variant'] in ('wrong','slow') and x['verdict'] in ('AC','CE'))]
        summary=dict(tasks=len(reports),runs=len(rows),failures=failures,results=rows)
        (REPORT/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
        print(f'CHECKED {len(reports)} tasks, {len(failures)} failures',flush=True)
        raise SystemExit(bool(failures))
