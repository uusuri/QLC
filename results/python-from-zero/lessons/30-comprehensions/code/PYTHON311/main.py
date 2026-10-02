numbers = [int(token) for token in input().split()]
result = [value ** 2 for value in numbers if value % 2 == 0]
print(*result)
