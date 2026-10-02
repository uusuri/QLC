n = int(input())
total = 0
positive_count = 0
for day in range(n):
    value = int(input())
    total += value
    if value > 0:
        positive_count += 1
print(total, positive_count)
