text = input()
result = ''
for character in text:
    if character in '0123456789':
        result += character
print(result)
