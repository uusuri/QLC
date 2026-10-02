# 36. Мини-проект: шифр Цезаря и круговой сдвиг: ответы

## Задание 1

В a и z соответственно. Остаток возвращает номер в пределы круга.

## Задание 2

Код уйдёт в символы после букв, а правило требует вернуться в начало того же алфавита.

## Задание 3

Проверка диапазона ограничивает применение арифметики кодов.

```python
text = input()
parts = []
for character in text:
    if 'a' <= character <= 'z':
        position = ord(character) - ord('a')
        parts.append(chr(ord('a') + (position + 1) % 26))
    else:
        parts.append(character)
print(''.join(parts))
```

## Задание 4

Меняется только знак перед передаваемым сдвигом; правила регистров и посторонних символов сохраняются.

```python
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
print(caesar(text, -shift))
```

