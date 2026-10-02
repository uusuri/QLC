stock = int(input())
use = int(input())
remaining = stock
days = 0
while remaining > 0:
    remaining -= use
    days += 1
print(days)
