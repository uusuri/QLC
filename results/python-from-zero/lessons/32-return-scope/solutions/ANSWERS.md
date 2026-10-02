# 32. Возвращаем результат: return, локальные имена и параметры: ответы

## Задание 1

None. Число 7 окажется в выводе, а не в возвращаемом результате print.

## Задание 2

Это локальное имя вызова. Нужный результат надо вернуть и сохранить под внешним именем.

## Задание 3

Счётчик локален функции, каждый подходящий элемент добавляет 1.

```python
def count_positive(numbers):
    count = 0
    for value in numbers:
        if value > 0:
            count += 1
    return count

numbers = [int(token) for token in input().split()]
print(count_positive(numbers))
```

## Задание 4

Условие само является готовым bool, его можно вернуть напрямую.

```python
def is_even(number):
    return number % 2 == 0

number = int(input())
if is_even(number):
    print('ДА')
else:
    print('НЕТ')
```

