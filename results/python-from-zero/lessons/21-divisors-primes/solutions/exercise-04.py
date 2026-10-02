n = int(input())
total = 0
for divisor in range(1, n):
    if n % divisor == 0:
        total += divisor
print(total)
