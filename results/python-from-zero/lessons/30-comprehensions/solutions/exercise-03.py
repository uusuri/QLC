numbers = [int(token) for token in input().split()]
result = [value + 10 for value in numbers]
print(*result)
