total = 0
while True:
    value = int(input())
    if value == 0:
        break
    if value < 0:
        continue
    total += value
print(total)
