# 30. Списковые включения: короткая запись знакомого цикла: ответы

## Задание 1

[3, 6]. Преобразуется каждый элемент.

## Задание 2

Для очередного value сначала проверяется чётность. Только для прошедшего элемента вычисляется квадрат для добавления.

## Задание 3

Условие не нужно: преобразуются все числа.

```python
numbers = [int(token) for token in input().split()]
result = [value + 10 for value in numbers]
print(*result)
```

## Задание 4

Обе формы создают новый список и применяют тот же отбор.

```python
numbers = [int(token) for token in input().split()]
result = []
for value in numbers:
    if value % 2 == 0:
        result.append(value ** 2)
print(*result)
```

