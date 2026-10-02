remaining = int(input())
best = 0
while remaining > 0:
    digit = remaining % 10
    if digit > best:
        best = digit
    remaining //= 10
print(best)
