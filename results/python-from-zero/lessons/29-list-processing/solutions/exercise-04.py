tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
target = int(input())
position = -1
for index in range(len(numbers)):
    if numbers[index] == target:
        position = index
        break
print(position)
