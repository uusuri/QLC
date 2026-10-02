alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
text = input()
valid = len(text) == 8
for character in text:
    if character not in alphabet:
        valid = False
        break
if valid:
    print('ДА')
else:
    print('НЕТ')
