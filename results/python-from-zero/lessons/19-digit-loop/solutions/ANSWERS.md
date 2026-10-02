# 19. Цикл по цифрам числа: ответы

## Задание 1

0, 0, 2, 1. Извлечение идёт справа налево.

## Задание 2

Десятичная запись 0 состоит из одной цифры. Пустой цикл не означает пустую запись числа.

## Задание 3

Для цифр начальное best = 0 безопасно: все цифры неотрицательны, а у самого нуля ответ 0.

```python
remaining = int(input())
best = 0
while remaining > 0:
    digit = remaining % 10
    if digit > best:
        best = digit
    remaining //= 10
print(best)
```

## Задание 4

Каждая новая цифра добавляется справа: старый ответ умножаем на 10 и прибавляем цифру. У целого нет ведущих нулей.

```python
remaining = int(input())
reversed_number = 0
while remaining > 0:
    reversed_number = reversed_number * 10 + remaining % 10
    remaining //= 10
print(reversed_number)
```

