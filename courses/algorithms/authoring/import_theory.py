"""Update only authored language variants, preserving lessons/tasks and student data."""
import argparse, json, subprocess
from pathlib import Path
from import_course import quote
from theory_languages import ROOT, LANGUAGES


def statements():
    # Exact structure and base-text checks prevent silently applying variants to a changed lesson.
    files=sorted((ROOT/'lessons').glob('*.md'))
    assert len(files)==49
    yield "BEGIN; SET LOCAL standard_conforming_strings=on; SELECT pg_advisory_xact_lock(hashtext('qlc-algorithms-v1'));\n"
    yield "CREATE TEMP TABLE qlc_theory_target(course_id bigint NOT NULL);\n"
    yield """DO $guard$ DECLARE cid bigint; BEGIN
      SELECT id INTO STRICT cid FROM courses WHERE name='Алгоритмы и структуры данных' AND multilingual;
      IF (SELECT count(*) FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=cid)<>49
      THEN RAISE EXCEPTION 'Expected 49 lessons'; END IF;
      INSERT INTO qlc_theory_target VALUES(cid);
    END $guard$;\n"""
    for file in files:
        module=int(file.name[:2])-1
        position=2 if file.name=='01-proofs.md' else 1 if '-proofs' in file.name or '-asymptotics' in file.name else 0
        base=file.read_text()
        selector=f"SELECT l.id FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=(SELECT course_id FROM qlc_theory_target) AND m.position={module} AND l.position={position} AND l.content_md={quote(base)}"
        yield f"DO $guard$ DECLARE lid bigint; BEGIN SELECT id INTO STRICT lid FROM ({selector}) checked; END $guard$;\n"
        for lang in LANGUAGES:
            content=(ROOT/'theory'/lang/file.name).read_text()
            assert content.strip() and len(content)<500_000
            yield f"INSERT INTO lesson_theory_variants(lesson_id,language,content_md) SELECT id,{quote(lang)},{quote(content)} FROM ({selector}) checked ON CONFLICT(lesson_id,language) DO UPDATE SET content_md=excluded.content_md;\n"
    yield """SELECT json_build_object('courseId',(SELECT course_id FROM qlc_theory_target),'variants',count(*),'lessons',count(DISTINCT v.lesson_id),'languages',count(DISTINCT v.language)) FROM lesson_theory_variants v JOIN lessons l ON l.id=v.lesson_id JOIN modules m ON m.id=l.module_id WHERE m.course_id=(SELECT course_id FROM qlc_theory_target);
    COMMIT;\n"""


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    sql=''.join(statements())
    if not args.apply:
        print('Validated 490 authored variants. --apply updates only lesson_theory_variants after migration V10.');return
    command=['docker','exec','-i','qlc_postgres','sh','-c','exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atq']
    result=subprocess.run(command,input=sql,text=True,capture_output=True,timeout=60)
    if result.returncode:
        # PostgreSQL context could echo a whole lesson; keep the diagnostic concise.
        raise SystemExit('Import rolled back: '+result.stderr.split('CONTEXT:')[0][:800])
    report=next(json.loads(line) for line in result.stdout.splitlines() if line.startswith('{'))
    assert report['variants']==490 and report['lessons']==49 and report['languages']==10
    (ROOT/'reports/theory-import.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report))

if __name__=='__main__':main()
