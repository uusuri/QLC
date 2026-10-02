tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
replacement = int(input())
edited = numbers.copy()
edited[0] = replacement
print(*numbers)
print(*edited)
