#!/usr/bin/env python3
"""Read-only lesson gates and a current-language adapter for the authoring skill.

This tool never runs student code, changes the skill, publishes a course or writes
to a database. Hashes bind recorded reviews/evidence to files, not to real people
or actual execution: those remain an explicit human responsibility.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

TOOL_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = TOOL_ROOT.parent.parent
DEFAULT_SKILL_ROOT = Path.home() / ".codex" / "skills" / "qlc-algorithm-lesson"
STAGES = ("draft", "theory_reviewed", "ready")
INLINE_PRACTICE_HEADINGS = {
    "проверьте себя", "самопроверка", "попробуйте самостоятельно", "ответы",
    "разбор самопроверки",
}


class AuthoringError(Exception):
    """An actionable error without a traceback."""


def fail(message):
    raise AuthoringError(message)


def object_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            fail(f"JSON: duplicate key {key!r}")
        result[key] = value
    return result


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=object_pairs)
    except (OSError, UnicodeError, ValueError) as exc:
        fail(f"Cannot read {path.name}: {exc}")


def obj(value, where):
    if not isinstance(value, dict):
        fail(f"{where}: expected an object")
    return value


def text(value, where):
    if not isinstance(value, str) or not value.strip():
        fail(f"{where}: expected a nonempty string")
    return value


def strings(value, where):
    if not isinstance(value, list) or any(not isinstance(v, str) or not v.strip() for v in value):
        fail(f"{where}: expected a list of nonempty strings")
    if len(set(value)) != len(value):
        fail(f"{where}: duplicate entries")
    return value


def safe_path(base, name, boundary, where, directory=False):
    base, boundary = base.resolve(), boundary.resolve()
    name = text(name, where)
    if Path(name).is_absolute() or any(char in name for char in ("\\", ":", "\x00")):
        fail(f"{where}: use a relative path inside --course-root")
    try:
        result = (base / name).resolve()
        inside = result.is_relative_to(boundary)
    except (OSError, ValueError, RuntimeError) as exc:
        fail(f"{where}: invalid path: {exc}")
    if not inside:
        fail(f"{where}: path or symlink escapes --course-root")
    if not (result.is_dir() if directory else result.is_file()):
        fail(f"{where}: {'directory' if directory else 'file'} not found: {name}")
    return result


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def file_digest(path):
    try:
        return digest_bytes(path.read_bytes())
    except OSError as exc:
        fail(f"Cannot hash {path.name}: {exc}")


def catalog():
    return obj(read_json(TOOL_ROOT / "languages.json"), "languages.json")


def check_catalog():
    """Fail closed on catalog drift; never evaluate TypeScript or Java."""
    source = (PROJECT_ROOT / "frontend/components/courseLanguages.tsx").read_text(encoding="utf-8")
    matches = re.findall(r'\{\s*id:\s*"([A-Z0-9_]+)",\s*label:\s*"[^"]+",\s*monaco:\s*"([^"]+)",\s*file:\s*"([^"]+)"', source)
    frontend = {language: (fence, filename) for language, fence, filename in matches}
    registry = catalog()
    if not matches or len(matches) != len(frontend) or set(frontend) != set(registry):
        fail("languages.json: language IDs differ from frontend COURSE_LANGUAGES")
    for language, (fence, filename) in frontend.items():
        if (registry[language].get("fence"), registry[language].get("filename")) != (fence, filename):
            fail(f"languages.json: file/fence differs from frontend for {language}")
    backend = (PROJECT_ROOT / "backend/shared/src/main/java/com/qlc/shared/language/LanguageProfile.java").read_text(encoding="utf-8")
    match = re.search(r"public static boolean isRunnable\(String language\)\s*\{(.*?)\n  \}", backend, re.S)
    if not match:
        fail("Cannot inspect LanguageProfile.isRunnable; update check_catalog deliberately")
    runnable = set(re.findall(r'"([A-Z0-9_]+)"\.equalsIgnoreCase\(language\)', match.group(1)))
    if runnable != {key for key, value in registry.items() if value.get("platform_runner") is True}:
        fail("languages.json: platform_runner differs from LanguageProfile.isRunnable")
    return {"languages": list(registry), "platform_runners": sorted(runnable)}


@contextmanager
def skill_modules(skill_root):
    """Reuse upstream validators with one runtime override; don't copy or edit them."""
    check_catalog()
    scripts = skill_root.resolve() / "scripts"
    loaded = {}
    saved = {name: sys.modules.get(name) for name in ("lesson_tool", "course_tool")}
    try:
        for name in ("lesson_tool", "course_tool"):
            path = scripts / (name + ".py")
            if not path.is_file():
                fail(f"Missing {path}; install the authoring skill or pass --skill-root")
            spec = importlib.util.spec_from_file_location(name, path)
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            spec.loader.exec_module(module)
            if name == "lesson_tool":
                module.languages_registry = catalog
            loaded[name] = module
        yield loaded["lesson_tool"], loaded["course_tool"]
    finally:
        for name, previous in saved.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


