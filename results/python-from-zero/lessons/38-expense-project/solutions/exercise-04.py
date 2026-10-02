budget = int(input())
n = int(input())
total = 0
for i in range(n):
    total += int(input())
if total <= budget:
    print('ДА')
else:
    print('НЕТ')
