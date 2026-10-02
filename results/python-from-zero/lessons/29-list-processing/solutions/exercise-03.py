tokens = input().split()
negative = []
for token in tokens:
    value = int(token)
    if value < 0:
        negative.append(value)
print(*negative)
