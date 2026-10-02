n = int(input())
numbers = []
for i in range(n):
    numbers.append(int(input()))
print(len(numbers), sum(numbers))
parts = []
for value in numbers[::-1]:
    parts.append(str(value))
print(' '.join(parts))
