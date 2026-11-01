"""Offline gate regression tests; run reports here are explicitly synthetic fixtures."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("authoring", Path(__file__).with_name("authoring.py"))
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class AuthoringTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.directory = self.base / "first"
        self.directory.mkdir()
        self.code = "print(5)\n"
        self.theory = """# Synthetic fixture, not course content

Input:

```text
0
```

Output:

```text
5
```

| input | output |
| --- | --- |
| 0 | 5 |

```python
print(5)
```
"""
        self.lesson = {
            "schema_version": 1, "slug": "first", "title": "Synthetic test fixture",
            "summary": "Only tests authoring validation", "audience": "Unit test",
            "languages": ["PYTHON312"], "prerequisites": [], "outcomes": ["Read a fixture"],
            "problem": {"statement": "Fixture", "input": "Zero", "output": "Five", "constraints": "Fixture only"},
            "complexity": {"time": "O(1)", "extra_space": "O(1)", "justification": "Fixture"},
            "examples": [{"id": "main", "input": "0\n", "output": "5\n", "purpose": "Synthetic"}],
            "main_example_id": "main", "trace": {"example_id": "main", "columns": ["input", "output"], "rows": [["0", "5"]]},
            "sources": [], "variants": {"PYTHON312": {"theory_file": "theory.md", "code_file": "main.py"}},
            "review_file": "review.md"}
        self.journal = {
            "schema_version": 1, "lesson_id": "first", "sequence": 1, "level": 1, "stage": "draft",
            "previous_journal": None, "theory_files": ["lesson.json", "theory.md", "main.py"],
            "tasks_file": "tasks.json", "task_ids": ["task-" + str(i) for i in range(4)],
            "practice_files": [], "theory_reviews": [], "practice_reviews": []}
        self.tasks = [{"id": task_id, "title": "Fixture", "lesson_id": "first", "concepts": ["fixture"],
                       "difficulty": 1, "type": "NUMERIC", "stage": "warmup", "target_error": "Synthetic",
                       "student": {"prompt": "Fixture only", "answer_format": "Integer"},
                       "teacher": {"explanation": "Synthetic fixture, not a real course", "answer": "5", "tolerance": "0"}}
                      for task_id in self.journal["task_ids"]]
        self.write("theory.md", self.theory)
        self.write("main.py", self.code)
        self.write("review.md", "Synthetic fixture only; not a real review.\n")
        self.save()
        # These records exercise the validator. No program execution is claimed.
        self.write_json("verification.json", {
            "schema_version": 1,
            "runs": [{"language": "PYTHON312", "code_sha256": tool.digest_bytes(self.code.encode()),
                      "runner": "SYNTHETIC FIXTURE — NOT EXECUTED",
                      "cases": [{"id": "main", "input_sha256": tool.digest_bytes(b"0\n"),
                                 "exit_code": 0, "actual_output": "5\n"}]}]})

    def write(self, name, content):
        (self.directory / name).write_text(content, encoding="utf-8")

    def write_json(self, name, content):
        self.write(name, json.dumps(content, ensure_ascii=False))

    def save(self):
        self.write_json("lesson.json", self.lesson)
        self.write_json("authoring.json", self.journal)
        self.write_json("tasks.json", {"schema_version": 1, "tasks": self.tasks})

    def approve(self, phase):
        fingerprint = tool.snapshot(self.directory, self.journal, phase, self.directory)["artifact_sha256"]
        self.journal[phase + "_reviews"] = [
            {"round": number, "reviewer": f"synthetic-reviewer-{number}", "status": "approved",
             "reviewed_at": f"2026-10-24T{'13' if phase == 'practice' else '12'}:0{number}:00+03:00", "artifact_sha256": fingerprint,
             "checks": ["Synthetic structural test record, not an actual review"], "findings": []}
            for number in (1, 2)]
        self.save()

    def ready(self):
        self.approve("theory")
        self.approve("practice")
        self.journal["stage"] = "ready"
        self.save()

    def make_code_task(self, executed=True):
        task = self.tasks[0]
        task.update(type="CODE")
        task["student"] = {
            "prompt": "Synthetic fixture", "input": "Zero", "output": "Five", "constraints": "Fixture",
            "examples": [{"input": "0\n", "output": "5\n", "explanation": "Synthetic fixture"}],
            "hints": ["Synthetic hint one", "Synthetic hint two", "Synthetic hint three"]}
        task["teacher"] = {
            "explanation": "Synthetic fixture", "time": "O(1)", "extra_space": "O(1)",
            "oracle_method": "Synthetic independent fixture", "references": {"PYTHON312": "main.py"},
            "oracle_file": "oracle.py", "generator_file": "generator.py", "test_plan_file": "plan.md",
            "verification_file": "code-verification.json", "comparison": "tokens"}
        paths = ["main.py", "oracle.py", "generator.py", "plan.md", "code.log"]
        for name in paths[1:]:
            self.write(name, "SYNTHETIC FIXTURE, NOT EXECUTED\n")
        report = {"schema_version": 1, "status": "not_run", "reason": "Synthetic fixture, no execution"}
        if executed:
            report = {
                "schema_version": 1, "status": "executed", "runner": "SYNTHETIC FIXTURE, NOT EXECUTED",
                "command": "Synthetic record only", "log_file": "code.log", "seed": 42,
                "artifacts": {name: tool.file_digest(self.directory / name) for name in paths},
                "reference_languages": ["PYTHON312"],
                "checks": dict.fromkeys(("examples", "boundaries", "random", "maximum", "oracle"), True),
                "mutants": [{"name": "synthetic", "error": "Synthetic bug", "case": "0", "observed": "6", "rejected": True}]}
        self.write_json("code-verification.json", report)
        self.save()

    def check(self, **kwargs):
        return tool.check(self.directory, **kwargs)

    def rejected(self, message, **kwargs):
        with self.assertRaises(tool.AuthoringError) as caught:
            self.check(**kwargs)
        self.assertIn(message, str(caught.exception))

    def test_current_catalog_matches_project_and_has_no_obsolete_python(self):
        result = tool.check_catalog()
        self.assertIn("PYTHON312", result["languages"])
        self.assertIn("PYPY312", result["languages"])
        self.assertEqual(len(result["platform_runners"]), 4)
        self.assertNotIn("PYTHON311", result["languages"])

    def test_draft_does_not_invent_reviews_or_execution(self):
        (self.directory / "verification.json").unlink()
        result = self.check()
        self.assertEqual(result["stage"], "draft")
        self.assertEqual(result["recorded_executed_languages"], [])
        self.assertEqual(result["unverified_languages"], ["PYTHON312"])
        self.assertTrue(result["review_blockers"])

    def test_draft_reports_inline_quiz_without_pretending_it_is_reviewed(self):
        self.write("theory.md", self.theory + "\n### Проверьте себя\n\n1. Что напечатает программа?\n\n#### Ответы\n\nПять.\n")
        before = (self.directory / "theory.md").read_bytes()
        result = self.check()
        self.assertEqual(len(result["presentation_blockers"]), 2)
        self.assertIn("Проверьте себя", result["presentation_blockers"][0])
        self.assertEqual((self.directory / "theory.md").read_bytes(), before)

    def test_exact_inline_practice_headings_block_reviewed_theory(self):
        for heading in ("Проверьте себя", "Самопроверка", "Попробуйте самостоятельно",
                        "Ответы", "Разбор самопроверки", "ОТВЕТЫ:"):
            with self.subTest(heading=heading):
                self.write("theory.md", self.theory + f"\n### {heading} ###\n\n1. Упражнение.\n")
                self.approve("theory")
                self.rejected("inline practice heading", stage="theory_reviewed")

    def test_inline_quiz_blocks_ready_even_with_fresh_review_records(self):
        self.write("theory.md", self.theory + "\n## Самопроверка\n\n1. Упражнение.\n")
        self.ready()
        self.rejected("inline practice heading")

    def test_mentions_longer_headings_inline_code_and_escapes_are_not_quizzes(self):
        self.write("theory.md", self.theory + """
