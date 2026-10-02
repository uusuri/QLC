numbers = [int(token) for token in input().split()]
result = []
for value in numbers:
    if value % 2 == 0:
        result.append(value ** 2)
print(*result)
