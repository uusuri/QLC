# 16. Наибольшее значение: правильно выбираем начало: ответы

## Задание 1

Ноль не заменяется отрицательными значениями и выводится, хотя его вообще нет среди данных.

## Задание 2

Ни одного: range(0) пуст. Первое число уже прочитано до цикла.

## Задание 3

Меняем направление сравнения, начало по-прежнему берём из первого значения.

```python
n = int(input())
best = int(input())
for i in range(n - 1):
    value = int(input())
    if value < best:
        best = value
print(best)
```

## Задание 4

Храним значение и связанный с ним номер. Остальные номера идут от 2 до n.

```python
n = int(input())
best = int(input())
best_position = 1
for position in range(2, n + 1):
    value = int(input())
    if value > best:
        best = value
        best_position = position
print(best_position)
```

