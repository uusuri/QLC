"""Reject stale validation reports or a bundle that differs from tested artifacts."""
from collections import Counter
from decimal import Decimal
import hashlib
import json
from pathlib import Path

from tasks import TASKS
from asymptotics import lesson_payload as asymptotics_lesson

ROOT = Path(__file__).resolve().parents[1]


def audit(bundle):
    report = json.loads((ROOT / 'reports/validation.json').read_text())
    assert report['tasks'] == 48 and not report['failures'], 'Full sandbox validation required'
    flat = [task for module in bundle['modules'] for lesson in module['lessons'] for task in lesson['tasks']]
    code = [task for task in flat if task['taskType'] == 'CODE']
    refs = {row['task']: row for row in report['results'] if row['variant'] == 'solution'}
    assert len(code) == len(TASKS) == len(refs) == 48
    extra = asymptotics_lesson()
    assert len(flat) == len({task['key'] for task in flat}) == 96 + len(extra['tasks'])
    for spec, task in zip(TASKS, code):
        assert task['key'] == spec['key']
        directory = ROOT / 'tasks' / spec['key']
        result = refs[spec['key']]
        assert result['verdict'] == 'AC' and result['passedTests'] == result['totalTests']
        assert (directory / 'solution.cpp').read_text() == spec['solution']
        for filename, field in [('solution.cpp', 'sourceSha256'), ('tests.json', 'testsSha256')]:
            assert hashlib.sha256((directory / filename).read_bytes()).hexdigest() == result[field], spec['key']
        cases = json.loads((directory / 'tests.json').read_text())
        assert [{'input': case['input'], 'output': case['output']} for case in cases] == task['testCases']
        assert 1 <= len(cases) <= 100
        assert (directory / 'statement.md').read_text() == task['statementMd']
        assert task['timeLimitMs'] == spec['time'] and task['memoryLimitKb'] == spec['memory']
        assert task['hints'] == spec['hints']
    for index, module in enumerate(bundle['modules'], 1):
        assert len(module['lessons']) == (3 if index == 1 else 2)
        for lesson, suffix in zip([module['lessons'][0], module['lessons'][-1]], ['', '-proofs']):
            assert lesson['contentMd'] == (ROOT / 'lessons' / f'{index:02}{suffix}.md').read_text()
        assert not module['lessons'][-1]['tasks']
        checks = json.loads((ROOT / 'lessons' / f'{index:02}-checks.json').read_text())
        assert module['lessons'][0]['tasks'][2:] == checks
    assert bundle['modules'][0]['lessons'][1] == extra
    assert extra['contentMd'] == (ROOT / 'lessons/01-asymptotics.md').read_text()
    assert extra['tasks'] == json.loads((ROOT / 'lessons/01-asymptotics-checks.json').read_text())
    for task in flat:
        assert len(task['hints']) == 3 and all(h.strip() and len(h) <= 8000 for h in task['hints'])
        if task['taskType'] == 'TEST':
            indices = task['correctOptionIndexes']
            assert indices and len(indices) == len(set(indices))
            assert all(0 <= i < len(task['options']) for i in indices)
        if task['taskType'] == 'NUMERIC':
            assert Decimal(str(task['correctNumericAnswer'])).is_finite()
    return dict(modules=len(bundle['modules']), lessons=sum(len(m['lessons']) for m in bundle['modules']),
                tasks=len(flat), types=dict(Counter(t['taskType'] for t in flat)),
                hints=sum(len(t['hints']) for t in flat), codeTestCases=sum(len(t['testCases']) for t in code),
                validatedSourceAndTestHashesMatch=True, manifestMatchesValidatedTasks=True)


if __name__ == '__main__':
    summary = audit(json.loads((ROOT / 'bundle.json').read_text()))
    (ROOT / 'reports/artifact-audit.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False))
