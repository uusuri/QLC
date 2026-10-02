remaining = int(input())
reversed_number = 0
while remaining > 0:
    reversed_number = reversed_number * 10 + remaining % 10
    remaining //= 10
print(reversed_number)
