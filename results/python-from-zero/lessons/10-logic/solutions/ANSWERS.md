# 10. Составные условия: and, or и not: ответы

## Задание 1

False, True, True.

## Задание 2

number < 5 or number > 9. Числа 5 и 9 остаются внутри.

## Задание 3

Хотя бы один нулевой остаток достаточен. Ноль делится и на 3, и на 5.

```python
number = int(input())
if number % 3 == 0 or number % 5 == 0:
    print('ДА')
else:
    print('НЕТ')
```

## Задание 4

Разделяем два случая: на 3, но не на 5; на 5, но не на 3.

```python
number = int(input())
by_three = number % 3 == 0
by_five = number % 5 == 0
if (by_three and not by_five) or (by_five and not by_three):
    print('ДА')
else:
    print('НЕТ')
```

