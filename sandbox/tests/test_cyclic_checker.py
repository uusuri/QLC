import importlib.util
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
import unittest


JUDGE_PATH = Path(__file__).resolve().parents[1] / "judge.py"
SPEC = importlib.util.spec_from_file_location("cyclic_judge", JUDGE_PATH)
judge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(judge)


class CyclicCheckerTest(unittest.TestCase):
    def case(self, test_input="3 2\nbcdefa\n4\nab\ncd\nef\naa\n", expected="YES\n1 2 3\n"):
        return {"input": test_input, "output": expected, "checker": "cyclic_game_catalog"}

    def test_accepts_different_correct_rotations_and_layouts(self):
        for output in ("YES\n1 2 3", "YES 2 3 1", "YES\r\n3\n1\t2\n"):
            with self.subTest(output=output):
                self.assertTrue(judge.check_test_output(self.case(), output))

    def test_rejects_invalid_order_duplicates_range_and_tokens(self):
        for output in ("", "NO", "yes 1 2 3", "YES 1 3 2", "YES 1 1 3", "YES 0 2 3",
                       "YES 1 2 5", "YES 1 2", "YES 1 2 3 4", "YES x 2 3"):
            with self.subTest(output=output):
                self.assertFalse(judge.check_test_output(self.case(), output))

    def test_no_solution(self):
        case = self.case("2 1\naa\n2\na\nb\n", "NO\n")
        self.assertTrue(judge.check_test_output(case, "NO\n"))
        self.assertFalse(judge.check_test_output(case, "NO extra"))
        self.assertFalse(judge.check_test_output(case, "YES 1 2"))

    def test_checker_validation_and_legacy_comparison(self):
        for checker in ("", None, "wrong", []):
            with self.subTest(checker=checker), self.assertRaises(judge.JudgeConfigurationError):
                judge.parse_test_cases(json.dumps([dict(self.case(), checker=checker)]))
        with self.assertRaises(judge.JudgeConfigurationError):
            judge.parse_test_cases(json.dumps([self.case()]), True)
        self.assertEqual([self.case()], judge.parse_test_cases(json.dumps([self.case()])))
        self.assertEqual([{"input": "", "output": "1"}],
                         judge.parse_test_cases('[{"input":"","output":"1"}]'))
        self.assertTrue(judge.check_test_output({"input": "", "output": "1\n"}, "1 \n"))

    def test_normal_judge_uses_semantic_checker(self):
        environment = {"QLC_TIME_LIMIT_MS": "100", "QLC_MEMORY_LIMIT_KB": "65536",
                       "QLC_OUTPUT_LIMIT_KB": "64"}
        for actual, expected in (("YES 2 3 1\n", "AC"), ("YES 1 3 2\n", "WA")):
            stream = io.StringIO()
            with self.subTest(actual=actual), \
                    patch.object(Path, "is_file", return_value=True), \
                    patch.object(judge, "compile_source", return_value=(True, "")), \
                    patch.object(judge, "run_test_case", return_value=("OK", actual, 1, 100)), \
                    patch.dict("os.environ", environment, clear=True), \
                    patch("sys.stdin", io.StringIO(json.dumps([self.case()]))), \
                    redirect_stdout(stream):
                self.assertEqual(0, judge.main())
            self.assertEqual(expected, json.loads(stream.getvalue())["verdict"])
