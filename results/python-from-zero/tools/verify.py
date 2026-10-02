"""Reproduce exact example runs and independent checks for the course."""
from pathlib import Path
import ast
import hashlib
import json
import platform
import random
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SEED = 20261001

def digest(value):
    return hashlib.sha256(value).hexdigest()

def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def execute(code_path, stdin):
    result = subprocess.run([sys.executable, str(code_path)], input=stdin, text=True,
                            encoding='utf-8', capture_output=True, timeout=5)
    return result

def definitions(path):
    source = ast.parse(path.read_text(encoding='utf-8'))
    nodes = [node for node in source.body if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
    env = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), 'exec'), env)
    return env

def main():
    dirs = sorted((ROOT / 'lessons').iterdir())
    failures = []
    main_runs = 0
    exercise_runs = 0
    programs = 0
    exercise_programs = 0
    syntax_checks = 0
    main_paths = {}
    for directory in dirs:
        if not directory.is_dir():
            continue
        data = json.loads((directory / 'lesson.json').read_text(encoding='utf-8'))
        number = int(directory.name.split('-')[0])
        path = directory / data['variants']['PYTHON311']['code_file']
        main_paths[number] = path
        ast.parse(path.read_text(encoding='utf-8'))
        syntax_checks += 1
        cases = []
        for expected in data['examples']:
            result = execute(path, expected['input'])
            main_runs += 1
            cases.append(dict(id=expected['id'], input_sha256=digest(expected['input'].encode()),
                              actual_output=result.stdout, exit_code=result.returncode, stderr=result.stderr))
            if result.returncode != 0 or result.stdout != expected['output']:
                failures.append(dict(lesson=number, program='main', case=expected['id'], actual=result.stdout,
                                     expected=expected['output'], stderr=result.stderr))
        programs += 1
        save_json(directory / 'verification.json', dict(schema_version=1, runs=[dict(
            language='PYTHON311', code_sha256=digest(path.read_bytes()),
            runner=f'Python {platform.python_version()}; {sys.executable} {path.relative_to(directory)}', cases=cases)]))
        exercise_results = []
        exercises = json.loads((directory / 'practice/exercises.json').read_text(encoding='utf-8'))
        for ex in exercises:
            if ex['code_file'] is None:
                continue
            path = directory / ex['code_file']
            ast.parse(path.read_text(encoding='utf-8'))
            syntax_checks += 1
            exercise_programs += 1
            actual_cases = []
            for expected in ex['examples']:
                result = execute(path, expected['input'])
                exercise_runs += 1
                actual_cases.append(dict(id=expected['id'], input_sha256=digest(expected['input'].encode()),
                                         actual_output=result.stdout, exit_code=result.returncode, stderr=result.stderr))
                if result.returncode != 0 or result.stdout != expected['output']:
                    failures.append(dict(lesson=number, program=ex['id'], case=expected['id'], actual=result.stdout,
                                         expected=expected['output'], stderr=result.stderr))
            exercise_results.append(dict(id=ex['id'], code_sha256=digest(path.read_bytes()), cases=actual_cases))
        save_json(directory / 'practice/verification.json', dict(schema_version=1,
            runner=f'Python {platform.python_version()}', programs=exercise_results))

    rng = random.Random(SEED)
    independent = []
    def record(name, count, method, extra=None):
        independent.append(dict(name=name, cases=count, method=method, status='passed', **(extra or {})))

    # A deliberately slow divisor count checks the optimized primality program.
    numbers = list(range(101)) + [rng.randrange(0, 1000001) for _ in range(100)]
    prime_cases = []
    for value in numbers:
        slow = value >= 2 and sum(value % divisor == 0 for divisor in range(1, value + 1)) == 2
        expected = 'ДА\n' if slow else 'НЕТ\n'
        stdin = f'{value}\n'
        result = execute(main_paths[21], stdin)
        if result.returncode or result.stdout != expected:
            raise AssertionError(('prime', value, result.stdout, expected, result.stderr))
        prime_cases.append(dict(input=stdin, expected=expected, actual_output=result.stdout,exit_code=result.returncode))
    record('primality', len(numbers), 'Полный подсчёт делителей от 1 до n; он не использует границу sqrt(n).',
           dict(seed=SEED, code_sha256=digest(main_paths[21].read_bytes()), runs=prime_cases))

    base_env = definitions(main_paths[37])
    count = 0
    for base in range(2, 17):
        for number in [0, 1, base - 1, base, base + 1, 10**9] + [rng.randrange(0, 10**9 + 1) for _ in range(100)]:
            text = base_env['to_base'](number, base)
            assert int(text, base) == number
            assert text == text.upper()
            assert all(character in '0123456789ABCDEF'[:base] for character in text)
            assert text == '0' or not text.startswith('0')
            count += 1
    record('number-bases', count, 'Стандартный int(text, base), алфавит, регистр и отсутствие ведущих нулей.',
           dict(seed=SEED,code_sha256=digest(main_paths[37].read_bytes())))

    caesar_env = definitions(main_paths[36])
    count = 0
    lower = 'abcdefghijklmnopqrstuvwxyz'
    upper = lower.upper()
    def slow_caesar(text, shift):
        answer = []
        for character in text:
            alphabet = lower if character in lower else upper if character in upper else None
            if alphabet is None:
                answer.append(character)
            else:
                position = alphabet.index(character)
                answer.append(alphabet[(position + shift) % len(alphabet)])
        return ''.join(answer)
    for _ in range(500):
        text = ''.join(rng.choice(lower + upper + '012! -Привет') for _ in range(rng.randrange(0, 101)))
        shift = rng.randrange(-1000000, 1000001)
        actual = caesar_env['caesar'](text, shift)
        assert actual == slow_caesar(text, shift)
        assert caesar_env['caesar'](actual, -shift) == text
        count += 1
    record('caesar', count, 'Независимый поиск буквы в строке алфавита вместо ord/chr плюс обратный сдвиг.',
           dict(seed=SEED,code_sha256=digest(main_paths[36].read_bytes())))

    ledger_env = definitions(main_paths[38])
    from decimal import Decimal
    money_values = [0, 1, -1, 5, -5, 100, -100, -105, 10**9, -(10**9)]
    money_values += [rng.randrange(-10**9, 10**9 + 1) for _ in range(500)]
    for value in money_values:
        expected = format(Decimal(value) / Decimal(100), '.2f')
        assert ledger_env['money_text'](value) == expected
    record('money-format', len(money_values), 'Точная Decimal-арифметика как независимая проверка знака и двух цифр копеек.',
           dict(seed=SEED,code_sha256=digest(main_paths[38].read_bytes())))
    for _ in range(500):
        purchases = [[f'покупка {i}', rng.randrange(0, 11)] for i in range(rng.randrange(0, 101))]
        expected = -1
        if purchases:
            prices = [p[1] for p in purchases]
            expected = prices.index(max(prices))
        assert ledger_env['largest_purchase_index'](purchases) == expected
    record('first-largest-purchase', 500, 'max всех цен и index первого значения, включая пустой набор и повторяющиеся цены.',
           dict(seed=SEED,code_sha256=digest(main_paths[38].read_bytes())))

    password_env = definitions(main_paths[35])
    alphabet = lower + upper + '0123456789'
    for length in range(101):
        random.seed(SEED + length)
        text = password_env['generate_password'](length)
        assert len(text) == length
        assert all(character in alphabet for character in text)
    record('random-string-properties', 101, 'Все допустимые длины 0–100 и принадлежность каждого символа алфавиту.',
           dict(seed=SEED,code_sha256=digest(main_paths[35].read_bytes())))

    # Real execution of the auxiliary random game with a stream that contains
    # every possible secret. Matching the independently reconstructed transcript
    # checks a possible random outcome without fixing it in the game itself.
    play_path = main_paths[34].with_name('play.py')
    ast.parse(play_path.read_text(encoding='utf-8'))
    syntax_checks += 1
    transcript = execute(play_path, ''.join(f'{value}\n' for value in range(1, 101)))
    header = 'Угадайте число от 1 до 100. У вас 7 попыток.\n'
    allowed = []
    for secret in range(1, 101):
        output = header
        for attempt in range(1, 8):
            if attempt == secret:
                output += f'УГАДАНО {attempt}\n'
                break
            output += 'БОЛЬШЕ\n' if attempt < secret else 'МЕНЬШЕ\n'
        else:
            output += 'ПОПЫТКИ ЗАКОНЧИЛИСЬ\n'
        allowed.append(output)
    assert transcript.returncode == 0 and transcript.stdout in allowed
    record('interactive-random-game', 1, 'Фактический вывод сопоставлен с допустимыми сценариями всех 100 возможных секретов.',
           dict(code_sha256=digest(play_path.read_bytes()),actual_output=transcript.stdout,exit_code=transcript.returncode))

    mutants = [
        (8, 'amount >= 1000', 'amount > 1000', '1000\n', 'БЕСПЛАТНО\n', 'Потеря включённой границы'),
        (15, 'value > 0', 'value >= 0', '1\n0\n', '0 0\n', 'Ноль ошибочно положителен'),
        (16, 'best = int(input())', 'first = int(input())\nbest = 0', '3\n-8\n-3\n-5\n', '-3\n', 'Максимум начинается с нуля'),
        (17, 'remaining > 0', 'remaining >= 0', '6\n3\n', '2\n', 'Лишний день при точной кратности'),
        (21, 'divisor * divisor <= n', 'divisor * divisor < n', '49\n', 'НЕТ\n', 'Пропуск квадратного корня'),
        (28, 'edited = numbers.copy()', 'edited = numbers', '2 4 6\n9\n', '2 4 6\n9 4 6\n', 'Присваивание вместо копии'),
        (38, 'purchases[index][1] > purchases[best_index][1]', 'purchases[index][1] >= purchases[best_index][1]',
         '1000\n2\nпервая\n200\nвторая\n200\n', 'ИТОГО 4.00\nОСТАТОК 6.00\nПОКУПКА первая\n', 'Последний максимум вместо первого'),
    ]
    mutation_results = []
    for lesson, old, new, stdin, expected, reason in mutants:
        original = main_paths[lesson].read_text(encoding='utf-8')
        assert old in original
        mutated = original.replace(old, new, 1)
        p = subprocess.run([sys.executable, '-c', mutated], input=stdin,text=True,encoding='utf-8',capture_output=True,timeout=5)
        assert p.returncode != 0 or p.stdout != expected
        mutation_results.append(dict(lesson=lesson, reason=reason, input=stdin,
                                     correct_output=expected, mutant_output=p.stdout, exit_code=p.returncode, detected=True))

    status = dict(schema_version=1, interpreter=f'Python {platform.python_version()}',
                  compatibility_target='Python 3.11+', executed_python_311=False, seed=SEED,
                  lesson_programs=programs, exercise_programs=exercise_programs,
                  main_example_runs=main_runs, exercise_example_runs=exercise_runs,
                  syntax_checks=syntax_checks, independent_checks=independent,
                  mutation_checks=mutation_results, failures=failures)
    save_json(ROOT / 'reports/verification.json', status)
    if failures:
        print(json.dumps(failures, ensure_ascii=False, indent=2))
        raise SystemExit(1)
    print(json.dumps(dict(lesson_programs=programs, exercise_programs=exercise_programs,
                         main_runs=main_runs, exercise_runs=exercise_runs,
                         independent_cases=sum(item['cases'] for item in independent),
                         detected_mutants=len(mutation_results), failures=0),ensure_ascii=False))

if __name__ == '__main__':
    main()
