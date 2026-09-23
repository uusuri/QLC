#!/usr/bin/env python3

import json
import os
from pathlib import Path
import subprocess
import sys
import time


SOURCE_FILE = Path("/request/Main.cpp")
EXECUTABLE_FILE = Path("/work/main")
WORK_DIRECTORY = Path("/work")
SANDBOX_EXECUTABLE = "/usr/local/bin/qlc-sandbox"
MAX_TEST_CASES = 100
MAX_DIAGNOSTIC_BYTES = 16 * 1024
MEMORY_FAILURE_MARKERS = (
    "std::bad_alloc",
    "cannot allocate memory",
    "memory allocation failed",
    "out of memory",
)


class JudgeConfigurationError(RuntimeError):
    pass


def positive_limit(name: str) -> int:
    raw_value = os.environ.get(name)
    if raw_value is None:
        raise JudgeConfigurationError(f"Missing environment variable: {name}")
    try:
        value = int(raw_value)
    except ValueError as exception:
        raise JudgeConfigurationError(f"Invalid integer in {name}") from exception
    if value <= 0:
        raise JudgeConfigurationError(f"{name} must be positive")
    return value


def parse_test_cases(raw_test_cases: str) -> list[dict[str, str]]:
    if not raw_test_cases.strip():
        raise JudgeConfigurationError("Test cases are empty")

    try:
        parsed = json.loads(raw_test_cases)
    except json.JSONDecodeError as exception:
        if raw_test_cases.lstrip().startswith(("[", "{")):
            raise JudgeConfigurationError("Test cases contain malformed JSON") from exception
        # Compatibility with the first C++ tasks, which stored only expected stdout.
        return [{"input": "", "output": raw_test_cases}]

    if not isinstance(parsed, list) or not parsed:
        raise JudgeConfigurationError("Test cases must be a non-empty JSON array")
    if len(parsed) > MAX_TEST_CASES:
        raise JudgeConfigurationError(f"Too many test cases: maximum is {MAX_TEST_CASES}")

    test_cases: list[dict[str, str]] = []
    for index, test_case in enumerate(parsed, start=1):
        if not isinstance(test_case, dict):
            raise JudgeConfigurationError(f"Test case {index} must be an object")
        test_input = test_case.get("input")
        expected_output = test_case.get("output")
        if not isinstance(test_input, str) or not isinstance(expected_output, str):
            raise JudgeConfigurationError(
                f"Test case {index} must contain string fields 'input' and 'output'"
            )
        test_cases.append({"input": test_input, "output": expected_output})
    return test_cases


def normalize_output(output: str) -> str:
    normalized = output.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip(" \t") for line in normalized.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def outputs_equal(actual: str, expected: str) -> bool:
    return normalize_output(actual) == normalize_output(expected)


def read_diagnostic(path: Path) -> str:
    if not path.exists():
        return ""
    data = path.read_bytes()[:MAX_DIAGNOSTIC_BYTES]
    text = data.decode("utf-8", errors="replace").strip()
    if path.stat().st_size > MAX_DIAGNOSTIC_BYTES:
        text += "\n[diagnostic truncated]"
    return text