Слово «Самопроверка» здесь упоминается в обычном тексте.

## Ответы на запросы

`## Проверьте себя`

## `Ответы`

\\## Ответы

// ## Самопроверка

    ## Самопроверка
""")
        self.approve("theory")
        self.assertEqual(self.check(stage="theory_reviewed")["presentation_blockers"], [])

    def test_backtick_and_tilde_fences_hide_headings_until_matching_close(self):
        markdown = """```text
## Ответы
```
   ~~~~markdown
### Проверьте себя
~~~
## Самопроверка
   ~~~~~
````text
```
## Попробуйте самостоятельно
````
## Обычная теория
"""
        self.assertEqual(list(tool.markdown_headings(markdown)), [(13, "Обычная теория")])

    def test_setext_inline_practice_titles_are_checked(self):
        self.write("theory.md", self.theory + "\nСамопроверка\n============\n\nОтветы\n------\n")
        self.approve("theory")
        self.rejected("inline practice heading", stage="theory_reviewed")

    def test_author_review_self_checks_are_not_student_theory(self):
        self.write("review.md", "## Самопроверка\n\nАвторская проверка примеров.\n\n## Ответы\n\nЗакрытые заметки.\n")
        self.ready()
        self.assertEqual(self.check()["presentation_blockers"], [])

    def test_presentation_checks_every_language_variant_not_just_default(self):
        self.lesson["variants"] = {}
        for language in tool.catalog():
            filename = f"{language}.md"
            self.lesson["variants"][language] = {"theory_file": filename, "code_file": "main.py"}
            self.write(filename, self.theory + "\n## Проверьте себя\n\n1. Упражнение.\n")
        self.save()
        blockers = tool.presentation_errors(self.directory, self.directory)
        self.assertEqual(len(blockers), len(tool.catalog()))
        for language in tool.catalog():
            self.assertTrue(any(f"{language} {language}.md:" in error for error in blockers), language)

    def test_empty_reviews_cannot_pass_reviewed_gate(self):
        self.rejected("exactly two", stage="theory_reviewed")

    def test_theory_reviewed_does_not_require_tasks_or_run_evidence(self):
        self.journal["tasks_file"] = None
        self.journal["task_ids"] = []
        (self.directory / "verification.json").unlink()
        self.save()
        self.approve("theory")
        result = self.check(stage="theory_reviewed")
        self.assertEqual(result["unverified_languages"], ["PYTHON312"])

    def test_four_and_five_tasks_pass(self):
        for count in (4, 5):
            with self.subTest(count=count):
                if count == 5:
                    task = deepcopy(self.tasks[-1])
                    task["id"] = "task-4"
                    self.tasks.append(task)
                    self.journal["task_ids"].append(task["id"])
                    self.save()
                self.ready()
                self.assertEqual(self.check()["stage"], "ready")

    def test_three_or_six_tasks_fail(self):
        self.approve("theory")
        for count in (3, 6):
            with self.subTest(count=count):
                self.journal["task_ids"] = ["task-" + str(i) for i in range(count)]
                self.save()
                self.rejected("4 or 5", stage="ready")

    def test_theory_changes_invalidate_both_reviews(self):
        self.approve("theory")
        self.write("theory.md", self.theory + "\nA newly edited paragraph.\n")
        self.rejected("stale", stage="theory_reviewed")

    def test_task_change_invalidates_practice(self):
        self.ready()
        self.tasks[0]["student"]["prompt"] = "Edited fixture prompt"
        self.save()
        self.rejected("stale")

    def test_run_record_change_invalidates_practice(self):
        self.ready()
        report = json.loads((self.directory / "verification.json").read_text(encoding="utf-8"))
        report["runs"][0]["runner"] = "UPDATED SYNTHETIC FIXTURE — NOT EXECUTED"
        self.write_json("verification.json", report)
        self.rejected("stale")

    def test_next_lessons_tasks_do_not_invalidate_current_practice(self):
        self.ready()
        other = deepcopy(self.tasks[0])
        other.update(id="next-task", lesson_id="next")
        self.tasks.append(other)
        self.save()
        self.assertEqual(self.check()["stage"], "ready")

    def test_fingerprints_do_not_depend_on_a_wider_course_boundary(self):
        self.ready()
        self.assertEqual(
            tool.snapshot(self.directory, self.journal, "theory", self.directory),
            tool.snapshot(self.directory, self.journal, "theory", self.base))
        self.assertEqual(self.check(course_root=self.base)["stage"], "ready")

    def test_code_task_evidence_and_hint_count_are_checked(self):
        self.make_code_task()
        self.ready()
        self.assertEqual(self.check()["unverified_code_tasks"], [])
        self.tasks[0]["student"]["hints"].pop()
        self.save()
        self.approve("practice")
        self.rejected("3–5")

    def test_unavailable_code_runtime_does_not_become_executed(self):
        self.make_code_task(executed=False)
        self.ready()
        self.rejected("не запускались")

    def test_oracle_change_invalidates_practice_without_manual_file_list(self):
        self.make_code_task()
        self.ready()
        self.write("oracle.py", "An edited synthetic oracle\n")
        self.rejected("stale")

    def test_cannot_omit_owned_task(self):
        self.ready()
        task = deepcopy(self.tasks[-1])
        task["id"] = "hidden-fifth-task"
        self.tasks.append(task)
        self.save()
        self.rejected("exactly the tasks")

    def test_rounds_need_distinct_reviewers(self):
        self.approve("theory")
        self.journal["theory_reviews"][1]["reviewer"] = self.journal["theory_reviews"][0]["reviewer"]
        self.save()
        self.rejected("distinct reviewer", stage="theory_reviewed")

    def test_round_numbers_cannot_repeat(self):
        self.approve("theory")
        self.journal["theory_reviews"][1]["round"] = 1
        self.save()
        self.rejected("distinct rounds", stage="theory_reviewed")

    def test_open_findings_block_gate(self):
        self.approve("theory")
        self.journal["theory_reviews"][0]["findings"] = [
            {"issue": "Synthetic blocker", "resolution": "Not fixed", "status": "open"}]
        self.save()
        self.rejected("unresolved finding", stage="theory_reviewed")

    def test_practice_reviews_cannot_precede_theory_reviews(self):
        self.ready()
        for review in self.journal["practice_reviews"]:
            review["reviewed_at"] = review["reviewed_at"].replace("T13:", "T11:")
        self.save()
        self.rejected("cannot predate")

    def test_missing_theory_artifact_cannot_be_hidden_from_hash(self):
        self.journal["theory_files"].remove("main.py")
        self.save()
        self.rejected("missing lesson metadata")

    def test_path_traversal_and_symlink_outside_course_are_rejected(self):
        self.write("secret.txt", "Synthetic")
        self.journal["theory_files"].append("../outside.txt")
        self.save()
        self.rejected("escapes")
        outside = self.base / "outside.txt"
        outside.write_text("Synthetic", encoding="utf-8")
        (self.directory / "link.txt").symlink_to(outside)
        self.journal["theory_files"][-1] = "link.txt"
        self.save()
        self.rejected("escapes")

    def test_second_lesson_requires_immediate_ready_predecessor(self):
        self.journal["sequence"] = 2
        self.save()
        self.rejected("previous_journal")
        previous_dir = self.base / "previous"
        previous_dir.mkdir()
        previous = deepcopy(self.journal)
        previous.update(sequence=1, stage="draft", previous_journal=None)
        (previous_dir / "authoring.json").write_text(json.dumps(previous), encoding="utf-8")
        self.journal["previous_journal"] = {"directory": "../previous", "journal": "authoring.json"}
        self.save()
        self.rejected("not declared ready", course_root=self.base)

    def test_ready_predecessor_is_rechecked_not_just_trusted(self):
        self.ready()
        previous_dir = self.directory
        self.directory = self.base / "second"
        shutil.copytree(previous_dir, self.directory)
        self.lesson["slug"] = "second"
        self.journal.update(lesson_id="second", sequence=2,
                            previous_journal={"directory": "../first", "journal": "authoring.json"})
        for task in self.tasks:
            task["lesson_id"] = "second"
        self.save()
        self.ready()
        self.assertEqual(self.check(course_root=self.base)["sequence"], 2)
        (previous_dir / "theory.md").write_text(self.theory + "\nA later change\n", encoding="utf-8")
        self.rejected("stale", course_root=self.base)

    def test_ready_requires_recorded_run_evidence(self):
        self.ready()
        (self.directory / "verification.json").unlink()
        self.rejected("нет отчёта")

    def test_difficulty_is_one_to_three_within_any_level(self):
        self.journal["level"] = 3
        self.save()
        self.ready()
        self.assertEqual(self.check()["difficulty_scope"], "within_level")
        for invalid in (0, 4, True, "1"):
            with self.subTest(invalid=invalid):
                self.tasks[0]["difficulty"] = invalid
                self.save()
                self.rejected("1–3 stars")

    def test_skill_adapter_reuses_validator_without_modifying_global_catalog(self):
        upstream_catalog = tool.DEFAULT_SKILL_ROOT / "assets/languages.json"
        before = upstream_catalog.read_bytes()
        with tool.skill_modules(tool.DEFAULT_SKILL_ROOT) as (lesson, _):
            registry = lesson.languages_registry()
            self.assertIn("PYTHON312", registry)
            self.assertNotIn("PYTHON311", registry)
            lesson.check_lesson(self.directory)
        self.assertEqual(upstream_catalog.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
