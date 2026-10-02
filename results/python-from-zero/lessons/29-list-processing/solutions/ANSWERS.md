# 29. Отбор, поиск и сортировка списка: ответы

## Задание 1

sort меняет существующий список и возвращает None. sorted создаёт и возвращает новый список.

## Задание 2

Текст сравнивается по последовательности символов: символ 1 раньше 2. Для числового смысла нужны int.

## Задание 3

Используем новый список, не сортируем его.

```python
tokens = input().split()
negative = []
for token in tokens:
    value = int(token)
    if value < 0:
        negative.append(value)
print(*negative)
```

## Задание 4

Перебираем исходные индексы, выходим при первом совпадении.

```python
tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
target = int(input())
position = -1
for index in range(len(numbers)):
    if numbers[index] == target:
        position = index
        break
print(position)
```

