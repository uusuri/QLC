text = input()
count = 0
for character in text:
    if character in 'AEIOUaeiou':
        count += 1
print(count)