def load_journal(directory, journal, boundary):
    path = safe_path(directory, journal, boundary, "journal")
    data = obj(read_json(path), "journal")
    if type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        fail("journal.schema_version: expected 1")
    text(data.get("lesson_id"), "journal.lesson_id")
    if data.get("stage") not in STAGES:
        fail(f"journal.stage: expected one of {STAGES}")
    if type(data.get("sequence")) is not int or data["sequence"] < 1:
        fail("journal.sequence: expected a positive lesson number")
    if type(data.get("level")) is not int or data["level"] not in (1, 2, 3):
        fail("journal.level: expected 1, 2 or 3")
    return path, data


def task_records(directory, data, boundary, required):
    task_ids = strings(data.get("task_ids", []), "journal.task_ids")
    if required and len(task_ids) not in (4, 5):
        fail("journal.task_ids: a completed lesson needs 4 or 5 tasks")
    tasks_file = data.get("tasks_file")
    if not task_ids and not tasks_file:
        return None, []
    path = safe_path(directory, tasks_file, boundary, "journal.tasks_file")
    document = obj(read_json(path), "tasks.json")
    if document.get("schema_version") != 1 or not isinstance(document.get("tasks"), list):
        fail("tasks.json: expected schema_version 1 and tasks array")
    indexed = {}
    for task in document["tasks"]:
        task = obj(task, "task")
        task_id = text(task.get("id"), "task.id")
        if task_id in indexed:
            fail(f"tasks.json: duplicate task {task_id!r}")
        indexed[task_id] = task
    owned = {key for key, value in indexed.items() if value.get("lesson_id") == data["lesson_id"]}
    if set(task_ids) != owned:
        fail("journal.task_ids: must contain exactly the tasks belonging to this lesson")
    if not set(task_ids).issubset(indexed):
        fail("journal.task_ids: unknown task IDs")
    tasks = [indexed[key] for key in task_ids]
    for task in tasks:
        if type(task.get("difficulty")) is not int or task["difficulty"] not in (1, 2, 3):
            fail(f"task.{task['id']}.difficulty: expected 1–3 stars within level {data['level']}")
    return path, tasks


