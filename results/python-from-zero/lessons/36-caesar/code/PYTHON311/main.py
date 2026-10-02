def shift_character(character, shift):
    if 'a' <= character <= 'z':
        start = ord('a')
    elif 'A' <= character <= 'Z':
        start = ord('A')
    else:
        return character
    position = ord(character) - start
    new_position = (position + shift) % 26
    return chr(start + new_position)

def caesar(text, shift):
    parts = []
    for character in text:
        parts.append(shift_character(character, shift))
    return ''.join(parts)

shift = int(input())
text = input()
print(caesar(text, shift))
