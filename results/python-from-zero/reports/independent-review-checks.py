from decimal import Decimal
from random import Random


def reconstructed_prime(n):
    prime = n >= 2
    d = 2
    while d * d <= n:
        if n % d == 0:
            prime = False
            break
        d += 1
    return prime


def reconstructed_base(number, base):
    if number == 0:
        return '0'
    table = '0123456789ABCDEF'
    remaining = number
    parts = []
    while remaining > 0:
        digit = remaining % base
        parts.append(table[digit])
        remaining //= base
    parts.reverse()
    return ''.join(parts)


def reconstructed_money(cents):
    sign = '-' if cents < 0 else ''
    value = abs(cents)
    return f'{sign}{value // 100}.{value % 100:02d}'


def reconstructed_expenses(budget, purchases):
    total = 0
    for purchase in purchases:
        total += purchase[1]
    best = -1
    if purchases:
        best = 0
        for i in range(1, len(purchases)):
            if purchases[i][1] > purchases[best][1]:
                best = i
    name = 'НЕТ ПОКУПОК' if best == -1 else purchases[best][0]
    return [f'ИТОГО {reconstructed_money(total)}',
            f'ОСТАТОК {reconstructed_money(budget - total)}',
            f'ПОКУПКА {name}']


prime_count = 0
for n in range(5001):
    expected = n >= 2 and all(n % d for d in range(2, n))
    assert reconstructed_prime(n) == expected, n
    prime_count += 1
for n, expected in [(999983, True), (1000000, False), (999999, False)]:
    assert reconstructed_prime(n) == expected, n
    prime_count += 1

base_count = 0
for n in range(2049):
    for base in range(2, 17):
        output = reconstructed_base(n, base)
        assert int(output, base) == n, (n, base, output)
        assert (output == '0') if n == 0 else not output.startswith('0')
        assert all('0123456789ABCDEF'.index(c) < base for c in output)
        if base == 2:
            assert output == bin(n)[2:]
        elif base == 10:
            assert output == str(n)
        elif base == 16:
            assert output == hex(n)[2:].upper()
        base_count += 1
for base in range(2, 17):
    assert int(reconstructed_base(1000000000, base), base) == 1000000000
    base_count += 1

money_cases = [0, 5, 100, -5, -105, 1, 99, 101, -1, -99, -100, 1000000000]
for amount in money_cases:
    assert reconstructed_money(amount) == f'{Decimal(amount) / Decimal(100):.2f}'

rng = Random(20261001)
cases = [(0, []), (0, [['одна', 0]]), (100, [['а', 100], ['б', 100]]),
         (10, [['чай', 15], ['сок', 15], ['хлеб', 2]])]
for _ in range(2000):
    purchases = [[f'Покупка {i}', rng.randint(0, 40)] for i in range(rng.randint(0, 8))]
    cases.append((rng.randint(0, 120), purchases))
for budget, purchases in cases:
    total = sum(p[1] for p in purchases)
    winner = 'НЕТ ПОКУПОК'
    if purchases:
        winner = max(purchases, key=lambda p: p[1])[0]
    expected = [f'ИТОГО {Decimal(total) / Decimal(100):.2f}',
                f'ОСТАТОК {Decimal(budget - total) / Decimal(100):.2f}',
                f'ПОКУПКА {winner}']
    assert reconstructed_expenses(budget, purchases) == expected, (budget, purchases)
print(f'prime: {prime_count}; base: {base_count}; money: {len(money_cases)}; expenses: {len(cases)}; seed: 20261001; all passed')