def snapshot(directory, data, phase, boundary):
    directory, boundary = directory.resolve(), boundary.resolve()
    files = {"@scope": digest_bytes(canonical({field: data[field] for field in ("lesson_id", "sequence", "level")}))}

    def include(path):
        # Fingerprints must not change when a later lesson supplies a wider root.
        files[Path(os.path.relpath(path, directory)).as_posix()] = file_digest(path)

    if phase == "theory":
        paths = strings(data.get("theory_files"), "journal.theory_files")
        for name in paths:
            include(safe_path(directory, name, boundary, "journal.theory_files"))
        lesson_path = safe_path(directory, "lesson.json", boundary, "lesson.json")
        lesson_data = obj(read_json(lesson_path), "lesson.json")
        required_paths = {lesson_path}
        for variant in obj(lesson_data.get("variants"), "lesson.variants").values():
            variant = obj(variant, "lesson.variant")
            for field in ("theory_file", "code_file"):
                required_paths.add(safe_path(directory, variant.get(field), boundary, "lesson." + field))
        declared = {(directory / name).resolve() for name in files if not name.startswith("@")}
        if not required_paths.issubset(declared):
            missing = sorted(path.relative_to(boundary).as_posix() for path in required_paths - declared)
            fail("journal.theory_files: missing lesson metadata, theory or language code: " + ", ".join(missing))
    else:
        for name in strings(data.get("practice_files", []), "journal.practice_files"):
            include(safe_path(directory, name, boundary, "journal.practice_files"))
        tasks_path, tasks = task_records(directory, data, boundary, required=True)
        # Only this lesson's records are hashed: the next lesson may append tasks.
        files["@tasks/" + data["lesson_id"]] = digest_bytes(canonical(sorted(tasks, key=lambda task: task["id"])))
        for task in tasks:
            if task.get("type") != "CODE":
                continue
            teacher = obj(task.get("teacher"), f"task.{task['id']}.teacher")
            paths = list(obj(teacher.get("references"), "teacher.references").values())
            paths += [teacher.get(field) for field in ("oracle_file", "generator_file", "test_plan_file", "verification_file")]
            if teacher.get("comparison") == "semantic":
                paths.append(teacher.get("checker_file"))
            for name in paths:
                include(safe_path(tasks_path.parent, name, boundary, "teacher.artifacts"))
            report_path = safe_path(tasks_path.parent, teacher["verification_file"], boundary, "teacher.verification_file")
            report = obj(read_json(report_path), "teacher.verification")
            if report.get("log_file"):
                include(safe_path(tasks_path.parent, report["log_file"], boundary, "teacher.log_file"))
            for name in obj(report.get("artifacts", {}), "teacher.verification.artifacts"):
                include(safe_path(tasks_path.parent, name, boundary, "teacher.verification.artifacts"))
        verification = directory / "verification.json"
        if verification.exists() or verification.is_symlink():
            include(safe_path(directory, "verification.json", boundary, "verification.json"))
        # Practice review also becomes stale when the explained algorithm changes.
        files["@theory"] = snapshot(directory, data, "theory", boundary)["artifact_sha256"]
    return {"phase": phase, "artifact_sha256": digest_bytes(canonical(files)), "artifacts": files}


def review_errors(data, phase, fingerprint):
    reviews = data.get(phase + "_reviews", [])
    if not isinstance(reviews, list):
        fail(f"journal.{phase}_reviews: expected a list")
    errors = []
    if len(reviews) != 2:
        errors.append(f"{phase}: exactly two independent review rounds are required")
    reviewers, rounds, dates = [], [], {}
    for index, review in enumerate(reviews):
        where = f"{phase}_reviews[{index}]"
        review = obj(review, where)
        reviewer = text(review.get("reviewer"), where + ".reviewer").strip()
        reviewers.append(reviewer)
        number = review.get("round")
        if type(number) is not int or number not in (1, 2):
            fail(where + ".round: expected 1 or 2")
        rounds.append(number)
        if review.get("status") != "approved":
            errors.append(where + ": not approved")
        if review.get("artifact_sha256") != fingerprint:
            errors.append(where + ": stale artifact_sha256; repeat review after changes")
        if not strings(review.get("checks"), where + ".checks"):
            fail(where + ".checks: record what was actually inspected")
        try:
            date = datetime.fromisoformat(text(review.get("reviewed_at"), where + ".reviewed_at").replace("Z", "+00:00"))
            if date.tzinfo is None:
                raise ValueError("timezone required")
            dates[number] = date
        except ValueError:
            fail(where + ".reviewed_at: expected ISO-8601 with a timezone")
        findings = review.get("findings")
        if not isinstance(findings, list):
            fail(where + ".findings: expected a list; use [] if no issues were found")
        for finding in findings:
            finding = obj(finding, where + ".finding")
            text(finding.get("issue"), where + ".finding.issue")
            text(finding.get("resolution"), where + ".finding.resolution")
            if finding.get("status") not in ("fixed", "open"):
                fail(where + ".finding.status: expected fixed or open")
            if finding["status"] == "open":
                errors.append(where + ": unresolved finding")
    if len(reviewers) != len(set(reviewers)):
        errors.append(f"{phase}: review rounds must use distinct reviewer IDs")
    if len(rounds) != len(set(rounds)) or (len(reviews) == 2 and set(rounds) != {1, 2}):
        errors.append(f"{phase}: expected distinct rounds 1 and 2")
    if set(dates) == {1, 2} and dates[2] < dates[1]:
        errors.append(f"{phase}: round 2 predates round 1")
    return errors


