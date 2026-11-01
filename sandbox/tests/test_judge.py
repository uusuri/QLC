import importlib.util
from unittest.mock import patch
from pathlib import Path
import tempfile
import unittest
import io
import json
from contextlib import redirect_stdout


JUDGE_PATH = Path(__file__).resolve().parents[1] / "judge.py"
SPEC = importlib.util.spec_from_file_location("qlc_judge", JUDGE_PATH)
judge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(judge)


class JudgeTest(unittest.TestCase):
    def test_custom_tests_allow_optional_output_but_normal_judging_does_not(self):
        self.assertEqual([{"input": "", "output": None}], judge.parse_test_cases('[{"input":""}]', True))
        with self.assertRaises(judge.JudgeConfigurationError):
            judge.parse_test_cases('[{"input":""}]')
        for value in ('legacy', json.dumps([{"input": ""}] * 11), json.dumps([{"input": "я" * 9000}])):
            with self.assertRaises(judge.JudgeConfigurationError):
                judge.parse_test_cases(value, True)

    def execute_main(self, custom, tests, compiled=True):
        output = io.StringIO()
        def execute(index, test_input, *_):
            (judge.WORK_DIRECTORY / f"test-{index:03d}.stdout").write_text("5\n", encoding="utf-8")
            (judge.WORK_DIRECTORY / f"test-{index:03d}.stderr").write_text(" debug\n", encoding="utf-8")
            return ("TLE", "Too slow", 10, 123) if test_input == "slow" else ("OK", "5\n", 3, 123)
        with tempfile.TemporaryDirectory() as directory, patch.object(judge, "WORK_DIRECTORY", Path(directory)), \
                patch.object(Path, "is_file", return_value=True), patch.object(judge, "compile_source", return_value=(compiled, "CE diagnostic")), \
                patch.object(judge, "run_test_case", side_effect=execute) as runner, \
                patch.dict("os.environ", {"QLC_TIME_LIMIT_MS": "100", "QLC_MEMORY_LIMIT_KB": "65536", "QLC_OUTPUT_LIMIT_KB": "64",
                    "QLC_CUSTOM_RUN": str(custom).lower()}, clear=True), \
                patch("sys.stdin", io.StringIO(json.dumps(tests))), redirect_stdout(output):
            self.assertEqual(0, judge.main())
            return json.loads(output.getvalue()), runner.call_count

    def test_custom_mode_continues_after_wrong_answer_and_timeout_and_preserves_streams(self):
        result, calls = self.execute_main(True, [{"input": "", "output": "6"}, {"input": "slow"}, {"input": ""}, {"input": "", "output": "5"}])
        self.assertEqual(4, calls)
        self.assertEqual(["WA", "TLE", "OK", "AC"], [test["status"] for test in result["tests"]])
        self.assertEqual("5\n", result["tests"][0]["stdout"])
        self.assertEqual(" debug\n", result["tests"][0]["stderr"])

    def test_normal_mode_still_stops_on_first_failure_and_never_returns_streams(self):
        result, calls = self.execute_main(False, [{"input": "", "output": "6"}, {"input": "", "output": "5"}])
        self.assertEqual(1, calls)
        self.assertEqual("WA", result["verdict"])
        self.assertNotIn("tests", result)
        self.assertNotIn("debug", json.dumps(result))

    def test_compile_failure_does_not_run_tests(self):
        result, calls = self.execute_main(True, [{"input": ""}], compiled=False)
        self.assertEqual(0, calls)
        self.assertEqual("CE", result["verdict"])
        self.assertEqual([], result["tests"])

    def test_custom_output_is_bounded_without_stripping_newlines(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "stdout"
            file.write_text(" x\n" + "a" * judge.MAX_DIAGNOSTIC_BYTES)
            text, truncated = judge.read_custom_output(file)
            self.assertTrue(truncated)
            self.assertEqual(judge.MAX_DIAGNOSTIC_BYTES, len(text))
            self.assertTrue(text.startswith(" x\n"))

    def test_parses_json_test_cases(self):
        cases = judge.parse_test_cases('[{"input":"2 3\\n","output":"5\\n"}]')

        self.assertEqual([{"input": "2 3\n", "output": "5\n"}], cases)

    def test_supports_legacy_expected_output(self):
        cases = judge.parse_test_cases("Hello, World!\n")

        self.assertEqual([{"input": "", "output": "Hello, World!\n"}], cases)

    def test_rejects_malformed_json_instead_of_treating_it_as_legacy_output(self):
        with self.assertRaises(judge.JudgeConfigurationError):
            judge.parse_test_cases('[{"input":"broken')

    def test_output_comparison_ignores_line_endings_and_trailing_whitespace(self):
        self.assertTrue(judge.outputs_equal("5  \r\n\r\n", "5\n"))

    def test_output_comparison_keeps_leading_whitespace_significant(self):
        self.assertFalse(judge.outputs_equal(" 5\n", "5\n"))

    def test_reads_peak_memory_reported_by_gnu_time(self):
        with tempfile.TemporaryDirectory() as directory:
            memory_file = Path(directory) / "memory"
            memory_file.write_text("12345\n", encoding="utf-8")

            self.assertEqual(12345, judge.read_peak_memory_kb(memory_file))

    def test_builds_sandbox_command_with_task_limits(self):
        command = judge.sandbox_command(2000, 65536, 4096)

        self.assertEqual(
            [
                judge.SANDBOX_EXECUTABLE,
                "--memory-kb",
                "65536",
                "--time-ms",
                "2000",
                "--output-kb",
                "4096",
                "/work/main",
            ],
            command,
        )

    def test_java_command_uses_container_memory_instead_of_address_space_limit(self):
        command = judge.sandbox_command(
            2500, 262144, 4096, ["/opt/java/openjdk/bin/java", "-cp", "/work", "Main"], False
        )
        self.assertEqual("0", command[2])
        self.assertEqual(["/opt/java/openjdk/bin/java", "-cp", "/work", "Main"], command[-4:])

    def test_profile_command_is_parsed_as_argv_not_a_shell_string(self):
        with patch.dict("os.environ", {"QLC_RUN_COMMAND": '["/opt/java/openjdk/bin/java", "-cp", "/work", "Main"]'}):
            self.assertEqual(
                ["/opt/java/openjdk/bin/java", "-cp", "/work", "Main"],
                judge.command_from_env("QLC_RUN_COMMAND", ["/work/main"]),
            )

    def test_legacy_cpp_command_stays_available(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(
                ["/work/main"],
                judge.command_from_env("QLC_RUN_COMMAND", ["/work/main"]),
            )

    def test_classifies_unhandled_bad_alloc_as_memory_limit_exceeded(self):
        self.assertTrue(
            judge.is_memory_limit_exceeded(
                134,
                "terminate called after throwing an instance of 'std::bad_alloc'",
                2048,
                32768,
            )
        )

    def test_classifies_java_heap_exhaustion_as_memory_limit_exceeded(self):
        self.assertTrue(
            judge.is_memory_limit_exceeded(
                1, 'Exception in thread "main" java.lang.OutOfMemoryError: Java heap space',
                30000, 262144,
            )
        )

    def test_classifies_memory_controller_kill_as_memory_limit_exceeded(self):
        self.assertTrue(judge.is_memory_limit_exceeded(137, "", None, 32768))

    def test_keeps_plain_abort_as_runtime_error(self):
        self.assertFalse(judge.is_memory_limit_exceeded(134, "", 2048, 32768))

    def test_classifies_reported_peak_at_limit_as_memory_limit_exceeded(self):
        self.assertTrue(judge.is_memory_limit_exceeded(1, "", 32768, 32768))


if __name__ == "__main__":
    unittest.main()