def read_peak_memory_kb(path: Path) -> int | None:
    if not path.exists():
        return None
    try:
        value = int(path.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None
    return value if value >= 0 else None


def is_memory_limit_exceeded(
    return_code: int,
    diagnostic: str,
    peak_memory_kb: int | None,
    memory_limit_kb: int,
) -> bool:
    normalized_diagnostic = diagnostic.casefold()
    allocation_failed = any(
        marker in normalized_diagnostic for marker in MEMORY_FAILURE_MARKERS
    )
    killed_by_memory_controller = return_code == 137
    reached_reported_limit = (
        peak_memory_kb is not None and peak_memory_kb >= memory_limit_kb
    )
    return allocation_failed or killed_by_memory_controller or reached_reported_limit


def emit_result(
    verdict: str,
    passed_tests: int,
    total_tests: int,
    execution_time_ms: int,
    memory_used_kb: int | None,
    message: str,
) -> None:
    result = {
        "verdict": verdict,
        "passedTests": passed_tests,
        "totalTests": total_tests,
        "executionTimeMs": execution_time_ms,
        "memoryUsedKb": memory_used_kb,
        "safeMessage": message,
    }
    sys.stdout.write(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()


def compile_source() -> tuple[bool, str]:
    compiler_stdout = WORK_DIRECTORY / "compiler.stdout"
    compiler_stderr = WORK_DIRECTORY / "compiler.stderr"
    with compiler_stdout.open("wb") as stdout_file, compiler_stderr.open("wb") as stderr_file:
        try:
            completed = subprocess.run(
                [
                    "g++",
                    "-std=c++23",
                    "-O2",
                    "-pipe",
                    str(SOURCE_FILE),
                    "-o",
                    str(EXECUTABLE_FILE),
                ],
                stdout=stdout_file,
                stderr=stderr_file,
                check=False,
                timeout=30,
            )
        except subprocess.TimeoutExpired:
            return False, "Компиляция превысила внутренний лимит времени."

    if completed.returncode == 0:
        return True, ""
    diagnostic = read_diagnostic(compiler_stderr)
    message = "Ошибка компиляции."
    if diagnostic:
        message += "\n" + diagnostic
    return False, message


def sandbox_command(
    time_limit_ms: int,
    memory_limit_kb: int,
    output_limit_kb: int,
) -> list[str]:
    return [
        SANDBOX_EXECUTABLE,
        "--memory-kb",
        str(memory_limit_kb),
        "--time-ms",
        str(time_limit_ms),
        "--output-kb",
        str(output_limit_kb),
        str(EXECUTABLE_FILE),
    ]


def run_test_case(
    index: int,
    test_input: str,
    time_limit_ms: int,
    memory_limit_kb: int,
    output_limit_kb: int,
) -> tuple[str, str, int, int | None]:
    stdout_path = WORK_DIRECTORY / f"test-{index:03d}.stdout"
    stderr_path = WORK_DIRECTORY / f"test-{index:03d}.stderr"
    memory_path = WORK_DIRECTORY / f"test-{index:03d}.memory"
    started_at = time.monotonic()

    with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
        completed = subprocess.run(
            [
                "/usr/bin/time",
                "--quiet",
                "--format=%M",
                f"--output={memory_path}",
                *sandbox_command(time_limit_ms, memory_limit_kb, output_limit_kb),
            ],
            input=test_input.encode("utf-8"),
            stdout=stdout_file,
            stderr=stderr_file,
            check=False,
        )

    elapsed_ms = round((time.monotonic() - started_at) * 1000)
    actual_output = stdout_path.read_bytes().decode("utf-8", errors="replace")
    diagnostic = read_diagnostic(stderr_path)
    peak_memory_kb = read_peak_memory_kb(memory_path)

    if completed.returncode in (124, 152):
        return "TLE", "Превышено ограничение времени.", elapsed_ms, peak_memory_kb
    if completed.returncode == 153 or stdout_path.stat().st_size > output_limit_kb * 1024:
        return "OLE", "Превышено ограничение вывода.", elapsed_ms, peak_memory_kb
    if completed.returncode != 0 and is_memory_limit_exceeded(
        completed.returncode,
        diagnostic,
        peak_memory_kb,
        memory_limit_kb,
    ):
        return "MLE", "Превышено ограничение памяти.", elapsed_ms, peak_memory_kb
    if completed.returncode != 0:
        message = "Ошибка выполнения."
        if diagnostic:
            message += "\n" + diagnostic
        return "RE", message, elapsed_ms, peak_memory_kb
    return "OK", actual_output, elapsed_ms, peak_memory_kb


def main() -> int:
    try:
        if not SOURCE_FILE.is_file():
            raise JudgeConfigurationError(f"Source file is missing: {SOURCE_FILE}")

        time_limit_ms = positive_limit("QLC_TIME_LIMIT_MS")
        memory_limit_kb = positive_limit("QLC_MEMORY_LIMIT_KB")
        output_limit_kb = positive_limit("QLC_OUTPUT_LIMIT_KB")
        test_cases = parse_test_cases(sys.stdin.read())

        compiled, compiler_message = compile_source()
        if not compiled:
            emit_result("CE", 0, len(test_cases), 0, None, compiler_message)
            return 0

        total_execution_time_ms = 0
        peak_memory_kb = 0
        for index, test_case in enumerate(test_cases, start=1):
            status, output_or_message, elapsed_ms, test_memory_kb = run_test_case(
                index,
                test_case["input"],
                time_limit_ms,
                memory_limit_kb,
                output_limit_kb,
            )
            total_execution_time_ms += elapsed_ms
            if test_memory_kb is not None:
                peak_memory_kb = max(peak_memory_kb, test_memory_kb)

            if status != "OK":
                emit_result(
                    status,
                    index - 1,
                    len(test_cases),
                    total_execution_time_ms,
                    peak_memory_kb,
                    f"Тест {index}: {output_or_message}",
                )
                return 0

            if not outputs_equal(output_or_message, test_case["output"]):
                emit_result(
                    "WA",
                    index - 1,
                    len(test_cases),
                    total_execution_time_ms,
                    peak_memory_kb,
                    f"Неверный ответ на тесте {index}.",
                )
                return 0

        emit_result(
            "AC",
            len(test_cases),
            len(test_cases),
            total_execution_time_ms,
            peak_memory_kb,
            f"Пройдено тестов: {len(test_cases)} из {len(test_cases)}.",
        )
        return 0
    except JudgeConfigurationError as exception:
        print(f"Judge configuration error: {exception}", file=sys.stderr)
        return 30
    except Exception as exception:
        print(f"Unexpected judge error: {exception}", file=sys.stderr)
        return 31


if __name__ == "__main__":
    raise SystemExit(main())
