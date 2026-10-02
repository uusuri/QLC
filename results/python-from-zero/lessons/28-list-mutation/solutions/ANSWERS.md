# 28. Изменение списков, общие ссылки и копии: ответы

## Задание 1

[7, 2]. Оба имени указывали на один список.

## Задание 2

Первое создаёт новый внешний список; второе добавляет имя существующему объекту.

## Задание 3

pop без аргумента возвращает удалённый последний элемент.

```python
tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
last = numbers.pop()
print(last)
print(*numbers)
```

## Задание 4

Изменяем элементы копии через индексы. Прямое присваивание переменной цикла value не заменяло бы элемент списка.

```python
tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
edited = numbers.copy()
for index in range(len(edited)):
    edited[index] += 1
print(*numbers)
print(*edited)
```

