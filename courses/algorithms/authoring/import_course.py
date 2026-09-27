#!/usr/bin/env python3
"""Atomic, insert-only import into the local QLC PostgreSQL container."""
import argparse
import json
from pathlib import Path
import subprocess
from audit import audit
from theory_languages import LANGUAGES, adapt

ROOT=Path(__file__).resolve().parents[1]

def quote(value):
    if value is None:return 'NULL'
    if isinstance(value,bool):return 'TRUE' if value else 'FALSE'
    if isinstance(value,(int,float)):return str(value)
    # Standard conforming strings plus SQL escaping, never shell interpolation.
    return "'"+str(value).replace("'","''")+"'"

def theory_filename(module, lesson):
    number = module['position'] + 1
    suffix = '-proofs' if lesson['name'] == 'Доказательства' else '-asymptotics' if number == 1 and lesson['position'] == 1 else ''
    return f'{number:02}{suffix}.md'


def validate_theory_files(bundle):
    course = bundle['course']
    assert course['multilingual'] and set(course['availableLanguages']) == set(LANGUAGES)
    for module in bundle['modules']:
        for lesson in module['lessons']:
            filename = theory_filename(module, lesson)
            for language in course['availableLanguages']:
                assert (ROOT/'theory'/language/filename).read_text() == adapt(filename, lesson['contentMd'], language), (filename, language)


def commands(bundle):
    c=bundle['course'];name=quote(c['name'])
    yield 'BEGIN;\nSET LOCAL standard_conforming_strings = on;\n'
    yield "SELECT pg_advisory_xact_lock(hashtext('qlc-algorithms-v1'));\n"
    yield f"DO $guard$ BEGIN IF EXISTS (SELECT 1 FROM courses WHERE name={name}) THEN RAISE EXCEPTION 'Course already exists; refusing to replace or duplicate it'; END IF; IF to_regclass('lesson_theory_variants') IS NULL THEN RAISE EXCEPTION 'Apply Flyway migrations through V10 first'; END IF; END $guard$;\n"
    yield 'INSERT INTO courses(name,description,price,price_in_stars,published,multilingual) VALUES ('+','.join(quote(c[k]) for k in ('name','description','price','priceInStars','published','multilingual'))+') RETURNING id AS qlc_course_id \\gset\n'
    for language in c['availableLanguages']:
        yield f'INSERT INTO course_languages(course_id,language) VALUES (:qlc_course_id,{quote(language)});\n'
    for module in bundle['modules']:
        yield 'INSERT INTO modules(course_id,name,description,position) VALUES (:qlc_course_id,'+','.join(quote(module[k]) for k in ('name','description','position'))+') RETURNING id AS qlc_module_id \\gset\n'
        for lesson in module['lessons']:
            yield 'INSERT INTO lessons(module_id,name,description,position,published,content_md) VALUES (:qlc_module_id,'+','.join(quote(lesson[k]) for k in ('name','description','position','published','contentMd'))+') RETURNING id AS qlc_lesson_id \\gset\n'
            filename = theory_filename(module, lesson)
            for language in c['availableLanguages']:
                content = (ROOT/'theory'/language/filename).read_text()
                yield f'INSERT INTO lesson_theory_variants(lesson_id,language,content_md) VALUES (:qlc_lesson_id,{quote(language)},{quote(content)});\n'
            for task in lesson['tasks']:
                values=[task['taskType'],task['statementMd'],task.get('language'),task.get('starterCode'),
                    json.dumps(task['testCases'],ensure_ascii=False,separators=(',',':')) if 'testCases' in task else None,
                    task.get('correctNumericAnswer'),task.get('timeLimitMs',2000),task.get('memoryLimitKb',65536),task.get('outputLimitKb',4096),task.get('testSetVersion',1)]
                yield 'INSERT INTO tasks(lesson_id,task_type,statement_md,language,starter_code,test_cases,correct_numeric_answer,time_limit_ms,memory_limit_kb,output_limit_kb,test_set_version) VALUES (:qlc_lesson_id,'+','.join(map(quote,values))+') RETURNING id AS qlc_task_id \\gset\n'
                for i,hint in enumerate(task['hints']):yield f'INSERT INTO task_hints(task_id,hint_position,content_md) VALUES (:qlc_task_id,{i},{quote(hint)});\n'
                for i,option in enumerate(task.get('options',[])):yield f'INSERT INTO task_test_options(task_id,option_position,option_text) VALUES (:qlc_task_id,{i},{quote(option)});\n'
                for i in task.get('correctOptionIndexes',[]):yield f'INSERT INTO task_test_correct_indexes(task_id,correct_index) VALUES (:qlc_task_id,{i});\n'
    yield "SELECT json_build_object('courseId',:qlc_course_id,'modules',(SELECT count(*) FROM modules WHERE course_id=:qlc_course_id),'lessons',(SELECT count(*) FROM lessons l JOIN modules m ON l.module_id=m.id WHERE m.course_id=:qlc_course_id),'tasks',(SELECT count(*) FROM tasks t JOIN lessons l ON t.lesson_id=l.id JOIN modules m ON l.module_id=m.id WHERE m.course_id=:qlc_course_id));\nCOMMIT;\n"

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    bundle=json.loads((ROOT/'bundle.json').read_text())
    audit(bundle)
    validate_theory_files(bundle)
    if not args.apply:
        print('Validated import manifest:',len(bundle['modules']),'modules. Use --apply for the local insert-only transaction.')
        raise SystemExit(0)
    report=json.loads((ROOT/'reports'/'validation.json').read_text())
    if report['tasks']!=48 or report['failures']:raise SystemExit('Full sandbox validation is required before import')
    command=['docker','exec','-i','qlc_postgres','sh','-c','exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qAt']
    # Output is tiny; stream SQL so the client does not hold another full manifest copy.
    with subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) as process:
        try:
            for sql in commands(bundle):process.stdin.write(sql)
            process.stdin.close();process.stdin=None
            out,err=process.communicate(timeout=180)
        except BrokenPipeError:
            out,err=process.communicate();raise SystemExit('Import aborted: '+err[:1500])
        if process.returncode:raise SystemExit('Import rolled back: '+err[:1500])
    summary=next(json.loads(line) for line in out.splitlines() if line.startswith('{'))
    expected=(len(bundle['modules']),sum(len(m['lessons']) for m in bundle['modules']),sum(len(l['tasks']) for m in bundle['modules'] for l in m['lessons']))
    assert (summary['modules'],summary['lessons'],summary['tasks'])==expected,summary
    (ROOT/'reports'/'import.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps(summary,ensure_ascii=False))