def markdown_headings(markdown):
    """Yield literal ATX/Setext titles outside CommonMark fenced/indented code.

    This is deliberately not a semantic prose audit. Backticks, escapes and
    longer titles remain literal, so mentioning a forbidden title is harmless.
    """
    fence = None
    previous = None
    for number, line in enumerate(markdown.splitlines(), 1):
        if fence is not None:
            character, length = fence
            if re.fullmatch(r" {0,3}" + re.escape(character) + "{" + str(length) + r",}[ \t]*", line):
                fence = None
            previous = None
            continue
        opening = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if opening and not (opening[1][0] == "`" and "`" in opening[2]):
            fence = (opening[1][0], len(opening[1]))
            previous = None
            continue
        if not line.strip() or line.startswith(("    ", "\t")):
            previous = None
            continue
        heading = re.match(r"^ {0,3}#{1,6}(?:[ \t]+(.*)|$)", line)
        if heading:
            title = re.sub(r"[ \t]+#+[ \t]*$", "", heading[1] or "").strip()
            yield number, title
            previous = None
            continue
        if previous and re.fullmatch(r" {0,3}(?:=+|-+)[ \t]*", line):
            yield previous
            previous = None
            continue
        previous = (number, line.strip())


def presentation_errors(directory, boundary):
    """Inspect student theory only, never author review notes or task prompts."""
    directory = directory.resolve()
    lesson = obj(read_json(safe_path(directory, "lesson.json", boundary, "lesson.json")), "lesson.json")
    errors = []
    for language, variant in obj(lesson.get("variants"), "lesson.variants").items():
        variant = obj(variant, "lesson.variant")
        path = safe_path(directory, variant.get("theory_file"), boundary, "lesson.theory_file")
        for number, title in markdown_headings(path.read_text(encoding="utf-8")):
            normalized = title.removesuffix(":").strip().casefold()
            if normalized in INLINE_PRACTICE_HEADINGS:
                name = Path(os.path.relpath(path, directory)).as_posix()
                errors.append(f"presentation: {language} {name}:{number}: inline practice heading {title!r}; "
                              "keep exercises and answers in Practice, not student theory")
    return errors


