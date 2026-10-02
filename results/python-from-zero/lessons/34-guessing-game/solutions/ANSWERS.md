# 34. Мини-проект: угадай число: ответы

## Задание 1

МЕНЬШЕ: следующая догадка должна быть ниже 60.

## Задание 2

Игрок решает одну задачу. Новое число разрушает связь между подсказками и целью.

## Задание 3

Это базовая проверка равенства до добавления цикла.

```python
secret = int(input())
guess = int(input())
if guess == secret:
    print('ПОБЕДА')
else:
    print('ПРОМАХ')
```

## Задание 4

Читаем текст, проверяем команду раньше int. return прекращает игру без сообщения о поражении.

```python
def play(secret, attempt_limit):
    for attempt in range(1, attempt_limit + 1):
        text = input()
        if text == 'выход':
            print('ВЫХОД')
            return
        guess = int(text)
        if guess == secret:
            print('УГАДАНО', attempt)
            return
        if guess < secret:
            print('БОЛЬШЕ')
        else:
            print('МЕНЬШЕ')
    print('ПОПЫТКИ ЗАКОНЧИЛИСЬ')

secret = int(input())
attempt_limit = int(input())
play(secret, attempt_limit)
```

