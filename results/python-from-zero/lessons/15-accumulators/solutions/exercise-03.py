n = int(input())
total = 0
for i in range(n):
    value = int(input())
    if value % 2 == 0:
        total += value
print(total)
