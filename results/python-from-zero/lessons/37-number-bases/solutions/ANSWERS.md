# 37. Мини-проект: системы счисления: ответы

## Задание 1

5: 1 * 4 + 0 * 2 + 1.

## Задание 2

Первая извлечённая цифра — младшая, которая в обычной записи стоит справа, а не слева.

## Задание 3

Второй аргумент int определяет основание исходной текстовой записи.

```python
text = input()
print(int(text, 2))
```

## Задание 4

Сначала получаем само числовое значение, затем строим другую запись. Нет необходимости делать прямое соответствие символов разных оснований.

```python
def to_base(number, base):
    if number == 0:
        return '0'
    digits = '0123456789ABCDEF'
    parts = []
    remaining = number
    while remaining > 0:
        digit = remaining % base
        parts.append(digits[digit])
        remaining //= base
    return ''.join(parts[::-1])

source = int(input())
target = int(input())
text = input()
number = int(text, source)
print(to_base(number, target))
```

