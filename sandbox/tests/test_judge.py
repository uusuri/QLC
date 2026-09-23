import importlib.util
from pathlib import Path
import tempfile
import unittest


JUDGE_PATH = Path(__file__).resolve().parents[1] / "judge.py"
SPEC = importlib.util.spec_from_file_location("qlc_judge", JUDGE_PATH)
judge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(judge)


class JudgeTest(unittest.TestCase):
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
                str(judge.EXECUTABLE_FILE),
            ],
            command,
        )


if __name__ == "__main__":
    unittest.main()
