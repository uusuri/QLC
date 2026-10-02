n = int(input())
best = int(input())
for i in range(n - 1):
    value = int(input())
    if value < best:
        best = value
print(best)
