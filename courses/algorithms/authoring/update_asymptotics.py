#!/usr/bin/env python3
"""Add asymptotics practice to an existing course without replacing task IDs/progress."""
import argparse
import json
from pathlib import Path
import subprocess

from audit import audit
from import_course import quote

ROOT = Path(__file__).resolve().parents[1]


def statements(bundle):
    course = bundle['course']
    intro, practice, proof = bundle['modules'][0]['lessons']
    proof_names = ','.join(quote(name) for name in (proof['name'], 'Доказательства — необязательно'))
    yield "BEGIN; SET LOCAL standard_conforming_strings = on;\n"
    yield "SELECT pg_advisory_xact_lock(hashtext('qlc-algorithms-v1'));\n"
    yield f"""DO $guard$
DECLARE cid BIGINT; mid BIGINT;
BEGIN
  SELECT id INTO STRICT cid FROM courses WHERE name={quote(course['name'])};
  SELECT id INTO STRICT mid FROM modules WHERE course_id=cid AND position=0;
  IF (SELECT count(*) FROM lessons WHERE module_id=mid) <> 2
     OR NOT EXISTS (SELECT 1 FROM lessons WHERE module_id=mid AND name={quote(intro['name'])} AND position=0)
     OR NOT EXISTS (SELECT 1 FROM lessons WHERE module_id=mid AND name IN ({proof_names}) AND position=1)
  THEN RAISE EXCEPTION 'First module differs from expected version or update already applied'; END IF;
END $guard$;
SELECT id AS qlc_course_id FROM courses WHERE name={quote(course['name'])} FOR UPDATE \\gset
SELECT id AS qlc_module_id FROM modules WHERE course_id=:qlc_course_id AND position=0 FOR UPDATE \\gset
SELECT id AS qlc_intro_id FROM lessons WHERE module_id=:qlc_module_id AND position=0 FOR UPDATE \\gset
UPDATE lessons SET content_md={quote(intro['contentMd'])} WHERE id=:qlc_intro_id;
UPDATE lessons SET position=2 WHERE module_id=:qlc_module_id AND name IN ({proof_names});
UPDATE lessons l SET name={quote(proof['name'])} FROM modules m WHERE l.module_id=m.id AND m.course_id=:qlc_course_id AND l.name='Доказательства — необязательно';
UPDATE courses SET description={quote(course['description'])} WHERE id=:qlc_course_id;
INSERT INTO lessons(module_id,name,description,position,published,content_md)
VALUES (:qlc_module_id,{quote(practice['name'])},{quote(practice['description'])},1,TRUE,{quote(practice['contentMd'])}) RETURNING id AS qlc_practice_id \\gset
"""
    for task in practice['tasks']:
        assert task['taskType'] == 'TEST' and len(task['correctOptionIndexes']) == 1
        yield f"INSERT INTO tasks(lesson_id,task_type,statement_md) VALUES (:qlc_practice_id,'TEST',{quote(task['statementMd'])}) RETURNING id AS qlc_task_id \\gset\n"
        for index, option in enumerate(task['options']):
            yield f"INSERT INTO task_test_options(task_id,option_position,option_text) VALUES (:qlc_task_id,{index},{quote(option)});\n"
        yield f"INSERT INTO task_test_correct_indexes(task_id,correct_index) VALUES (:qlc_task_id,{task['correctOptionIndexes'][0]});\n"
        for index, hint in enumerate(task['hints']):
            yield f"INSERT INTO task_hints(task_id,hint_position,content_md) VALUES (:qlc_task_id,{index},{quote(hint)});\n"
    yield """SELECT json_build_object('courseId',:qlc_course_id,'introLessonId',:qlc_intro_id,'practiceLessonId',:qlc_practice_id,
      'newTestTasks',(SELECT count(*) FROM tasks WHERE lesson_id=:qlc_practice_id),
      'lessons',(SELECT count(*) FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=:qlc_course_id),
      'tasks',(SELECT count(*) FROM tasks t JOIN lessons l ON l.id=t.lesson_id JOIN modules m ON m.id=l.module_id WHERE m.course_id=:qlc_course_id));
COMMIT;
"""


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    bundle = json.loads((ROOT / 'bundle.json').read_text())
    summary = audit(bundle)
    if not args.apply:
        print('Validated update: expand introduction, add 12 TEST tasks in one lesson; retain all existing task IDs. Use --apply.')
        raise SystemExit(0)
    command = ['docker', 'exec', '-i', 'qlc_postgres', 'sh', '-c',
               'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atq']
    result = subprocess.run(command, input=''.join(statements(bundle)), text=True, capture_output=True, timeout=60)
    if result.returncode:
        raise SystemExit('Update rolled back: ' + result.stderr[:1500])
    record = next(json.loads(line) for line in result.stdout.splitlines() if line.startswith('{'))
    assert record['newTestTasks'] == 12 and record['lessons'] == summary['lessons'] and record['tasks'] == summary['tasks']
    (ROOT / 'reports/asymptotics-update.json').write_text(json.dumps(record, ensure_ascii=False, indent=2))
    print(json.dumps(record, ensure_ascii=False))
