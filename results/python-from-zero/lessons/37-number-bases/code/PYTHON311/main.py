def to_base(number, base):
    if number == 0:
        return '0'
    digits = '0123456789ABCDEF'
    parts = []
    remaining = number
    while remaining > 0:
        digit = remaining % base
        parts.append(digits[digit])
        remaining //= base
    return ''.join(parts[::-1])

number = int(input())
base = int(input())
print(to_base(number, base))
