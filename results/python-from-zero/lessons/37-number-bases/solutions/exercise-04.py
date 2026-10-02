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

source = int(input())
target = int(input())
text = input()
number = int(text, source)
print(to_base(number, target))
