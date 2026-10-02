tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
last = numbers.pop()
print(last)
print(*numbers)
