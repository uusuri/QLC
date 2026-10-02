# 27. Списки: создаём и храним несколько значений: ответы

## Задание 1

[2, 4, 6]. Новый элемент добавляется в конец.

## Задание 2

Элементы int, а join ожидает строки. Сначала нужны str для каждого числа.

## Задание 3

split даёт строки, цикл преобразует каждую перед добавлением.

```python
tokens = input().split()
numbers = []
for token in tokens:
    numbers.append(int(token))
print(sum(numbers))
```

## Задание 4

Последнее число берётся индексом -1, распаковка передаёт все элементы print.

```python
n = int(input())
numbers = []
for i in range(n):
    numbers.append(int(input()))
print(numbers[-1])
print(*numbers)
```

