tokens = input().split()
positive = []
for token in tokens:
    value = int(token)
    if value > 0:
        positive.append(value)
positive.sort()
print(len(positive))
print(*positive)
