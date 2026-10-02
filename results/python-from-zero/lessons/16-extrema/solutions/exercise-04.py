n = int(input())
best = int(input())
best_position = 1
for position in range(2, n + 1):
    value = int(input())
    if value > best:
        best = value
        best_position = position
print(best_position)
