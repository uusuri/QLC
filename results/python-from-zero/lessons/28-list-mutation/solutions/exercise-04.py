tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
edited = numbers.copy()
for index in range(len(edited)):
    edited[index] += 1
print(*numbers)
print(*edited)