def check(directory, journal="authoring.json", stage=None, course_root=None,
          skill_root=DEFAULT_SKILL_ROOT, visited=None):
    directory = directory.resolve()
    boundary = (course_root or directory).resolve()
    if not directory.is_relative_to(boundary):
        fail("Lesson directory must be inside --course-root")
    path, data = load_journal(directory, journal, boundary)
    visited = set() if visited is None else set(visited)
    if path in visited:
        fail("previous_journal: cyclic lesson dependency")
    visited.add(path)
    target = stage or data["stage"]
    if target not in STAGES:
        fail(f"Unknown stage {target!r}")
    previous = data.get("previous_journal")
    if data["sequence"] == 1:
        if previous is not None:
            fail("First lesson must have previous_journal: null")
    else:
        previous = obj(previous, "previous_journal")
        previous_dir = safe_path(directory, previous.get("directory"), boundary, "previous_journal.directory", directory=True)
        previous_name = previous.get("journal", "authoring.json")
        _, previous_data = load_journal(previous_dir, previous_name, boundary)
        if previous_data["sequence"] != data["sequence"] - 1:
            fail("previous_journal: expected the immediately preceding lesson")
        if previous_data["stage"] != "ready":
            fail("previous_journal: previous lesson is not declared ready")
        check(previous_dir, previous_name, "ready", boundary, skill_root, visited)

    theory = snapshot(directory, data, "theory", boundary)
    blockers = review_errors(data, "theory", theory["artifact_sha256"])
    presentation_blockers = presentation_errors(directory, boundary)
    if target in ("theory_reviewed", "ready") and (blockers or presentation_blockers):
        fail("; ".join(blockers + presentation_blockers))
    with skill_modules(skill_root) as (lesson, course):
        try:
            lesson_data, _, evidence = lesson.check_lesson(directory, require_runs=target == "ready")
            if data["lesson_id"] != lesson_data["slug"]:
                fail("journal.lesson_id must equal lesson.slug")
            unverified_tasks = []
            if target == "ready":
                practice = snapshot(directory, data, "practice", boundary)
                practice_blockers = review_errors(data, "practice", practice["artifact_sha256"])
                if practice_blockers:
                    fail("; ".join(practice_blockers))
                theory_end = max(datetime.fromisoformat(review["reviewed_at"].replace("Z", "+00:00"))
                                 for review in data["theory_reviews"])
                practice_start = min(datetime.fromisoformat(review["reviewed_at"].replace("Z", "+00:00"))
                                     for review in data["practice_reviews"])
                if practice_start < theory_end:
                    fail("practice: reviews cannot predate the final theory review")
                tasks_path, tasks = task_records(directory, data, boundary, required=True)
                concepts = {concept for task in tasks for concept in task.get("concepts", [])}
                _, unverified_tasks = course.check_tasks(
                    tasks_path.parent, {"schema_version": 1, "tasks": tasks},
                    {data["lesson_id"]}, concepts, lesson_data["languages"], True)
        except lesson.LessonError as exc:
            fail(str(exc))
    registry = catalog()
    return {"lesson_id": data["lesson_id"], "sequence": data["sequence"], "level": data["level"],
            "stage": target, "difficulty_scope": "within_level", "theory_sha256": theory["artifact_sha256"],
            "recorded_executed_languages": evidence["verified_languages"],
            "unverified_languages": sorted(set(lesson_data["languages"]) - set(evidence["verified_languages"])),
            "source_only_platform_languages": [language for language in lesson_data["languages"]
                                                if not registry[language]["platform_runner"]],
            "unverified_code_tasks": unverified_tasks, "review_blockers": blockers,
            "presentation_blockers": presentation_blockers,
            "notice": "Checks consistency of files and recorded evidence only; does not run code or prove reviews/execution happened."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-root", type=Path, default=DEFAULT_SKILL_ROOT)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("check-catalog")
    for name in ("check", "snapshot"):
        command = commands.add_parser(name)
        command.add_argument("directory", type=Path)
        command.add_argument("--journal", default="authoring.json")
        command.add_argument("--course-root", type=Path)
        if name == "check":
            command.add_argument("--stage", choices=STAGES)
        else:
            command.add_argument("--phase", required=True, choices=("theory", "practice"))
    for name in ("lesson", "course"):
        command = commands.add_parser(name, add_help=False)
        command.add_argument("-h", "--help", action="store_true", dest="forward_help")
        command.add_argument("args", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    try:
        if args.command == "check-catalog":
            result = check_catalog()
        elif args.command == "check":
            result = check(args.directory, args.journal, args.stage, args.course_root, args.skill_root)
        elif args.command == "snapshot":
            directory = args.directory.resolve()
            boundary = (args.course_root or directory).resolve()
            _, journal = load_journal(directory, args.journal, boundary)
            result = snapshot(directory, journal, args.phase, boundary)
        else:
            with skill_modules(args.skill_root) as (lesson, course):
                old_argv = sys.argv
                try:
                    if args.forward_help:
                        args.args.insert(0, "--help")
                    sys.argv = [str(args.skill_root / "scripts" / (args.command + "_tool.py"))] + args.args
                    return lesson.main(args.args) if args.command == "lesson" else course.main()
                finally:
                    sys.argv = old_argv
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (AuthoringError, OSError, UnicodeError, ValueError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
