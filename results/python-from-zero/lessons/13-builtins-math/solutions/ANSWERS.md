# 13. Готовые функции: abs, min, max и math: ответы

## Задание 1

6, 2 и 9.

## Задание 2

Имя max теперь связано с числом. Число нельзя вызвать как функцию, получится TypeError.

## Задание 3

Обе крайние величины можно найти встроенными функциями.

```python
a = int(input())
b = int(input())
c = int(input())
print(max(a, b, c) - min(a, b, c))
```

## Задание 4

Сторона — квадратный корень площади. Подключаем math и соблюдаем формат.

```python
import math
area = float(input())
side = math.sqrt(area)
print(f'{side:.3f}')
```

