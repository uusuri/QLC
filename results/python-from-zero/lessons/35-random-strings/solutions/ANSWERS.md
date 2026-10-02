# 35. Мини-проект: учебный генератор паролей: ответы

## Задание 1

Да. Цифры разрешены, но ни одна итерация не обязана выбрать цифру.

## Задание 2

Так строится одна итоговая строка вместо многократного создания всё более длинных строк. Смысл каждой части виден отдельно.

## Задание 3

Строковый алфавит цифр сохраняет ведущие нули; результат не преобразуется в int.

```python
import random
seed = int(input())
length = int(input())
random.seed(seed)
parts = []
for i in range(length):
    parts.append(random.choice('0123456789'))
print(''.join(parts))
```

## Задание 4

Флаг начинает с проверки длины и сбрасывается при первом запрещённом символе.

```python
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
```

