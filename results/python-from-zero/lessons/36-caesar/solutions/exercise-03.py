text = input()
parts = []
for character in text:
    if 'a' <= character <= 'z':
        position = ord(character) - ord('a')
        parts.append(chr(ord('a') + (position + 1) % 26))
    else:
        parts.append(character)
print(''.join(parts))
