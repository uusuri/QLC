# 33. Неверный ввод и проверка функций: ответы

## Задание 1

ЧИСЛО: int не может создать число из пустого текста.

## Задание 2

Такой подход скрывает причину и позволяет продолжить с нарушенным состоянием. Нужно обработать ожидаемый случай или исправить ошибку программы.

## Задание 3

Получаем обе строки до try, а затем преобразуем их. Только при успехе выводим сумму.

```python
first = input()
second = input()
try:
    a = int(first)
    b = int(second)
except ValueError:
    print('ОШИБКА')
else:
    print(a + b)
```

## Задание 4

Проверка [0] должна вернуть 0 и обнаруживает неверное >= 0. Эти проверки запускаются обычным Python, без режима оптимизации.

```python
def count_positive(numbers):
    count = 0
    for value in numbers:
        if value > 0:
            count += 1
    return count

assert count_positive([]) == 0
assert count_positive([-3]) == 0
assert count_positive([0]) == 0
assert count_positive([-1, 0, 2, 3]) == 2
print('ПРОВЕРЕНО')
```

